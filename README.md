# Glow By Diellza — Reservation and Queue Management Platform

Bachelor thesis project: **"Development of a Platform for Reservations and Queue Management for Service Businesses"**.

The platform unifies appointment-based reservations and the walk-in client queue in a single shared availability calendar. It is developed and demonstrated on the real case of the **Glow By Diellza** skincare studio, but remains general: services, staff and schedules are fully configurable, with no business-specific logic in the code.

> **Note:** All data in the demo, screenshots and tests is **synthetic** — no real client data is used.

## Tech stack

- **Next.js 16** (App Router, TypeScript) — full-stack
- **Prisma 7** ORM with the **`@prisma/adapter-pg`** driver adapter
- **Supabase** (PostgreSQL) — hosted database
- **Tailwind CSS** — styling
- Custom authentication: **bcrypt** password hashing + **JWT** (`jose`) session cookie, with **role-based access control (RBAC)**

## Scope

**Included:** roles (administrator, staff, client) with RBAC; service catalog with durations; staff schedules and availability; booking, cancellation and rescheduling without conflicts (double-booking prevention at the database level); walk-in queue with check-in and estimated waiting time; staff assignment, service statuses, notifications and history; administrative dashboard with statistics; server-side validation and an audit log.

**Not included:** full CRM, accounting, inventory, marketplace, online payments, paid SMS.
**Optional (after the core):** QR check-in, deposits, maps.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project and configure the database

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → Database → Connection string** and copy both:
   - the **Connection pooling** string (port `6543`) → `DATABASE_URL`
   - the **Direct connection** string (port `5432`) → `DIRECT_URL`
3. Copy `.env.example` to `.env` and paste the two strings, then set a long random `JWT_SECRET`:

```bash
cp .env.example .env
```

### 3. Create the schema and seed synthetic demo data

```bash
npm run db:push     # creates the tables in Supabase from prisma/schema.prisma
npm run db:seed     # inserts synthetic Glow By Diellza demo data
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts (synthetic)

| Role   | Email                          | Password      |
| ------ | ------------------------------ | ------------- |
| Admin  | `admin@glowbydiellza.demo`     | `Password123` |
| Staff  | `diellza@glowbydiellza.demo`   | `Password123` |
| Staff  | `era@glowbydiellza.demo`       | `Password123` |
| Client | `arta@example.demo`            | `Password123` |

New public sign-ups always become **CLIENT** accounts; staff/admin are created by an administrator.

## Project structure

```
prisma/
  schema.prisma      # data model (maps 1:1 to the thesis ER diagram)
  seed.ts            # synthetic demo data
prisma.config.ts     # Prisma 7 datasource/seed config
src/
  app/               # routes: /, /login, /register, /admin, /staff, /client, /api/auth/*
  components/        # AuthForm, DashboardShell, LogoutButton
  lib/               # prisma, auth (bcrypt + JWT), rbac, validation, audit
  proxy.ts           # route protection (Next.js 16 "proxy", formerly middleware)
```

## npm scripts

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start the dev server                     |
| `npm run build`     | Production build                         |
| `npm run db:push`   | Sync the schema to the database          |
| `npm run db:seed`   | Seed synthetic demo data                 |
| `npm run db:studio` | Open Prisma Studio (browse the data)     |

## Author

Dion Beqiri — Bachelor thesis, Computer Science and Engineering. Submission deadline: January 14, 2027.
