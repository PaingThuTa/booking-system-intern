## Booking App Intern

An internal scheduling portal where interns reserve interview slots and admins manage availability. The stack includes:

- **Next.js (App Router)** for public, intern, and admin experiences
- **Prisma + PostgreSQL (Neon)** for data storage
- **NextAuth (credentials)** for email-based authentication
- **Tailwind CSS + shadcn/ui** for the interface layer

### Features

- Intern dashboard to browse upcoming time blocks and book/cancel a single session
- Admin tools to create time blocks with explicit duration, pause availability, and monitor reservations
- Role-aware middleware to gate routes (public, intern, admin)
- Email sign-in that collects full name and intern ID, preventing duplicate accounts

### Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
