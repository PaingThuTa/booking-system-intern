import { BlockStatus } from "@prisma/client";
import { z } from "zod";

const DISPLAY_TIME_ZONE = process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE ?? "UTC";

const getTimeZoneOffsetMinutes = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const partValues = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));

  const utcEquivalent = Date.UTC(
    Number.parseInt(partValues.year ?? "0", 10),
    Number.parseInt(partValues.month ?? "1", 10) - 1,
    Number.parseInt(partValues.day ?? "1", 10),
    Number.parseInt(partValues.hour ?? "0", 10),
    Number.parseInt(partValues.minute ?? "0", 10),
    Number.parseInt(partValues.second ?? "0", 10),
  );

  return (utcEquivalent - date.getTime()) / 60_000;
};

const parseDateTimeInDisplayTimeZone = (date: string, time: string) => {
  const [year, month, day] = date.split("-").map((value) => Number.parseInt(value, 10));
  const [hour, minute] = time.split(":").map((value) => Number.parseInt(value, 10));

  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) {
    return null;
  }

  const baseUtcMillis = Date.UTC(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0);
  if (!Number.isFinite(baseUtcMillis)) {
    return null;
  }

  if (!DISPLAY_TIME_ZONE) {
    return new Date(baseUtcMillis);
  }

  try {
    const baseDate = new Date(baseUtcMillis);
    let offsetMinutes = getTimeZoneOffsetMinutes(baseDate, DISPLAY_TIME_ZONE);
    let utcMillis = baseUtcMillis - offsetMinutes * 60_000;

    const adjustedOffset = getTimeZoneOffsetMinutes(new Date(utcMillis), DISPLAY_TIME_ZONE);
    if (adjustedOffset !== offsetMinutes) {
      offsetMinutes = adjustedOffset;
      utcMillis = baseUtcMillis - offsetMinutes * 60_000;
    }

    return new Date(utcMillis);
  } catch {
    return new Date(baseUtcMillis);
  }
};

const timeBlockBaseShape = {
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(5).max(240),
  status: z.nativeEnum(BlockStatus).default(BlockStatus.ACTIVE),
} as const;

const withTimeBlockRefinements = <T extends z.ZodType<{ startAt: Date; endAt: Date; durationMinutes: number } & Record<string, unknown>>>(
  schema: T,
) =>
  schema
    .refine((values) => values.endAt > values.startAt, {
      message: "End time must come after the start time.",
      path: ["endAt"],
    })
    .refine((values) => {
      const diffMinutes = Math.round((values.endAt.getTime() - values.startAt.getTime()) / 60000);
      return diffMinutes === values.durationMinutes;
    }, {
      message: "Duration must match the gap between start and end times.",
      path: ["durationMinutes"],
    });

export const timeBlockSchema = withTimeBlockRefinements(z.object(timeBlockBaseShape));

export const timeBlockCreateSchema = withTimeBlockRefinements(
  z.object({
    ...timeBlockBaseShape,
    slotCount: z.coerce.number().int().min(1).max(24).default(1),
  }),
);

export const timeBlockUpdateSchema = z
  .object({
    id: z.string().min(1, "Time block id is required"),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    durationMinutes: z.coerce.number().int().min(5).max(240).optional(),
    status: z.nativeEnum(BlockStatus).optional(),
  })
  .refine(
    (values) => {
      if (values.startAt && values.endAt) {
        return values.endAt > values.startAt;
      }
      return true;
    },
    { message: "End time must come after the start time.", path: ["endAt"] },
  )
  .refine(
    (values) => {
      if (values.startAt && values.endAt && values.durationMinutes !== undefined) {
        const diffMinutes = Math.round((values.endAt.getTime() - values.startAt.getTime()) / 60000);
        return diffMinutes === values.durationMinutes;
      }
      return true;
    },
    {
      message: "Duration must match the gap between start and end times.",
      path: ["durationMinutes"],
    },
  );

export const timeBlockFormSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    startTime: z.string().min(1, "Start time is required"),
    durationMinutes: z.coerce.number().int().min(5).max(240),
    slotCount: z.coerce.number().int().min(1).max(24).default(1),
    status: z.nativeEnum(BlockStatus),
  })
  .refine((values) => {
    const start = parseDateTimeInDisplayTimeZone(values.date, values.startTime);
    if (!start) {
      return false;
    }
    const end = new Date(start.getTime() + values.durationMinutes * 60_000);
    return end.getTime() > start.getTime();
  }, {
    message: "Duration must create a valid time window.",
    path: ["durationMinutes"],
  });

export const bookingCreateSchema = z.object({
  timeBlockId: z.string().min(1),
});

export const bookingCancelSchema = z.object({
  bookingId: z.string().min(1),
});

export type TimeBlockPayload = z.infer<typeof timeBlockSchema>;
export type TimeBlockFormValues = z.infer<typeof timeBlockFormSchema>;

export const normalizeTimeBlockFormValues = (values: TimeBlockFormValues) => {
  const startAt = parseDateTimeInDisplayTimeZone(values.date, values.startTime);
  if (!startAt) {
    throw new Error("Invalid date or time provided for the time block.");
  }
  const endAt = new Date(startAt.getTime() + values.durationMinutes * 60_000);

  const timeBlock = timeBlockSchema.parse({
    startAt,
    endAt,
    durationMinutes: values.durationMinutes,
    status: values.status,
  });

  return {
    timeBlock,
    slotCount: values.slotCount ?? 1,
  };
};
