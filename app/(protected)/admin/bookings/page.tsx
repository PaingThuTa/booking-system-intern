import { AdminBookingsTable, type AdminBooking } from "@/components/admin/bookings-table";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";

export default async function AdminBookingsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const bookings = await prisma.booking.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          internId: true,
        },
      },
      timeBlock: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const normalized: AdminBooking[] = bookings.map((booking) => ({
    id: booking.id,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    user: booking.user,
    timeBlock: {
      id: booking.timeBlock.id,
      startAt: booking.timeBlock.startAt.toISOString(),
      endAt: booking.timeBlock.endAt.toISOString(),
      durationMinutes: booking.timeBlock.durationMinutes,
    },
  }));

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">All bookings</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every reservation across the program appears here. Cancel a session if you need to free up a seat.
        </p>
      </div>

      <AdminBookingsTable initialBookings={normalized} />
    </section>
  );
}
