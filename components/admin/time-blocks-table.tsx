"use client";

import { useEffect, useMemo, useState } from "react";
import { BlockStatus, BookingStatus } from "@prisma/client";
import { Edit3, Plus, Share2, Trash2 } from "lucide-react";

import { TimeBlockForm } from "@/components/admin/time-block-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BLOCK_CHANGED_EVENT, BOOKING_CREATED_EVENT, BOOKING_UPDATED_EVENT } from "@/lib/realtime-constants";
import { subscribeToBookingChannel } from "@/lib/realtime-client";
import { formatTimeRange, minutesToDuration, toDateInputValue, toTimeInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { normalizeTimeBlockFormValues, TimeBlockFormValues } from "@/lib/zod";

export type AdminTimeBlock = {
  id: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: BlockStatus;
  bookings: {
    id: string;
    status: BookingStatus;
    user: {
      id: string;
      name: string | null;
      email: string;
      internId: string | null;
    } | null;
  }[];
};

type Feedback = { type: "success" | "error"; message: string } | null;

const statusBadgeVariant: Record<BlockStatus, "success" | "secondary"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
};

export function TimeBlocksTable({ initialBlocks }: { initialBlocks: AdminTimeBlock[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AdminTimeBlock | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [blocks],
  );

  useEffect(() => {
    const refresh = async () => {
      const response = await fetch("/api/blocks?includeInactive=true", { cache: "no-store" });
      if (!response.ok) return;
      const { data } = await response.json();
      setBlocks(data);
    };

    const unsubscribers = [
      subscribeToBookingChannel(BLOCK_CHANGED_EVENT, () => {
        void refresh();
      }),
      subscribeToBookingChannel(BOOKING_CREATED_EVENT, () => {
        void refresh();
      }),
      subscribeToBookingChannel(BOOKING_UPDATED_EVENT, () => {
        void refresh();
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    };
  }, []);

  const createBlock = async (values: TimeBlockFormValues) => {
    setIsSubmitting(true);
    setFeedback(null);
    const { timeBlock, slotCount } = normalizeTimeBlockFormValues(values);

    const response = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: timeBlock.startAt.toISOString(),
        endAt: timeBlock.endAt.toISOString(),
        durationMinutes: timeBlock.durationMinutes,
        status: timeBlock.status,
        slotCount,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: { message: "Unable to create block." } }));
      setFeedback({ type: "error", message: body?.error?.message ?? "Unable to create block." });
      setIsSubmitting(false);
      return;
    }

    const { data } = await response.json();
    type ApiBlockPayload = Omit<AdminTimeBlock, "bookings"> & {
      bookings?: AdminTimeBlock["bookings"];
    };
    const rawBlocks: ApiBlockPayload[] = Array.isArray(data) ? data : [data];
    const createdBlocks: AdminTimeBlock[] = rawBlocks.map((block) => ({
      ...block,
      bookings: block.bookings ?? [],
    }));

    setBlocks((prev) => [...prev, ...createdBlocks]);
    setFeedback({
      type: "success",
      message:
        (slotCount ?? 1) > 1
          ? `Created ${(slotCount ?? 1)} time blocks.`
          : "Time block created.",
    });
    setCreateOpen(false);
    setIsSubmitting(false);
  };

  const updateBlock = async (blockId: string, values: TimeBlockFormValues) => {
    setIsSubmitting(true);
    setFeedback(null);
    const { timeBlock } = normalizeTimeBlockFormValues(values);

    const response = await fetch("/api/blocks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: blockId,
        startAt: timeBlock.startAt.toISOString(),
        endAt: timeBlock.endAt.toISOString(),
        durationMinutes: timeBlock.durationMinutes,
        status: timeBlock.status,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: { message: "Unable to update block." } }));
      setFeedback({ type: "error", message: body?.error?.message ?? "Unable to update block." });
      setIsSubmitting(false);
      return;
    }

    const { data } = await response.json();
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...data,
            }
          : block,
      ),
    );
    setFeedback({ type: "success", message: "Time block updated." });
    setEditingBlock(null);
    setIsSubmitting(false);
  };

  const copyShareLink = async (block: AdminTimeBlock) => {
    try {
      const url = `${window.location.origin}/book?blockId=${block.id}`;
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setFeedback({ type: "success", message: "Time block link copied to clipboard." });
        return;
      }
      const manualCopy = window.prompt("Copy this link", url);
      if (manualCopy !== null) {
        setFeedback({ type: "success", message: "Time block link ready to share." });
      } else {
        throw new Error("Clipboard API unavailable and manual copy canceled");
      }
    } catch (error) {
      console.error("Failed to copy link", error);
      setFeedback({
        type: "error",
        message: "Unable to copy link. Try again or copy manually.",
      });
    }
  };

  const deleteBlocks = async (blockIds: string[]) => {
    if (blockIds.length === 0) {
      return;
    }

    const confirmMessage =
      blockIds.length === 1
        ? "Delete this time block? Existing bookings will also be removed."
        : `Delete ${blockIds.length} time blocks? Existing bookings for these blocks will also be removed.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    for (const blockId of blockIds) {
      const response = await fetch(`/api/blocks?id=${blockId}`, { method: "DELETE" });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: { message: "Unable to delete block." } }));
        setFeedback({ type: "error", message: body?.error?.message ?? "Unable to delete block." });
        setIsSubmitting(false);
        return;
      }
    }

    setBlocks((prev) => prev.filter((block) => !blockIds.includes(block.id)));
    setSelectedBlockIds((prev) => prev.filter((id) => !blockIds.includes(id)));
    setFeedback({
      type: "success",
      message: blockIds.length === 1 ? "Time block deleted." : `Deleted ${blockIds.length} time blocks.`,
    });
    setIsSubmitting(false);
  };

  const toggleBlockSelection = (blockId: string, checked: boolean) => {
    setSelectedBlockIds((prev) => {
      if (checked) {
        if (prev.includes(blockId)) {
          return prev;
        }
        return [...prev, blockId];
      }
      return prev.filter((id) => id !== blockId);
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedBlockIds(checked ? sortedBlocks.map((block) => block.id) : []);
  };

  const allSelected = selectedBlockIds.length > 0 && selectedBlockIds.length === sortedBlocks.length;
  const someSelected = selectedBlockIds.length > 0 && !allSelected;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl">Time blocks</CardTitle>
          <CardDescription>Maintain the interview calendar interns use to reserve their sessions.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteBlocks(selectedBlockIds)}
            disabled={selectedBlockIds.length === 0 || isSubmitting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete selected
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New block
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create time block</DialogTitle>
                <DialogDescription>Define a new window of availability for intern sessions.</DialogDescription>
              </DialogHeader>
              <TimeBlockForm submitLabel="Create" isPending={isSubmitting} onSubmit={createBlock} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback ? (
          <div
            className={cn(
              "rounded-md border px-4 py-3 text-sm",
              feedback.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : "border-destructive/20 bg-destructive/10 text-destructive",
            )}
          >
            {feedback.message}
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all time blocks"
                  checked={allSelected}
                  ref={(checkbox) => {
                    if (checkbox) checkbox.indeterminate = someSelected;
                  }}
                  onChange={(event) => toggleAll(event.currentTarget.checked)}
                  disabled={sortedBlocks.length === 0}
                  className="h-4 w-4 cursor-pointer"
                />
              </TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reserved by</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBlocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No time blocks yet. Create your first block to open sign-ups for interns.
                </TableCell>
              </TableRow>
            ) : (
              sortedBlocks.map((block) => {
                const confirmedBooking = block.bookings.find((booking) => booking.status === BookingStatus.CONFIRMED);
                return (
                  <TableRow key={block.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select time block starting ${formatTimeRange(new Date(block.startAt), new Date(block.endAt))}`}
                        checked={selectedBlockIds.includes(block.id)}
                        onChange={(event) => toggleBlockSelection(block.id, event.currentTarget.checked)}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatTimeRange(new Date(block.startAt), new Date(block.endAt))}
                    </TableCell>
                    <TableCell>{minutesToDuration(block.durationMinutes)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[block.status]}>{block.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {confirmedBooking?.user ? (
                        <div>
                          <div className="font-medium">
                            {confirmedBooking.user.name ?? confirmedBooking.user.email}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {confirmedBooking.user.internId ?? confirmedBooking.user.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Open</span>
                      )}
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyShareLink(block)}
                        aria-label="Copy shareable link"
                        disabled={block.status !== BlockStatus.ACTIVE}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingBlock(block)}
                        aria-label="Edit block"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteBlocks([block.id])}
                        aria-label="Delete block"
                        className="text-destructive"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={Boolean(editingBlock)} onOpenChange={(open) => setEditingBlock(open ? editingBlock : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit time block</DialogTitle>
            <DialogDescription>Adjust the timing, duration, or visibility of this block.</DialogDescription>
          </DialogHeader>
          {editingBlock ? (
            <TimeBlockForm
              submitLabel="Save changes"
              isPending={isSubmitting}
              allowMultiple={false}
              defaultValues={{
                date: toDateInputValue(new Date(editingBlock.startAt)),
                startTime: toTimeInputValue(new Date(editingBlock.startAt)),
                durationMinutes: editingBlock.durationMinutes,
                slotCount: 1,
                status: editingBlock.status,
              }}
              onSubmit={(values) => updateBlock(editingBlock.id, values)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
