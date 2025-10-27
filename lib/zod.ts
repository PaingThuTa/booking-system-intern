import { BlockStatus } from "@prisma/client";
import { z } from "zod";

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
    const start = new Date(`${values.date}T${values.startTime}`);
    if (Number.isNaN(start.getTime())) {
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
  const startAt = new Date(`${values.date}T${values.startTime}`);
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
