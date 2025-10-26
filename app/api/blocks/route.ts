import { BlockStatus, BookingStatus, Role } from "@prisma/client";
import { NextResponse } from "next/server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyBlockChanged } from "@/lib/realtime";
import { timeBlockCreateSchema, timeBlockUpdateSchema } from "@/lib/zod";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("includeInactive") === "true";

  const include =
    session.user.role === Role.ADMIN
      ? {
          bookings: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        }
      : {
          bookings: {
            where: { status: BookingStatus.CONFIRMED },
            select: {
              id: true,
              userId: true,
              status: true,
            },
          },
        };

  const where =
    includeInactive || session.user.role === Role.ADMIN
      ? {}
      : {
          status: {
            not: BlockStatus.INACTIVE,
          },
        };

  const blocks = await prisma.timeBlock.findMany({
    where,
    include,
    orderBy: {
      startAt: "asc",
    },
  });

  return NextResponse.json({ data: blocks });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = timeBlockCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const block = await prisma.timeBlock.create({
    data: parsed.data,
  });

  await notifyBlockChanged({ action: "created", blockId: block.id });

  return NextResponse.json({ data: block }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = timeBlockUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  const updateData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

  const block = await prisma.timeBlock.update({
    where: { id },
    data: updateData,
  });

  await notifyBlockChanged({ action: "updated", blockId: block.id });

  return NextResponse.json({ data: block });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing time block id" }, { status: 400 });
  }

  await prisma.timeBlock.delete({
    where: { id },
  });

  await notifyBlockChanged({ action: "deleted", blockId: id });

  return NextResponse.json({ success: true });
}
