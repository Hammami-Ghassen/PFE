import { buildPageWindow } from './usePersonnelPagination';

describe('buildPageWindow', () => {
  it('returns all pages when total pages is small', () => {
    expect(buildPageWindow(2, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it('returns compact window with first and last pages for large totals', () => {
    expect(buildPageWindow(5, 12)).toEqual([0, 4, 5, 6, 11]);
  });

  it('clamps window at boundaries', () => {
    expect(buildPageWindow(0, 12)).toEqual([0, 1, 11]);
    expect(buildPageWindow(11, 12)).toEqual([0, 10, 11]);
  });
});
