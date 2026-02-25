const splitByCaseAndSeparator = (value: string) =>
  value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const formatLabel = (value: string) => {
  const normalized = splitByCaseAndSeparator(value);
  if (!normalized) return '';
  return normalized
    .split(' ')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
};
