export function parseId(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function parseOptionalId(value: string | number | null | undefined): number | undefined {
  if (value === null || typeof value === 'undefined' || value === '') {
    return undefined;
  }
  return parseId(value) ?? undefined;
}
