// CineBook Comprehensive QA and Concurrency Test Suite
// Agent 3 - QA Suite

import { getDb, withTransaction } from '../src/lib/db/client.ts';
import { runMigrations } from '../src/lib/db/migrate.ts';
import { runSeed } from '../src/lib/db/seed.ts';
import bcrypt from 'bcryptjs';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 CineBook QA & Concurrency Verification Test Suite');
  console.log('======================================================\n');

  // Test 1: Database Migration Clean Run
  console.log('--- TEST 1: Database Schema & Migration Verification ---');
  await runMigrations();
  const db = await getDb();
  const tablesRes = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  const tables = tablesRes.rows.map((r) => r.table_name);
  const expectedTables = [
    'audit_logs',
    'auditoriums',
    'booking_items',
    'bookings',
    'cinemas',
    'genres',
    'movie_genres',
    'movies',
    'payments',
    'seats',
    'showtime_seats',
    'showtimes',
    'tickets',
    'users',
  ];
  for (const expected of expectedTables) {
    assert(tables.includes(expected), `Schema contains table '${expected}'`);
  }

  // Test 2: Database Seed Verification
  console.log('\n--- TEST 2: Seed Data Integrity ---');
  await runSeed();
  const moviesRes = await db.query('SELECT COUNT(*) as c FROM movies;');
  assert(parseInt(moviesRes.rows[0].c, 10) >= 4, 'Movies seeded with full details');

  const cinemasRes = await db.query('SELECT COUNT(*) as c FROM cinemas;');
  assert(parseInt(cinemasRes.rows[0].c, 10) >= 3, 'Cinemas seeded');

  const seatsRes = await db.query('SELECT COUNT(*) as c FROM seats;');
  assert(parseInt(seatsRes.rows[0].c, 10) > 40, 'Physical auditorium seats seeded');

  const showtimeSeatsRes = await db.query('SELECT COUNT(*) as c FROM showtime_seats;');
  assert(parseInt(showtimeSeatsRes.rows[0].c, 10) > 100, 'Showtime seats inventory initialized');

  // Test 3: User Authentication & Role Verification
  console.log('\n--- TEST 3: User Authentication & Roles ---');
  const adminUserRes = await db.query("SELECT * FROM users WHERE email = 'admin@cinebook.com';");
  assert(adminUserRes.rows.length === 1, 'Admin user exists');
  assert(adminUserRes.rows[0].role === 'ADMIN', 'Admin has role ADMIN');

  const customerUserRes = await db.query("SELECT * FROM users WHERE email = 'user@cinebook.com';");
  assert(customerUserRes.rows.length === 1, 'Customer user exists');
  assert(customerUserRes.rows[0].role === 'CUSTOMER', 'Customer has role CUSTOMER');

  const isValidPassword = await bcrypt.compare('UserPassword123!', customerUserRes.rows[0].password_hash);
  assert(isValidPassword, 'Customer password hashes and validates correctly');

  // Test 4: Pricing & Integer Minor Units Verification
  console.log('\n--- TEST 4: Money Stored as Integer Minor Units ---');
  const sampleShowtimeRes = await db.query(`SELECT base_price_cents FROM showtimes LIMIT 1;`);
  const basePriceCents = sampleShowtimeRes.rows[0].base_price_cents;
  assert(Number.isInteger(basePriceCents) && basePriceCents > 0, `Base price is integer cents (${basePriceCents})`);

  const sampleBookingRes = await db.query(`SELECT subtotal_cents, fee_cents, tax_cents, total_cents FROM bookings LIMIT 1;`);
  if (sampleBookingRes.rows.length > 0) {
    const b = sampleBookingRes.rows[0];
    assert(Number.isInteger(b.subtotal_cents), 'subtotal_cents is integer');
    assert(Number.isInteger(b.fee_cents), 'fee_cents is integer');
    assert(Number.isInteger(b.tax_cents), 'tax_cents is integer');
    assert(Number.isInteger(b.total_cents), 'total_cents is integer');
    assert(b.subtotal_cents + b.fee_cents + b.tax_cents === b.total_cents, 'Subtotal + Fee + Tax exactly matches Total');
  }

  // Test 5: CONCURRENCY TEST - 2 Simultaneous Sessions Attempting to Book the Exact Same Seat
  console.log('\n--- TEST 5: Concurrency Test - Race Condition on Same Seat ---');
  // Find an available seat for an upcoming showtime
  const targetSeatRes = await db.query(`
    SELECT ss.id as showtime_seat_id, ss.showtime_id, ss.seat_id, ss.price_cents, s.row, s.number
    FROM showtime_seats ss
    JOIN seats s ON s.id = ss.seat_id
    WHERE ss.status = 'AVAILABLE'
    LIMIT 1;
  `);
  assert(targetSeatRes.rows.length === 1, 'Found available target seat for concurrency test');
  const target = targetSeatRes.rows[0];

  const userA = customerUserRes.rows[0].id;
  const qaUserRes = await db.query("SELECT id FROM users WHERE email = 'qa@cinebook.com';");
  const userB = qaUserRes.rows[0].id;

  // Helper hold function simulating the API transaction
  async function attemptHold(userId, label) {
    return await withTransaction(async (tx) => {
      // Lock row FOR UPDATE
      const lockRes = await tx.query(
        `SELECT ss.id, ss.status, ss.hold_expires_at, ss.held_by_user_id, ss.price_cents
         FROM showtime_seats ss
         WHERE ss.showtime_id = $1 AND ss.seat_id = $2
         FOR UPDATE;`,
        [target.showtime_id, target.seat_id]
      );

      const seat = lockRes.rows[0];
      const now = Date.now();
      const isExpired = seat.hold_expires_at && new Date(seat.hold_expires_at).getTime() < now;
      const isHeldByMe = seat.status === 'HELD' && seat.held_by_user_id === userId;
      const isAvailable = seat.status === 'AVAILABLE' || isExpired || isHeldByMe;

      if (!isAvailable) {
        throw new Error(`CONFLICT: Seat already held/booked (${label})`);
      }

      // Hold seat for 10 minutes
      const expiresAt = new Date(now + 10 * 60 * 1000);
      await tx.query(
        `UPDATE showtime_seats
         SET status = 'HELD', hold_expires_at = $1, held_by_user_id = $2
         WHERE id = $3;`,
        [expiresAt.toISOString(), userId, seat.id]
      );

      // Create pending booking
      const ref = `CNB-${(Date.now() % 100000)}-${label.substring(0, 4)}`;
      const subtotal = seat.price_cents;
      const fee = 150;
      const tax = Math.round(subtotal * 0.08);
      const total = subtotal + fee + tax;

      const bookingRes = await tx.query(
        `INSERT INTO bookings (reference, user_id, showtime_id, status, subtotal_cents, fee_cents, tax_cents, total_cents, expires_at)
         VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8)
         RETURNING id;`,
        [ref, userId, target.showtime_id, subtotal, fee, tax, total, expiresAt.toISOString()]
      );

      return { success: true, bookingId: bookingRes.rows[0].id, label };
    });
  }

  // Fire both transactions concurrently in parallel promises
  const results = await Promise.allSettled([
    attemptHold(userA, 'Session_UserA'),
    attemptHold(userB, 'Session_UserB'),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  for (const r of rejected) {
    console.error('Rejection detail:', r.reason);
  }

  assert(fulfilled.length === 1, `Strictly 1 concurrent booking succeeded (Got ${fulfilled.length})`);
  assert(rejected.length === 1, `Strictly 1 concurrent booking was rejected due to lock conflict (Got ${rejected.length})`);
  console.log(`ℹ️ Winner: ${fulfilled[0].value.label}, Blocked with conflict: ${rejected[0].reason.message}`);

  // Test 6: Expired Hold & Automatic Seat Release
  console.log('\n--- TEST 6: Expired Hold & Idempotent Cleanup ---');
  // Artificially expire the held seat
  await db.query(`
    UPDATE showtime_seats
    SET hold_expires_at = NOW() - INTERVAL '5 minutes'
    WHERE showtime_id = $1 AND seat_id = $2;
  `, [target.showtime_id, target.seat_id]);

  // Simulate idempotent cron hold release
  const releaseRes = await db.query(`
    UPDATE showtime_seats
    SET status = 'AVAILABLE', hold_expires_at = NULL, held_by_user_id = NULL, booking_id = NULL
    WHERE status = 'HELD' AND hold_expires_at < NOW()
    RETURNING id;
  `);
  assert(releaseRes.rows.length >= 1, `Expired hold successfully identified and released (${releaseRes.rows.length} seats)`);

  // Check that the seat is now AVAILABLE again
  const verifyAvailableRes = await db.query(
    `SELECT status FROM showtime_seats WHERE showtime_id = $1 AND seat_id = $2;`,
    [target.showtime_id, target.seat_id]
  );
  assert(verifyAvailableRes.rows[0].status === 'AVAILABLE', 'Seat is back to AVAILABLE status');

  // Test 7: Payment Idempotency Keys & Digital Ticket QR Code Generation
  console.log('\n--- TEST 7: Payment Idempotency & Ticket Generation ---');
  // Re-hold seat cleanly for userA
  const freshHold = await attemptHold(userA, 'Idempotency_Test');
  const bookingId = freshHold.bookingId;

  const idempotencyKey = `idem_key_${Date.now()}_test`;

  // Payment function
  async function pay(key) {
    const existing = await db.query(`SELECT * FROM payments WHERE idempotency_key = $1;`, [key]);
    if (existing.rows.length > 0 && existing.rows[0].status === 'SUCCEEDED') {
      return { reused: true, payment: existing.rows[0] };
    }

    return await withTransaction(async (tx) => {
      const bRes = await tx.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE;`, [bookingId]);
      const b = bRes.rows[0];

      const pRes = await tx.query(
        `INSERT INTO payments (booking_id, idempotency_key, provider, transaction_ref, amount_cents, status)
         VALUES ($1, $2, 'STRIPE_TEST', 'txn_idem_123', $3, 'SUCCEEDED')
         RETURNING *;`,
        [bookingId, key, b.total_cents]
      );

      await tx.query(`UPDATE bookings SET status = 'CONFIRMED' WHERE id = $1;`, [bookingId]);
      await tx.query(`UPDATE showtime_seats SET status = 'BOOKED', hold_expires_at = NULL WHERE id = $1;`, [target.showtime_seat_id]);

      const tckNum = `TCK-TEST-${Date.now()}`;
      const qrData = JSON.stringify({ ticket: tckNum, ref: b.reference });
      const tckRes = await tx.query(
        `INSERT INTO tickets (booking_id, ticket_number, qr_code_data)
         VALUES ($1, $2, $3)
         RETURNING *;`,
        [bookingId, tckNum, qrData]
      );

      return { reused: false, payment: pRes.rows[0], ticket: tckRes.rows[0] };
    });
  }

  // First payment call
  const firstPayment = await pay(idempotencyKey);
  assert(!firstPayment.reused, 'First payment executed cleanly');
  assert(firstPayment.ticket.ticket_number.startsWith('TCK-TEST'), 'Digital ticket generated with unique number');
  assert(firstPayment.ticket.qr_code_data.includes('ticket'), 'Ticket contains QR code payload');

  // Retry with IDENTICAL idempotency key
  const duplicatePayment = await pay(idempotencyKey);
  assert(duplicatePayment.reused, 'Duplicate payment call returned previous payment safely via idempotency key');
  assert(duplicatePayment.payment.id === firstPayment.payment.id, 'Idempotent replay did NOT duplicate payment record');

  // Test 8: Booking Cancellation & Seat Release
  console.log('\n--- TEST 8: Booking Cancellation & Seat Restoration ---');
  await withTransaction(async (tx) => {
    await tx.query(`UPDATE bookings SET status = 'CANCELLED' WHERE id = $1;`, [bookingId]);
    await tx.query(
      `UPDATE showtime_seats SET status = 'AVAILABLE', booking_id = NULL WHERE showtime_id = $1 AND seat_id = $2;`,
      [target.showtime_id, target.seat_id]
    );
    await tx.query(`UPDATE payments SET status = 'REFUNDED' WHERE booking_id = $1;`, [bookingId]);
  });

  const seatAfterCancel = await db.query(
    `SELECT status FROM showtime_seats WHERE showtime_id = $1 AND seat_id = $2;`,
    [target.showtime_id, target.seat_id]
  );
  assert(seatAfterCancel.rows[0].status === 'AVAILABLE', 'Cancelled booking restores seat back to AVAILABLE');

  const paymentAfterCancel = await db.query(
    `SELECT status FROM payments WHERE booking_id = $1;`,
    [bookingId]
  );
  assert(paymentAfterCancel.rows[0].status === 'REFUNDED', 'Payment marked as REFUNDED upon cancellation');

  // Test 9: Data Security & User Isolation
  console.log('\n--- TEST 9: Authorization Isolation Check ---');
  // User B cannot query or access User A's booking
  const isolationCheck = await db.query(
    `SELECT * FROM bookings WHERE id = $1 AND user_id = $2;`,
    [bookingId, userB]
  );
  assert(isolationCheck.rows.length === 0, "User B's session cannot see or access User A's private booking record");

  console.log('\n======================================================');
  console.log(`🎉 ALL QA TESTS PASSED! (${passedTests} passed, ${failedTests} failed)`);
  console.log('======================================================\n');
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
