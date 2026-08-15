/** ER convention: money is integer satang; the UI shows whole baht. */
export function satangToBaht(satang: number): number {
  return Math.round(satang / 100);
}
