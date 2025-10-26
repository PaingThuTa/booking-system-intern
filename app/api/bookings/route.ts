import { BookingStatus, Role } from "@prisma/client";
import { NextResponse } from "next/server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyBookingCreated, notifyBookingUpdated } from "@/lib/realtime";
import { bookingCancelSchema, bookingCreateSchema } from "@/lib/zod";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === Role.ADMIN;

  const bookings = await prisma.booking.findMany({
    where: isAdmin
      ? {}
      : {
          userId: session.user.id,
        },
    include: {
      timeBlock: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ data: bookings });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const activeBooking = await tx.booking.findFirst({
        where: {
          userId: session.user.id,
          status: BookingStatus.CONFIRMED,
        },
      });

      if (activeBooking) {
        throw new Error("You already have an active booking. Please cancel it before booking again.");
      }

      const block = await tx.timeBlock.findUnique({
        where: { id: parsed.data.timeBlockId },
        include: {
          bookings: {
            where: {
              status: BookingStatus.CONFIRMED,
            },
          },
        },
      });

      if (!block) {
        throw new Error("Time block not found.");
      }

      if (block.status !== "ACTIVE") {
        throw new Error("This time block is no longer available.");
      }

      if (block.bookings.length >= block.capacity) {
        throw new Error("This time block is fully booked.");
      }

      return tx.booking.create({
        data: {
          userId: session.user.id,
          timeBlockId: parsed.data.timeBlockId,
        },
        include: {
          timeBlock: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    await notifyBookingCreated({ bookingId: booking.id, timeBlockId: booking.timeBlockId });

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : "Unable to create booking.",
        },
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingCancelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const isOwner = booking.userId === session.user.id;
  const isAdmin = session.user.role === Role.ADMIN;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.booking.update({
    where: { id: parsed.data.bookingId },
    data: {
      status: BookingStatus.CANCELED,
    },
  });

  await notifyBookingUpdated({ action: "canceled", bookingId: parsed.data.bookingId });

  return NextResponse.json({ success: true });
}
