import { BlockStatus } from "@prisma/client";
import { z } from "zod";

export const timeBlockSchema = z
  .object({
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    capacity: z.coerce.number().int().min(1).max(100),
    status: z.nativeEnum(BlockStatus).default(BlockStatus.ACTIVE),
  })
  .refine((values) => values.endAt > values.startAt, {
    message: "End time must come after the start time.",
    path: ["endAt"],
  });

export const timeBlockCreateSchema = timeBlockSchema;

export const timeBlockUpdateSchema = timeBlockSchema
  .partial()
  .extend({
    id: z.string().min(1, "Time block id is required"),
  })
  .refine(
    (values) => {
      if (values.startAt && values.endAt) {
        return values.endAt > values.startAt;
      }
      return true;
    },
    { message: "End time must come after the start time.", path: ["endAt"] },
  );

export const timeBlockFormSchema = z
  .object({
    startAt: z.string().min(1, "Start time is required"),
    endAt: z.string().min(1, "End time is required"),
    capacity: z.coerce.number().int().min(1).max(100),
    status: z.nativeEnum(BlockStatus),
  })
  .refine((values) => new Date(values.endAt).getTime() > new Date(values.startAt).getTime(), {
    message: "End time must come after the start time.",
    path: ["endAt"],
  });

export const bookingCreateSchema = z.object({
  timeBlockId: z.string().min(1),
});

export const bookingCancelSchema = z.object({
  bookingId: z.string().min(1),
});

export type TimeBlockPayload = z.infer<typeof timeBlockSchema>;
export type TimeBlockFormValues = z.infer<typeof timeBlockFormSchema>;

export const normalizeTimeBlockFormValues = (values: TimeBlockFormValues) =>
  timeBlockSchema.parse({
    ...values,
    startAt: new Date(values.startAt),
    endAt: new Date(values.endAt),
  });
