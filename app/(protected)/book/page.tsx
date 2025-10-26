import { BlockStatus, BookingStatus } from "@prisma/client";

import { TimeBlockList, type TimeBlockView } from "@/components/book/time-block-list";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";

export default async function BookPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const now = new Date();
  const [blocks, existingBooking] = await Promise.all([
    prisma.timeBlock.findMany({
      where: {
        status: BlockStatus.ACTIVE,
        endAt: {
          gte: now,
        },
      },
      include: {
        bookings: {
          where: {
            status: BookingStatus.CONFIRMED,
          },
          select: {
            id: true,
            userId: true,
          },
        },
      },
      orderBy: {
        startAt: "asc",
      },
    }),
    prisma.booking.findFirst({
      where: {
        userId: session.user.id,
        status: BookingStatus.CONFIRMED,
      },
      select: {
        id: true,
        timeBlockId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const sanitizedBlocks: TimeBlockView[] = blocks.map((block) => ({
    id: block.id,
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
    capacity: block.capacity,
    confirmedCount: block.bookings.length,
    hasMyBooking: block.id === existingBooking?.timeBlockId,
  }));

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reserve your internship session</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Choose one of the available time blocks below. Once confirmed, you can reschedule by canceling your
          booking and selecting a different slot.
        </p>
      </div>

      <TimeBlockList
        blocks={sanitizedBlocks}
        existingBookingId={existingBooking?.id}
        userId={session.user.id}
      />
    </section>
  );
}
