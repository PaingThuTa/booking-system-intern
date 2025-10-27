"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BlockStatus } from "@prisma/client";
import { useForm, useWatch, type Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeBlockFormValues, timeBlockFormSchema } from "@/lib/zod";

interface TimeBlockFormProps {
  defaultValues?: Partial<TimeBlockFormValues>;
  submitLabel: string;
  isPending?: boolean;
  allowMultiple?: boolean;
  onSubmit: (values: TimeBlockFormValues) => Promise<void> | void;
}

export function TimeBlockForm({
  defaultValues,
  submitLabel,
  isPending,
  allowMultiple = true,
  onSubmit,
}: TimeBlockFormProps) {
  const form = useForm<TimeBlockFormValues>({
    resolver: zodResolver(timeBlockFormSchema) as Resolver<TimeBlockFormValues>,
    defaultValues: {
      date: defaultValues?.date ?? "",
      startTime: defaultValues?.startTime ?? "",
      durationMinutes: defaultValues?.durationMinutes ?? 20,
      slotCount: defaultValues?.slotCount ?? 1,
      status: defaultValues?.status ?? BlockStatus.ACTIVE,
    },
  });

  const status =
    useWatch({
      control: form.control,
      name: "status",
    }) ?? BlockStatus.ACTIVE;
  const slotCount = form.watch("slotCount") ?? 1;
  const durationMinutes = form.watch("durationMinutes") ?? 0;

  const submitHandler = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset(values);
  });

  return (
    <form onSubmit={submitHandler} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" {...form.register("date")} />
        {form.formState.errors.date ? (
          <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="startTime">Start time</Label>
        <Input id="startTime" type="time" {...form.register("startTime")} />
        {form.formState.errors.startTime ? (
          <p className="text-xs text-destructive">{form.formState.errors.startTime.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="durationMinutes">Duration (minutes)</Label>
        <Input
          id="durationMinutes"
          type="number"
          min={5}
          max={240}
          step={5}
          {...form.register("durationMinutes", { valueAsNumber: true })}
        />
        {form.formState.errors.durationMinutes ? (
          <p className="text-xs text-destructive">{form.formState.errors.durationMinutes.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slotCount">Number of slots</Label>
        <Input
          id="slotCount"
          type="number"
          min={1}
          max={24}
          step={1}
          readOnly={!allowMultiple}
          {...form.register("slotCount", { valueAsNumber: true })}
        />
        {allowMultiple ? (
          <p className="text-xs text-muted-foreground">
            We&apos;ll generate {slotCount} consecutive {durationMinutes} minute slot
            {slotCount === 1 ? "" : "s"} starting at the selected time.
          </p>
        ) : null}
        {form.formState.errors.slotCount ? (
          <p className="text-xs text-destructive">{form.formState.errors.slotCount.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={(value: BlockStatus) => form.setValue("status", value, { shouldValidate: true })}>
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BlockStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={BlockStatus.INACTIVE}>Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
