/**
 * Memuat daftar hari libur sebagai kunci "YYYY-MM-DD" untuk perhitungan SLA jam kerja.
 * Parameter client adalah prisma atau transaksi (tx).
 */
export async function loadHolidayKeys(client: any): Promise<string[]> {
  const rows: Array<{ date: Date }> = await client.holiday.findMany({ select: { date: true } });
  return rows.map((r) => r.date.toISOString().slice(0, 10));
}
