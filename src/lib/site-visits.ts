const ISTANBUL = "Europe/Istanbul";

export function istanbulStartOfDay(from = new Date()): Date {
  const date = from.toLocaleDateString("en-CA", { timeZone: ISTANBUL });
  return new Date(`${date}T00:00:00+03:00`);
}

export function istanbulDaysAgo(days: number): Date {
  const start = istanbulStartOfDay();
  start.setDate(start.getDate() - days);
  return start;
}
