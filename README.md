## Booking App Intern

### Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```
   DATABASE_URL=postgres://...
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-long-random-secret
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ADMIN_EMAILS=user@example.com,user-two@example.com
   ```

   - Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.
   - Set the Google OAuth redirect URI to `http://localhost:3000/api/auth/callback/google`.

3. Run the development server

   ```bash
   npm run dev
   ```

4. Open <http://localhost:3000>. You can sign in with just an email (the account will be created automatically). If Google SSO is configured, the button will also be enabled.

### Production build

```bash
npm run build
npm start
```

Ensure all environment variables (especially `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`) are set before building.

### Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Prisma Docs](https://www.prisma.io/docs)
