import { BookingStatus, Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import prisma from "@/lib/db";
import { formatFullDate } from "@/lib/format";
import { auth, defaultRedirectForRole } from "@/lib/auth";

const statusCopy: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  CANCELED: "Canceled",
};

export default async function MyBookingsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  if (session.user.role === Role.ADMIN) {
    redirect(defaultRedirectForRole(session.user.role));
  }

  const bookings = await prisma.booking.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      timeBlock: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Your booking history</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Track the sessions you&apos;ve reserved. You can cancel from the booking list if you need to reschedule.
        </p>
      </div>

      <Table>
        <TableCaption>Your most recent booking appears at the top.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Session window</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Booked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                No bookings yet. Head over to the booking page to reserve a slot.
              </TableCell>
            </TableRow>
          ) : (
            bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">
                  {formatFullDate(booking.timeBlock.startAt)} → {formatFullDate(booking.timeBlock.endAt)}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      booking.status === BookingStatus.CONFIRMED
                        ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600"
                        : "rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600"
                    }
                  >
                    {statusCopy[booking.status]}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFullDate(booking.createdAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
