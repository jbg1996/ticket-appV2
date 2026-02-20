import { describe, expect, it } from 'vitest';
import { buildTimeGrid } from '../src/services/dashboardService.js';

describe('buildTimeGrid', () => {
  it('returns all day buckets in range', () => {
    const result = buildTimeGrid(new Date('2026-02-01T10:00:00.000Z'), new Date('2026-02-03T20:00:00.000Z'), 'day');

    expect(result).toEqual(['2026-02-01', '2026-02-02', '2026-02-03']);
  });

  it('returns all week buckets as monday dates in range', () => {
    const result = buildTimeGrid(new Date('2026-02-03T10:00:00.000Z'), new Date('2026-02-20T20:00:00.000Z'), 'week');

    expect(result).toEqual(['2026-02-02', '2026-02-09', '2026-02-16']);
  });
});
