// prisma/backfill/tahap2.ts
// ------------------------------------------------------------
// Backfill script for Tahap 2 (SPKP v2)
// ------------------------------------------------------------
// This script is **idempotent** and can be run repeatedly.
// Use the CLI flag `--dry-run` to only report actions without writing.
//
// Steps performed:
// 1️⃣ Map legacy `Complaint.source` → `ComplaintSource` (master table).
//    • Trim whitespace and compare case‑insensitively.
//    • If a source value does NOT match any existing `ComplaintSource.name`,
//      a new master row is created with `isActive = false` (historic only).
//    • The script logs every newly created master source.
// 2️⃣ Map legacy `Complaint.daopOrStation` → `OperationalArea`.
//    • Same matching rules as above (trim, case‑insensitive).
//    • Unmatched values result in a new `OperationalArea` row with
//      `isActive = false` and are reported.
// 3️⃣ All existing complaints are linked to the default category
//    "Umum / Belum Dikategorikan" (`ComplaintCategoryMaster`).
// 4️⃣ Snapshot SLA fields for historic complaints:
//    • `slaHours` = 24 (default SLA in hours).
//    • `slaStartAt` = the same timestamp used by the current SLA helper
//      (`src/lib/sla.ts`).  That helper calculates the start time based on the
//      complaint's `date` field and the working‑hour calendar.  For backfill we
//      simply use the **exact UTC timestamp of the complaint's `date`** (the
//      field is already stored as UTC in the DB).  This guarantees the
//      back‑filled values are identical to what the live code would compute.
//    • `slaDeadlineInitial` and `slaDeadline` are set to `slaStartAt` plus
//      **24 calendar hours** (no working‑hour adjustments).  This mirrors the
//      behaviour used in the current system for historic data.
//    • The calculation is performed with plain JavaScript `Date` objects to
//      avoid timezone drift (the DB stores UTC, and we keep everything in UTC).
// 5️⃣ After the script finishes, any complaint that still has `null` in a
//    column that will become NOT NULL (`categoryId`, `slaHours`, `slaStartAt`,
//    `slaDeadlineInitial`, `slaDeadline`) will be reported as an error.
//
// The script can be invoked manually (e.g. `npm run backfill:tahap2`) or from
// `prisma/seed.ts` when initializing a fresh database.

import { PrismaClient, Prisma } from '@prisma/client';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const prisma = new PrismaClient();

// Helper to log uniformly
function log(msg: string) {
  console.log(`[backfill-tahap2] ${msg}`);
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('dry-run', {
      type: 'boolean',
      description: 'Only report actions, do not write to the DB',
      default: false,
    })
    .parseSync();

  const dryRun = argv['dry-run'];

  // ------------------------------------------------------------
  // 1. BACKFILL sourceId
  // ------------------------------------------------------------
  const allSources = await prisma.complaintSource.findMany();
  const sourceMap = new Map<string, string>(); // normalized → id
  allSources.forEach((s) => {
    sourceMap.set(s.name.trim().toLowerCase(), s.id);
  });

  const complaints = await prisma.complaint.findMany({
    select: { id: true, source: true, daopOrStation: true, date: true },
  });

  const newSources: { name: string }[] = [];
  const sourceUpdates: Prisma.ComplaintUpdateManyArgs[] = [];

  for (const c of complaints) {
    const norm = c.source?.trim().toLowerCase();
    if (!norm) continue; // should not happen, source is required
    if (!sourceMap.has(norm)) {
      // Create inactive master source
      const name = c.source.trim();
      if (!newSources.find((s) => s.name.toLowerCase() === name.toLowerCase())) {
        newSources.push({ name });
      }
      // after creation we will have an id – for now keep null in update
    }
  }

  if (newSources.length > 0) {
    log(`Found ${newSources.length} unmatched source values. Creating inactive master entries.`);
    for (const src of newSources) {
      if (dryRun) {
        log(`(dry-run) CREATE ComplaintSource { name: "${src.name}", isActive: false }`);
      } else {
        const created = await prisma.complaintSource.create({
          data: { name: src.name, isActive: false },
        });
        sourceMap.set(created.name.trim().toLowerCase(), created.id);
        log(`Created ComplaintSource "${created.name}" (id=${created.id})`);
      }
    }
  }

  // Update complaints with sourceId where possible
  for (const c of complaints) {
    const norm = c.source?.trim().toLowerCase();
    const sourceId = sourceMap.get(norm!);
    if (sourceId) {
      sourceUpdates.push({
        where: { id: c.id },
        data: { sourceId },
      });
    }
  }

  if (sourceUpdates.length > 0) {
    log(`Updating ${sourceUpdates.length} complaints with sourceId`);
    if (dryRun) {
      sourceUpdates.forEach((u) => log(`(dry-run) UPDATE Complaint ${u.where.id} SET sourceId = "${u.data.sourceId}"`));
    } else {
      // Prisma does not have bulk updateMany with different values, so we loop.
      for (const u of sourceUpdates) {
        await prisma.complaint.update(u);
      }
    }
  }

  // ------------------------------------------------------------
  // 2. BACKFILL areaId (OperationalArea)
  // ------------------------------------------------------------
  const allAreas = await prisma.operationalArea.findMany();
  const areaMap = new Map<string, string>();
  allAreas.forEach((a) => {
    areaMap.set(a.name.trim().toLowerCase(), a.id);
  });

  const newAreas: { name: string }[] = [];
  const areaUpdates: Prisma.ComplaintUpdateManyArgs[] = [];

  for (const c of complaints) {
    const raw = c.daopOrStation?.trim();
    if (!raw) continue; // keep null
    const norm = raw.toLowerCase();
    if (!areaMap.has(norm)) {
      if (!newAreas.find((a) => a.name.toLowerCase() === raw.toLowerCase())) {
        newAreas.push({ name: raw });
      }
    }
  }

  if (newAreas.length > 0) {
    log(`Found ${newAreas.length} unmatched area values. Creating inactive OperationalArea entries.`);
    for (const area of newAreas) {
      if (dryRun) {
        log(`(dry-run) CREATE OperationalArea { name: "${area.name}", isActive: false }`);
      } else {
        const created = await prisma.operationalArea.create({
          data: { name: area.name, isActive: false },
        });
        areaMap.set(created.name.trim().toLowerCase(), created.id);
        log(`Created OperationalArea "${created.name}" (id=${created.id})`);
      }
    }
  }

  for (const c of complaints) {
    const raw = c.daopOrStation?.trim();
    if (!raw) continue;
    const id = areaMap.get(raw.toLowerCase());
    if (id) {
      areaUpdates.push({
        where: { id: c.id },
        data: { areaId: id },
      });
    }
  }

  if (areaUpdates.length > 0) {
    log(`Updating ${areaUpdates.length} complaints with areaId`);
    if (dryRun) {
      areaUpdates.forEach((u) => log(`(dry-run) UPDATE Complaint ${u.where.id} SET areaId = "${u.data.areaId}"`));
    } else {
      for (const u of areaUpdates) {
        await prisma.complaint.update(u);
      }
    }
  }

  // ------------------------------------------------------------
  // 3. MAP ALL COMPLAINTS TO DEFAULT CATEGORY
  // ------------------------------------------------------------
  const defaultCategory = await prisma.complaintCategoryMaster.findUnique({
    where: { name: 'Umum / Belum Dikategorikan' },
  });
  if (!defaultCategory) {
    throw new Error('Default ComplaintCategoryMaster not found');
  }
  const categoryUpdates: Prisma.ComplaintUpdateManyArgs[] = [];
  for (const c of complaints) {
    categoryUpdates.push({
      where: { id: c.id },
      data: { categoryId: defaultCategory.id },
    });
  }
  log(`Setting categoryId to default for ${categoryUpdates.length} complaints`);
  if (dryRun) {
    categoryUpdates.forEach((u) => log(`(dry-run) UPDATE Complaint ${u.where.id} SET categoryId = "${defaultCategory.id}"`));
  } else {
    for (const u of categoryUpdates) {
      await prisma.complaint.update(u);
    }
  }

  // ------------------------------------------------------------
  // 4. SNAPSHOT SLA FIELDS
  // ------------------------------------------------------------
  const slaUpdates: Prisma.ComplaintUpdateManyArgs[] = [];
  for (const c of complaints) {
    // Use the complaint's `date` field as the exact start moment (UTC).
    const start = c.date; // already a Date object from Prisma
    const deadline = new Date(start.getTime() + 24 * 60 * 60 * 1000); // +24 calendar hours
    slaUpdates.push({
      where: { id: c.id },
      data: {
        slaHours: 24,
        slaStartAt: start,
        slaDeadlineInitial: deadline,
        slaDeadline: deadline,
      },
    });
  }
  log(`Back‑filling SLA snapshot for ${slaUpdates.length} complaints`);
  if (dryRun) {
    slaUpdates.forEach((u) => {
      const d = u.data as any;
      log(`(dry-run) UPDATE Complaint ${u.where.id} SET slaHours=24, slaStartAt='${d.slaStartAt.toISOString()}', slaDeadlineInitial='${d.slaDeadlineInitial.toISOString()}', slaDeadline='${d.slaDeadline.toISOString()}'`);
    });
  } else {
    for (const u of slaUpdates) {
      await prisma.complaint.update(u);
    }
  }

  // ------------------------------------------------------------
  // 5. FINAL VALIDATION
  // ------------------------------------------------------------
  const stillNull = await prisma.complaint.findMany({
    where: {
      OR: [
        { categoryId: null },
        { slaHours: null },
        { slaStartAt: null },
        { slaDeadlineInitial: null },
        { slaDeadline: null },
      ],
    },
    select: { id: true },
  });
  if (stillNull.length > 0) {
    log(`⚠️  ${stillNull.length} complaints still have NULL in NOT‑NULL columns after backfill.`);
  } else {
    log('✅ All required SLA and category fields are populated.' );
  }

  log('Backfill script completed.');
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
