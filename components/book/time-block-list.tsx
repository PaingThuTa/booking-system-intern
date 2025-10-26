"use client";

import { BookingStatus } from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimeRange } from "@/lib/format";
import { BLOCK_CHANGED_EVENT, BOOKING_CREATED_EVENT, BOOKING_UPDATED_EVENT } from "@/lib/realtime-constants";
import { subscribeToBookingChannel } from "@/lib/realtime-client";

export type TimeBlockView = {
  id: string;
  startAt: string;
  endAt: string;
  capacity: number;
  confirmedCount: number;
  hasMyBooking: boolean;
};

type ApiBlock = {
  id: string;
  startAt: string;
  endAt: string;
  capacity: number;
  bookings: {
    id: string;
    userId: string;
    status: BookingStatus;
  }[];
};

type ApiBooking = {
  id: string;
  status: BookingStatus;
  timeBlockId: string;
};

interface TimeBlockListProps {
  blocks: TimeBlockView[];
  existingBookingId?: string | null;
  userId: string;
}

export function TimeBlockList({ blocks, existingBookingId, userId }: TimeBlockListProps) {
  const [state, setState] = useState(() => ({
    blocks,
    bookingId: existingBookingId ?? null,
    feedback: null as { type: "error" | "success"; message: string } | null,
  }));
  const [isPending, startTransition] = useTransition();

  const sortedBlocks = useMemo(
    () => [...state.blocks].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [state.blocks],
  );

  useEffect(() => {
    const refresh = async () => {
      const [blocksResponse, bookingsResponse] = await Promise.all([
        fetch("/api/blocks", { cache: "no-store" }),
        fetch("/api/bookings", { cache: "no-store" }),
      ]);

      if (!blocksResponse.ok || !bookingsResponse.ok) {
        return;
      }

      const [{ data: latestBlocks }, { data: latestBookings }] = await Promise.all([
        blocksResponse.json(),
        bookingsResponse.json(),
      ]);

      const activeBooking = (latestBookings as ApiBooking[]).find((booking) => booking.status === BookingStatus.CONFIRMED);

      const normalizedBlocks: TimeBlockView[] = (latestBlocks as ApiBlock[]).map((block) => {
        const confirmedBookings = (block.bookings ?? []).filter(
          (booking) => booking.status === BookingStatus.CONFIRMED,
        );
        const hasMyBooking = confirmedBookings.some((booking) => booking.userId === userId);
        return {
          id: block.id,
          startAt: block.startAt,
          endAt: block.endAt,
          capacity: block.capacity,
          confirmedCount: confirmedBookings.length,
          hasMyBooking,
        };
      });

      setState((prev) => ({
        ...prev,
        blocks: normalizedBlocks,
        bookingId: activeBooking?.id ?? null,
      }));
    };

    const unsubscribers = [
      subscribeToBookingChannel(BOOKING_CREATED_EVENT, () => {
        void refresh();
      }),
      subscribeToBookingChannel(BOOKING_UPDATED_EVENT, () => {
        void refresh();
      }),
      subscribeToBookingChannel(BLOCK_CHANGED_EVENT, () => {
        void refresh();
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    };
  }, [userId]);

  const handleBook = (timeBlockId: string) => {
    startTransition(async () => {
      setState((prev) => ({ ...prev, feedback: null }));
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ timeBlockId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: { message: "Unable to create booking." } }));
        setState((prev) => ({
          ...prev,
          feedback: { type: "error", message: body?.error?.message ?? "Unable to create booking." },
        }));
        return;
      }

      const { data } = await response.json();

      setState((prev) => ({
        blocks: prev.blocks.map((block) =>
          block.id === timeBlockId
            ? {
                ...block,
                confirmedCount: block.confirmedCount + 1,
                hasMyBooking: true,
              }
            : { ...block, hasMyBooking: false },
        ),
        bookingId: data.id as string,
        feedback: { type: "success", message: "Your session has been reserved." },
      }));
    });
  };

  const handleCancel = () => {
    if (!state.bookingId) return;

    startTransition(async () => {
      setState((prev) => ({ ...prev, feedback: null }));
      const response = await fetch("/api/bookings", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId: state.bookingId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: { message: "Unable to cancel booking." } }));
        setState((prev) => ({
          ...prev,
          feedback: { type: "error", message: body?.error?.message ?? "Unable to cancel booking." },
        }));
        return;
      }

      setState((prev) => ({
        blocks: prev.blocks.map((block) =>
          block.hasMyBooking
            ? {
                ...block,
                confirmedCount: Math.max(block.confirmedCount - 1, 0),
                hasMyBooking: false,
              }
            : block,
        ),
        bookingId: null,
        feedback: { type: "success", message: "Your booking has been canceled." },
      }));
    });
  };

  const renderAvailability = (block: TimeBlockView) => {
    const remaining = Math.max(block.capacity - block.confirmedCount, 0);
    if (block.hasMyBooking) {
      return <Badge variant="success">Reserved</Badge>;
    }
    return remaining > 0 ? (
      <Badge variant="secondary">{remaining} spot{remaining === 1 ? "" : "s"} left</Badge>
    ) : (
      <Badge variant="danger">Full</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {state.feedback ? (
        <div
          className={
            state.feedback.type === "error"
              ? "rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              : "rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
          }
        >
          {state.feedback.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {sortedBlocks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No time blocks found</CardTitle>
              <CardDescription>
                Check back soon—our team is adding more availability on a rolling basis.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          sortedBlocks.map((block) => {
            const isFull = block.capacity - block.confirmedCount <= 0;
            return (
              <Card key={block.id} className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-lg">{formatTimeRange(new Date(block.startAt), new Date(block.endAt))}</CardTitle>
                  <CardDescription>Capacity: {block.capacity}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  {renderAvailability(block)}
                  {block.hasMyBooking ? (
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      disabled={isPending}
                      className="ml-3"
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleBook(block.id)}
                      disabled={isPending || isFull || Boolean(state.bookingId)}
                      className="ml-3"
                    >
                      Reserve
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
