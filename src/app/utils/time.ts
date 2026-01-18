import { DateTime, Duration, Settings } from "luxon";

// Default timezone consistent with the JS util
Settings.defaultZone = "America/Los_Angeles";

const Time = {
  // Get current time in configured timezone
  now(): DateTime {
    return DateTime.now();
  },

  // Get start of today (00:00:00) in configured timezone
  today(): DateTime {
    return DateTime.now().startOf("day");
  },

  // Get end of today (23:59:59.999) in configured timezone
  endOfToday(): DateTime {
    return DateTime.now().endOf("day");
  },

  // Convert Luxon DateTime to native JS Date (for MongoDB)
  toJSDate(dt: DateTime): Date {
    return dt.toJSDate();
  },

  // Convert native JS Date (from Mongo) to Luxon DateTime
  fromJSDate(date: Date): DateTime {
    // Settings.defaultZone can be a Zone object; DateTime.setZone accepts a ZoneLike (string | Zone)
    // Cast to any to satisfy TypeScript while keeping runtime behavior.
    return DateTime.fromJSDate(date).setZone(Settings.defaultZone as any);
  },

  // Parse ISO string (e.g., from frontend or API)
  fromISO(isoString: string): DateTime {
    return DateTime.fromISO(isoString, { zone: Settings.defaultZone });
  },

  // Convert Luxon DateTime to ISO date string (YYYY-MM-DD)
  toISODate(dt: DateTime): string {
    // toISODate can return null in rare cases; normalize to empty string to keep return type strict
    return dt.toISODate() || "";
  },

  // Format Luxon DateTime into readable string
  format(dt: DateTime, fmt = "yyyy-MM-dd HH:mm:ss"): string {
    return dt.toFormat(fmt);
  },

  // Get difference between two dates (in days, hours, etc.)
  diff(
    dt1: DateTime,
    dt2: DateTime,
    units: Array<
      "days" | "hours" | "minutes" | "seconds" | "months" | "years"
    > = ["days"]
  ) {
    return dt1.diff(dt2, units as any);
  },

  // Add time (e.g., { days: 1 }, { weeks: 2 })
  add(
    dt: DateTime,
    durationObj: Partial<{
      years: number;
      months: number;
      weeks: number;
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    }>
  ) {
    return dt.plus(durationObj as any);
  },

  // Subtract time
  subtract(
    dt: DateTime,
    durationObj: Partial<{
      years: number;
      months: number;
      weeks: number;
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    }>
  ) {
    return dt.minus(durationObj as any);
  },

  // Check if dt1 is before dt2
  isBefore(dt1: DateTime, dt2: DateTime): boolean {
    return dt1.toMillis() < dt2.toMillis();
  },

  // Check if dt1 is after dt2
  isAfter(dt1: DateTime, dt2: DateTime): boolean {
    return dt1.toMillis() > dt2.toMillis();
  },

  // Get a range of dates (e.g., month view)
  getDateRange(
    start: DateTime,
    end: DateTime,
    unit: "days" | "month" | "week" = "days"
  ) {
    const range: DateTime[] = [];
    const startUnit = unit === "days" ? "day" : unit;
    let current = start.startOf(startUnit as any);
    const endPoint = end.startOf(startUnit as any);
    while (current <= endPoint) {
      range.push(current);
      current = current.plus({ [unit === "days" ? "days" : unit]: 1 } as any);
    }
    return range;
  },

  // Get date range from ISO strings (e.g., for filtering)
  getDateRangeFromISO(startISO: string, endISO: string) {
    const start = DateTime.fromISO(startISO, {
      zone: Settings.defaultZone,
    }).startOf("day");
    const end = DateTime.fromISO(endISO, { zone: Settings.defaultZone }).endOf(
      "day"
    );
    return { start, end };
  },

  // Validate if a date is in the correct format
  isValidDateTime(dt: DateTime | null | undefined): boolean {
    return !!dt && dt.isValid;
  },
};

export default Time;
