# CineBook — Full-Stack Cinema Booking Platform

CineBook is a production-grade cinema-booking application engineered for high-concurrency seat reservations, atomic transactional guarantees, server-side pricing in integer minor units, and verifiable digital boarding-pass tickets with scannable QR codes.

Built with **Next.js 15 (App Router)**, **TypeScript**, bespoke **Vanilla CSS design system**, and **PostgreSQL (Neon)**.

---

## Key Features

- **Atomic Seat Holds & Concurrency Locking**:
  Uses PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) inside atomic database transactions (`BEGIN ... COMMIT`) to prevent race conditions and eliminate double bookings.
- **Integer Minor Units**:
  All financial amounts are stored and calculated strictly as integer cents (`base_price_cents`, `subtotal_cents`, `fee_cents`, `tax_cents`, `total_cents`) to prevent floating-point rounding errors.
- **10-Minute Hold Reservation**:
  Selected seats are locked for 10 minutes with live countdown timers on seat maps and checkout.
- **Idempotent Background Release**:
  Dedicated, idempotent hold-release endpoint (`/api/cron/release-holds`) protected with `CRON_SECRET` for scheduled cleanup via Vercel Cron.
- **Payment Idempotency**:
  Every checkout transaction accepts an `idempotency_key` ensuring network retries never duplicate bookings or charges.
- **Digital Boarding Pass Tickets**:
  High-contrast scannable QR codes with cryptographic verification payloads, printable ticket sheets, and gate check-in status.
- **Booking Management & Self-Serve Cancellation**:
  Customers can review reservation history, access digital passes, and cancel eligible bookings with immediate seat restoration and payment refund status.
- **Operations Dashboard**:
  Admin console with real-time revenue metrics, theater screen occupancy, movie catalog manager, showtime scheduler, and immutable audit logs.
- **Zero-Config Local Test Engine**:
  Runs against cloud **Neon PostgreSQL** in production and automatically falls back to an embedded WebAssembly Postgres engine (`@electric-sql/pglite`) for instant, dependency-free local development and automated testing.

---

## 14-Table Database Schema

The database architecture is designed with UUID primary keys, UTC timestamps, foreign keys, validation constraints, and indexes:

1. `users`: Customer and administrator authentication and RBAC roles.
2. `movies`: Film catalog with age ratings, durations, poster, backdrop, and synopses.
3. `genres`: Film genre taxonomy.
4. `movie_genres`: Many-to-many relationship junction.
5. `cinemas`: Luxury theater complexes with addresses, cities, and amenities.
6. `auditoriums`: Individual screens/theaters with screen types (`IMAX_3D`, `DOLBY_CINEMA`, `4DX`, `STANDARD`). Unique constraint on `(cinema_id, name)`.
7. `seats`: Physical auditorium seats with rows, numbers, and tiers (`REGULAR`, `PREMIUM`, `VIP`, `ACCESSIBLE`). Unique constraint on `(auditorium_id, row, number)`.
8. `showtimes`: Screenings scheduled per movie and auditorium with base pricing in integer cents.
9. `showtime_seats`: Real-time inventory and hold status for each showtime. Unique constraint on `(showtime_id, seat_id)`.
10. `bookings`: Reservation records with reference, financial breakdowns in cents, and statuses (`PENDING`, `CONFIRMED`, `CANCELLED`, `EXPIRED`, `REFUNDED`).
11. `booking_items`: Itemized allocated seats and line-item prices per booking.
12. `payments`: Payment records with unique `idempotency_key`, provider reference, and statuses (`PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED`, `CANCELLED`).
13. `tickets`: Digital admission passes with unique ticket numbers and QR code payloads.
14. `audit_logs`: Chronological audit trail of all booking transitions, payments, cancellations, and admin actions.

---

## Quick Start (Local Setup)

### 1. Prerequisites
- Node.js v18.19+ (Node v20+ or v24+ recommended)
- npm v9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | `postgres://...` (Leave blank for local zero-config engine) |
| `DATABASE_URL_UNPOOLED` | Neon PostgreSQL direct connection for DDL | `postgres://...` |
| `JWT_SECRET` | Secret key for JWT session tokens (min 32 chars) | `cinebook-local-development-secret-jwt-key-32chars!` |
| `CRON_SECRET` | Secret bearer token protecting hold-release endpoint | `cinebook_cron_secret_secure_key_9999` |
| `PAYMENT_WEBHOOK_SECRET` | Signature verification secret for payments | `whsec_cinebook_test_key_live_2026` |
| `NEXT_PUBLIC_APP_URL` | Base URL of application | `http://localhost:3000` |

### 4. Run Migrations & Seed Database
```bash
# Execute DDL migrations
npm run db:migrate

# Seed sample movies, cinemas, auditoriums, seats, and showtimes
npm run db:seed
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Pre-Seeded Test Credentials

| Account Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@cinebook.com` | `AdminPassword123!` | Full Admin Console, Showtimes, Audit Logs, Revenue KPIs |
| **Customer (Demo)**| `user@cinebook.com` | `UserPassword123!` | Seat Booking, History, Digital Passes, Cancellations |
| **Customer (QA)**  | `qa@cinebook.com`   | `QaPassword123!`   | Concurrency and Isolation Testing |

*(Use the 1-click autofill buttons on the login page for instantaneous sign-in).*

---

## Quality Assurance & Concurrency Test Suite

Execute the automated QA test suite verifying all 9 core requirements:
```bash
npm run test:qa
```

### Tests Covered:
1. **Database Schema & Migrations**: Verifies all 14 tables, constraints, foreign keys, and indexes exist.
2. **Seed Data Integrity**: Verifies blockbuster titles, genres, luxury complexes, physical seats, and showtimes.
3. **User Authentication & RBAC**: Verifies password hashing with bcrypt, role isolation (`ADMIN` vs `CUSTOMER`).
4. **Integer Minor Units**: Confirms base prices, subtotals, convenience fees, and taxes are strictly integer cents with zero rounding error.
5. **Concurrency Race-Condition Test**: Spawns two simultaneous sessions attempting to reserve the exact same seat at the exact same millisecond; asserts that strictly 1 transaction succeeds and 1 is rejected with a clean lock conflict.
6. **Expired Hold Release**: Tests automatic expiration detection and idempotent release of held seats back to `AVAILABLE`.
7. **Payment Idempotency & Tickets**: Tests unique idempotency key deduplication and verifiable QR ticket generation.
8. **Booking Cancellation**: Verifies immediate seat inventory restoration and payment refund tracking.
9. **Security Isolation**: Asserts that User B cannot view, modify, or cancel User A's private booking.

---

## Vercel Deployment Instructions

### 1. Provision Neon PostgreSQL
1. In your [Vercel Dashboard](https://vercel.com), navigate to the **Storage** tab.
2. Click **Create Database** and select **Neon PostgreSQL**.
3. Choose your preferred region (e.g. `us-east-1` or `us-east-2`).
4. Once created, Vercel automatically exposes `DATABASE_URL` (pooled connection string) and `POSTGRES_URL_NON_POOLING` to your project environment variables.

### 2. Configure Environment Variables on Vercel
In **Project Settings > Environment Variables**, ensure:
- `DATABASE_URL`: `postgres://...pooler...` (provided by Neon integration)
- `DATABASE_URL_UNPOOLED`: `postgres://...` (provided by Neon integration)
- `JWT_SECRET`: A secure 64-character random string
- `CRON_SECRET`: A secure random secret for Vercel Cron
- `PAYMENT_WEBHOOK_SECRET`: Payment webhook signing secret
- `NEXT_PUBLIC_APP_URL`: Your production domain (e.g. `https://cinebook.vercel.app`)

### 3. Deploy via Vercel CLI or Git
```bash
# Deploy with Vercel CLI
vercel --prod
```

### 4. Post-Deployment Database Migration
Run database migrations against your production Neon instance:
```bash
DATABASE_URL="<YOUR_PRODUCTION_NEON_URL>" npm run db:migrate
DATABASE_URL="<YOUR_PRODUCTION_NEON_URL>" npm run db:seed
```

### 5. Configure Vercel Cron (Automated Seat Hold Release)
Add a `vercel.json` file in the root directory:
```json
{
  "crons": [
    {
      "path": "/api/cron/release-holds",
      "schedule": "*/5 * * * *"
    }
  ]
}
```
Vercel Cron automatically triggers `/api/cron/release-holds` every 5 minutes with appropriate headers.
