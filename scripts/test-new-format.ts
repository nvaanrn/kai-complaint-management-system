import { prisma } from '../src/lib/prisma';
import { generateDocumentNumber } from '../src/app/actions/complaints';

async function main() {
  // Reset counter to 1 to simulate current state
  await prisma.documentCounter.upsert({
    where: { year_month: { year: 2026, month: 10 } },
    create: { year: 2026, month: 10, lastSequence: 1 },
    update: { lastSequence: 1 },
  });

  const docNum1 = await generateDocumentNumber(prisma, new Date('2026-10-29'));
  console.log('Doc Num 1:', docNum1);

  const docNum2 = await generateDocumentNumber(prisma, new Date('2026-10-29'));
  console.log('Doc Num 2:', docNum2);
}

main().catch(console.error).finally(() => prisma.$disconnect());

