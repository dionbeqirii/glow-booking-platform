GLOW BY DIELLZA — RESERVATION AND QUEUE MANAGEMENT PLATFORM
=============================================================

Bachelor thesis project: "Development of a Platform for Reservations and
Queue Management for Service Businesses".

The platform unifies appointment-based reservations and the walk-in client
queue in a single shared availability calendar. It is developed and
demonstrated on the real case of the Glow By Diellza skincare studio, but
remains general: services, staff and schedules are fully configurable, with
no business-specific logic in the code.

NOTE: All data in the demo, screenshots and tests is SYNTHETIC — no real
client data is used.


TECH STACK
----------
- Next.js 16 (App Router, TypeScript) — full-stack
- Prisma 7 ORM with the @prisma/adapter-pg driver adapter
- Supabase (PostgreSQL) — hosted database
- Tailwind CSS — styling
- Custom authentication: bcrypt password hashing + JWT (jose) session
  cookie, with role-based access control (RBAC)


SCOPE
-----
Included: roles (administrator, staff, client) with RBAC; service catalog
with durations; staff schedules and availability; booking, cancellation and
rescheduling without conflicts (double-booking prevention at the database
level); walk-in queue with check-in and estimated waiting time; staff
assignment, service statuses, notifications and history; administrative
dashboard with statistics; server-side validation and an audit log.

Not included: full CRM, accounting, inventory, marketplace, online
payments, paid SMS.
Optional (after the core): QR check-in, deposits, maps.


INSTALLATION INSTRUCTIONS
==========================

Requirements: Node.js 20 or newer, npm, and a free Supabase account
(hosted PostgreSQL — no local database install needed).

Step 1 — Install dependencies
------------------------------
    npm install

Step 2 — Create a Supabase project and configure the database
----------------------------------------------------------------
1. Create a free project at https://supabase.com
2. Go to Project Settings -> Database -> Connection string and copy both:
   - the Connection pooling string (port 6543) -> DATABASE_URL
   - the Direct connection string (port 5432)  -> DIRECT_URL
3. Copy .env.example to .env and paste the two strings, then set a long
   random JWT_SECRET:
    cp .env.example .env

Step 3 — Create the schema and seed synthetic demo data
------------------------------------------------------------
    npm run db:push     (creates the tables in Supabase from prisma/schema.prisma)
    npm run db:seed     (inserts synthetic Glow By Diellza demo data)

Step 4 — (Optional) Configure real email delivery
------------------------------------------------------
By default, password-reset links are shown directly on screen (demo mode).
To send them by real email instead, fill in the SMTP_* variables in .env
(see the comments in .env.example for Gmail/Resend examples). Leave them
blank to keep demo mode.

Step 5 — Run the app
--------------------
    npm run dev

Open http://localhost:3000 — the UI is available in Albanian, English and
German.


DEMO ACCOUNTS (SYNTHETIC)
--------------------------
Role     Email                              Password
------   --------------------------------   -------------
Admin    dion.beqiri@umib.net               ******
Staff    diellza@glowbydiellza.demo         ******
Staff    blerta@gmail.com                   ******
Client   dbeqiri688@gmail.com               ******

New public sign-ups always become CLIENT accounts; staff/admin are created
by an administrator.


PROJECT STRUCTURE
------------------
prisma/
  schema.prisma      data model (maps 1:1 to the thesis ER diagram)
  seed.ts            synthetic demo data
prisma.config.ts     Prisma 7 datasource/seed config
scripts/
  db-constraints.ts  applies the DB-level exclusion constraint (double-booking prevention)
  set-user.ts        CLI helper: reset a password or change a user's role locally
messages/            next-intl translations: sq.json, en.json, de.json
src/
  app/               routes: /, /login, /register, /admin, /staff, /client, /api/auth/*
  components/        AuthForm, DashboardShell, LogoutButton
  lib/               prisma, auth (bcrypt + JWT), rbac, validation, audit, notify,
                     availability, queue, loyalty
  proxy.ts           route protection (Next.js 16 "proxy", formerly middleware)


NPM SCRIPTS
-----------
npm run dev              Start the dev server
npm run build             Production build
npm run start             Run the production build
npm run lint              Run ESLint
npm run db:generate       Regenerate the Prisma client from the schema
npm run db:push           Sync the schema to the database
npm run db:migrate        Create/apply a versioned migration (dev)
npm run db:seed           Seed synthetic demo data
npm run db:studio         Open Prisma Studio (browse the data)
npm run db:constraints    Apply the DB-level exclusion constraint against double bookings
npm run user              CLI helper to reset a password / change a role
                          (see scripts/set-user.ts)


AUTHOR
------
Dion Beqiri — Bachelor thesis, Computer Science and Engineering.
Submission deadline: January 14, 2027.
