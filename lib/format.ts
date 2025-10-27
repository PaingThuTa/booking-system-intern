const DISPLAY_LOCALE = process.env.NEXT_PUBLIC_DISPLAY_LOCALE ?? "en-GB";
const DISPLAY_TIME_ZONE = process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE ?? "UTC";

const rangeStartFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DISPLAY_TIME_ZONE,
});

const rangeEndFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DISPLAY_TIME_ZONE,
});

export const formatTimeRange = (start: Date, end: Date) => {
  const startStr = rangeStartFormatter.format(start);
  const endStr = rangeEndFormatter.format(end);
  return `${startStr} — ${endStr}`;
};

const fullDateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DISPLAY_TIME_ZONE,
});

export const formatFullDate = (date: Date) => fullDateFormatter.format(date);

export const toDateTimeInputValue = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const toDateInputValue = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

export const toTimeInputValue = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${hours}:${minutes}`;
};

export const minutesToDuration = (minutes: number) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 === 0 ? "" : ` ${minutes % 60}m`}`
    : `${minutes}m`;
