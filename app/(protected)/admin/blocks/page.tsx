import { TimeBlocksTable, type AdminTimeBlock } from "@/components/admin/time-blocks-table";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";

export default async function AdminBlocksPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const blocks = await prisma.timeBlock.findMany({
    include: {
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
    },
    orderBy: {
      startAt: "asc",
    },
  });

  const normalized: AdminTimeBlock[] = blocks.map((block) => ({
    id: block.id,
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
    capacity: block.capacity,
    status: block.status,
    bookings: block.bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      user: booking.user,
    })),
  }));

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Manage time blocks</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Create, edit, or retire time blocks to keep the internship calendar accurate and up to date.
        </p>
      </div>

      <TimeBlocksTable initialBlocks={normalized} />
    </section>
  );
}
