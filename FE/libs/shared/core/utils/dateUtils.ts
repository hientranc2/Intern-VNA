export function localISODate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function yearsAgoISODate(years: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() - years);
  return localISODate(d);
}
