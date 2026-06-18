import {
  calculateBusinessDays,
  calculateCalendarDays,
  formatDateForInput,
  isCalendarLimitMotif,
  isLeaveAttachmentRequired,
  isPastInputDate,
  parseInputDateAsLocalDay,
} from './leaveRequestRules';

describe('isLeaveAttachmentRequired', () => {
  it('requires attachments for motifs configured by backend metadata', () => {
    expect(isLeaveAttachmentRequired({ requiresAttachment: true }, '02', 1)).toBe(true);
  });

  it('requires attachments for paternity requests longer than seven days', () => {
    expect(isLeaveAttachmentRequired({ requiresAttachment: false }, '12', 8)).toBe(true);
  });

  it('keeps seven-day paternity requests attachment-optional', () => {
    expect(isLeaveAttachmentRequired({ requiresAttachment: false }, '12', 7)).toBe(false);
  });
});

describe('leave date rules', () => {
  it('parses input dates as local calendar days', () => {
    const parsed = parseInputDateAsLocalDay('2026-07-14');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(14);
  });

  it('formats dates for native date inputs', () => {
    expect(formatDateForInput(new Date(2026, 6, 4))).toBe('2026-07-04');
  });

  it('calculates business days excluding weekends and holidays', () => {
    const holidays = new Set(['14/07']);

    expect(calculateBusinessDays('2026-07-13', '2026-07-17', holidays)).toBe(4);
    expect(calculateBusinessDays('2026-07-18', '2026-07-19', holidays)).toBe(0);
  });

  it('calculates calendar days inclusively', () => {
    expect(calculateCalendarDays('2026-07-18', '2026-07-19')).toBe(2);
  });

  it('rejects dates before the supplied current day', () => {
    expect(isPastInputDate('2026-07-13', '2026-07-14')).toBe(true);
    expect(isPastInputDate('2026-07-14', '2026-07-14')).toBe(false);
  });

  it('uses calendar limits for maternity, postnatal, and unpaid leave motifs', () => {
    expect(isCalendarLimitMotif('04')).toBe(true);
    expect(isCalendarLimitMotif('05')).toBe(true);
    expect(isCalendarLimitMotif('50')).toBe(true);
    expect(isCalendarLimitMotif('01')).toBe(false);
  });
});
