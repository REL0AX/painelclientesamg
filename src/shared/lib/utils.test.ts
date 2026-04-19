import { describe, expect, it } from 'vitest';
import { normalizeForSearch, parseDateFromExcel } from '@/shared/lib/utils';

describe('utils helpers', () => {
  it('collapses repeated whitespace during search normalization', () => {
    expect(normalizeForSearch('  MERCADO    ALFA   LTDA  ')).toBe('mercado alfa ltda');
  });

  it('parses brazilian dd/mm/yyyy dates without swapping day and month', () => {
    const parsed = parseDateFromExcel('25/11/2025');

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.getFullYear()).toBe(2025);
    expect(parsed?.getMonth()).toBe(10);
    expect(parsed?.getDate()).toBe(25);
  });
});
