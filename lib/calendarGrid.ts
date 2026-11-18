// Pure helper for rendering a month grid, Monday-first. Returns weeks of 7
// cells (null = padding day from an adjacent month).

export interface MonthCell {
  day: number;
  iso: string; // YYYY-MM-DD
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function getMonthGrid(year: number, monthIndex: number): (MonthCell | null)[][] {
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (MonthCell | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      iso: `${year}-${pad(monthIndex + 1)}-${pad(i + 1)}`,
    })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (MonthCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
