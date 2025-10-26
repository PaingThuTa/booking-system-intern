## Booking Web Application (beta)

An internal scheduling portal where interns book interview slots and admins manage availability, built with:

- **Next.js (App Router)** for the user and admin dashboards
- **Prisma + PostgreSQL** (Neon) for data storage
- **NextAuth (credentials)** for simple email-based authentication
- **Tailwind CSS + shadcn/ui** for UI components

### Features

- Intern dashboard to browse available time blocks and make/cancel bookings
- Admin tools to create time blocks, manage capacity, and view bookings per slot
- Role-based routing in middleware (public, intern, admin sections)
- Email-only sign-in (Google SSO is currently optional/disabled)
