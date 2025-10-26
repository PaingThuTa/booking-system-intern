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
  onSubmit: (values: TimeBlockFormValues) => Promise<void> | void;
}

export function TimeBlockForm({ defaultValues, submitLabel, isPending, onSubmit }: TimeBlockFormProps) {
  const form = useForm<TimeBlockFormValues>({
    resolver: zodResolver(timeBlockFormSchema) as Resolver<TimeBlockFormValues>,
    defaultValues: {
      startAt: defaultValues?.startAt ?? "",
      endAt: defaultValues?.endAt ?? "",
      capacity: defaultValues?.capacity ?? 1,
      status: defaultValues?.status ?? BlockStatus.ACTIVE,
    },
  });

  const status =
    useWatch({
      control: form.control,
      name: "status",
    }) ?? BlockStatus.ACTIVE;

  const submitHandler = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset(values);
  });

  return (
    <form onSubmit={submitHandler} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="startAt">Start</Label>
        <Input
          id="startAt"
          type="datetime-local"
          {...form.register("startAt")}
        />
        {form.formState.errors.startAt ? (
          <p className="text-xs text-destructive">{form.formState.errors.startAt.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="endAt">End</Label>
        <Input id="endAt" type="datetime-local" {...form.register("endAt")} />
        {form.formState.errors.endAt ? (
          <p className="text-xs text-destructive">{form.formState.errors.endAt.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="capacity">Capacity</Label>
        <Input id="capacity" type="number" min={1} max={100} {...form.register("capacity", { valueAsNumber: true })} />
        {form.formState.errors.capacity ? (
          <p className="text-xs text-destructive">{form.formState.errors.capacity.message}</p>
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
