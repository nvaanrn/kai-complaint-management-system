/**
 * Helper to compute SLA snapshot fields for complaints (Stage 2).
 * In Stage 2 we only store a simple calendar‑hour SLA.
 *
 * Returns an object containing:
 *  - slaHours: number (fixed to 24 for now)
 *  - slaStartAt: Date – the moment the complaint is recorded.
 *  - slaDeadlineInitial: Date – start + slaHours (calendar hours).
 *  - slaDeadline: Date – identical to slaDeadlineInitial for Stage 2.
 */
export function computeSlaSnapshot(start: Date, slaHours: number = 24) {
  const slaStartAt = new Date(start);
  const ms = slaHours * 60 * 60 * 1000;
  const slaDeadlineInitial = new Date(slaStartAt.getTime() + ms);
  const slaDeadline = new Date(slaDeadlineInitial); // No business‑hour adjustment yet.
  return {
    slaHours,
    slaStartAt,
    slaDeadlineInitial,
    slaDeadline,
  };
}
