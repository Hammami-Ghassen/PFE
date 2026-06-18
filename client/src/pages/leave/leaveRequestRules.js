const CALENDAR_LIMIT_CODES = new Set(['04', '05', '50']);

export const normalizeHolidayDayMonth = (value) => {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^\d{2}\/\d{2}$/.test(normalized) ? normalized : null;
};

export const parseInputDateAsLocalDay = (value) => {
  if (!value || typeof value !== 'string') return null;

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

export const formatDateForInput = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayInputValue = () => formatDateForInput(new Date());

export const isPastInputDate = (value, todayValue = getTodayInputValue()) => (
  Boolean(value && todayValue && value < todayValue)
);

export const toDayMonth = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

export const calculateBusinessDays = (startDate, endDate, holidaysSet = new Set()) => {
  const start = parseInputDateAsLocalDay(startDate);
  const end = parseInputDateAsLocalDay(endDate);
  if (!start || !end || start > end) return 0;

  let days = 0;
  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaysSet.has(toDayMonth(current));
    if (!isWeekend && !isHoliday) {
      days += 1;
    }
  }

  return days;
};

export const calculateCalendarDays = (startDate, endDate) => {
  const start = parseInputDateAsLocalDay(startDate);
  const end = parseInputDateAsLocalDay(endDate);
  if (!start || !end || start > end) return 0;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1;
};

export const isCalendarLimitMotif = (codeM) => CALENDAR_LIMIT_CODES.has(codeM);

export const isLeaveAttachmentRequired = (motif, codeM, requestedBusinessDays) => (
  Boolean(motif?.requiresAttachment) || (codeM === '12' && requestedBusinessDays > 7)
);
