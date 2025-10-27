import { BlockStatus, BookingStatus, Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/db";
import { auth, defaultRedirectForRole } from "@/lib/auth";
import { formatFullDate, formatTimeRange, minutesToDuration } from "@/lib/format";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  if (session.user.role !== Role.ADMIN) {
    redirect(defaultRedirectForRole(session.user.role));
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [upcomingBookings, totalConfirmed, scheduledInterns, openSlotCount, todayConfirmed] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        timeBlock: {
          startAt: {
            gte: now,
          },
        },
      },
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
        timeBlock: {
          startAt: "asc",
        },
      },
      take: 8,
    }),
    prisma.booking.count({
      where: {
        status: BookingStatus.CONFIRMED,
      },
    }),
    prisma.booking
      .groupBy({
        by: ["userId"],
        where: {
          status: BookingStatus.CONFIRMED,
        },
      })
      .then((groups) => groups.length),
    prisma.timeBlock.count({
      where: {
        status: BlockStatus.ACTIVE,
        endAt: {
          gte: now,
        },
        bookings: {
          none: {
            status: BookingStatus.CONFIRMED,
          },
        },
      },
    }),
    prisma.booking.count({
      where: {
        status: BookingStatus.CONFIRMED,
        timeBlock: {
          startAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      },
    }),
  ]);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Keep an eye on upcoming interviews and remaining capacity so every intern gets the time they need.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scheduled sessions</CardDescription>
            <CardTitle className="text-3xl font-semibold">{totalConfirmed}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Confirmed bookings across every time block.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Interns scheduled</CardDescription>
            <CardTitle className="text-3xl font-semibold">{scheduledInterns}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Unique interns who currently hold a confirmed session.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open slots</CardDescription>
            <CardTitle className="text-3xl font-semibold">{openSlotCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Active time blocks that are still available to book.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today&apos;s sessions</CardDescription>
            <CardTitle className="text-3xl font-semibold">{todayConfirmed}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Confirmed interviews scheduled for the remainder of today.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming sessions</CardTitle>
            <CardDescription>
              The next confirmed interviews sorted by start time. Join on time and be prepared for each intern.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="rounded-md border border-dashed border-muted-foreground/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No upcoming sessions. Once interns book, you&apos;ll see them here.
              </p>
            ) : (
              <ul className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <li
                    key={booking.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">
                          {booking.user.name ?? booking.user.email}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <p>{booking.user.email}</p>
                          {booking.user.internId ? <p>Intern ID: {booking.user.internId}</p> : null}
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-1 sm:items-end">
                        <Badge variant="outline">
                          {formatTimeRange(new Date(booking.timeBlock.startAt), new Date(booking.timeBlock.endAt))}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Duration: {minutesToDuration(booking.timeBlock.durationMinutes)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Booked {formatFullDate(booking.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Capacity notes</CardTitle>
            <CardDescription>
              A quick breakdown of today&apos;s workload versus remaining availability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{todayConfirmed}</span> sessions are scheduled for today.
            </p>
            <p>
              <span className="font-medium text-foreground">{openSlotCount}</span> future time blocks are open. Consider
              adding more availability if interns still need appointments.
            </p>
            <p>
              You have{" "}
              <span className="font-medium text-foreground">{scheduledInterns}</span> interns with confirmed bookings.
              Check in with anyone still waiting and help them secure a slot.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
