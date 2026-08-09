export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * (currency.toLowerCase() === 'jod' ? 1000 : 100));
}

export function fromMinorUnits(minorAmount: number, currency: string): number {
  const divisor = currency.toLowerCase() === 'jod' ? 1000 : 100;
  return Number((minorAmount / divisor).toFixed(3));
}

export function normalizeAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const amount = Math.round(value);
  if (amount < 50 || amount > 500_000) return null;
  return amount;
}
