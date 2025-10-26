"use client";

import { useEffect, useState, useTransition } from "react";
import { BookingStatus } from "@prisma/client";
import { Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFullDate, formatTimeRange } from "@/lib/format";
import { BOOKING_CREATED_EVENT, BOOKING_UPDATED_EVENT } from "@/lib/realtime-constants";
import { subscribeToBookingChannel } from "@/lib/realtime-client";

export type AdminBooking = {
  id: string;
  status: BookingStatus;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  timeBlock: {
    id: string;
    startAt: string;
    endAt: string;
  };
};

const statusStyles: Record<BookingStatus, { label: string; variant: "success" | "danger" | "secondary" }> = {
  CONFIRMED: { label: "Confirmed", variant: "success" },
  CANCELED: { label: "Canceled", variant: "secondary" },
};

export function AdminBookingsTable({ initialBookings }: { initialBookings: AdminBooking[] }) {
  const [state, setState] = useState(() => ({
    bookings: initialBookings,
    feedback: null as { type: "error" | "success"; message: string } | null,
  }));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const refresh = async () => {
      const response = await fetch("/api/bookings", { cache: "no-store" });
      if (!response.ok) return;
      const { data } = await response.json();
      setState((prev) => ({ ...prev, bookings: data }));
    };

    const unsubCreated = subscribeToBookingChannel(BOOKING_CREATED_EVENT, () => {
      void refresh();
    });
    const unsubUpdated = subscribeToBookingChannel(BOOKING_UPDATED_EVENT, () => {
      void refresh();
    });

    return () => {
      unsubCreated?.();
      unsubUpdated?.();
    };
  }, []);

  const handleCancel = (bookingId: string) => {
    startTransition(async () => {
      setState((prev) => ({ ...prev, feedback: null }));
      const response = await fetch("/api/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
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
        bookings: prev.bookings.map((booking) =>
          booking.id === bookingId ? { ...booking, status: BookingStatus.CANCELED } : booking,
        ),
        feedback: { type: "success", message: "Booking canceled." },
      }));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Bookings overview</CardTitle>
        <CardDescription>Monitor sign-ups and step in if you need to release seats for other interns.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.feedback ? (
          <div
            className={
              state.feedback.type === "success"
                ? "rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
                : "rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            }
          >
            {state.feedback.message}
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Intern</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Booked at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No bookings yet. They appear here as soon as interns reserve sessions.
                </TableCell>
              </TableRow>
            ) : (
              state.bookings.map((booking) => {
                const statusMeta = statusStyles[booking.status];
                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-medium">{booking.user.name ?? booking.user.email}</div>
                      <p className="text-xs text-muted-foreground">{booking.user.email}</p>
                    </TableCell>
                    <TableCell>
                      {formatTimeRange(new Date(booking.timeBlock.startAt), new Date(booking.timeBlock.endAt))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </TableCell>
                    <TableCell>{formatFullDate(new Date(booking.createdAt))}</TableCell>
                    <TableCell className="flex justify-end">
                      {booking.status === BookingStatus.CONFIRMED ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => handleCancel(booking.id)}
                        >
                          <Ban className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
