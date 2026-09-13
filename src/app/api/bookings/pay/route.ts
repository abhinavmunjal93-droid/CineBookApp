import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, getDb } from '@/lib/db/client';
import { getSessionFromRequest } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to complete payment.' },
        { status: 401 }
      );
    }

    const { bookingId, idempotencyKey, simulateOutcome } = await req.json();

    if (!bookingId || !idempotencyKey) {
      return NextResponse.json(
        { error: 'bookingId and idempotencyKey are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 1. Check Idempotency Key first
    const existingPayment = await db.query(
      `SELECT p.*, b.status as booking_status, b.reference as booking_reference
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE p.idempotency_key = $1;`,
      [idempotencyKey]
    );

    if (existingPayment.rows.length > 0) {
      const prevPayment = existingPayment.rows[0];
      if (prevPayment.status === 'SUCCEEDED') {
        // Fetch existing ticket
        const ticketRes = await db.query(
          `SELECT * FROM tickets WHERE booking_id = $1 LIMIT 1;`,
          [prevPayment.booking_id]
        );
        return NextResponse.json({
          success: true,
          idempotentReplay: true,
          message: 'Payment already processed successfully',
          payment: prevPayment,
          bookingId: prevPayment.booking_id,
          reference: prevPayment.booking_reference,
          ticket: ticketRes.rows[0] || null,
        });
      }
    }

    // 2. Process payment within transaction
    const result = await withTransaction(async (tx) => {
      // Lock the booking record
      const bookingRes = await tx.query(
        `SELECT b.*, m.title as movie_title, a.name as auditorium_name, c.name as cinema_name, st.start_time
         FROM bookings b
         JOIN showtimes st ON st.id = b.showtime_id
         JOIN movies m ON m.id = st.movie_id
         JOIN auditoriums a ON a.id = st.auditorium_id
         JOIN cinemas c ON c.id = a.cinema_id
         WHERE b.id = $1
         FOR UPDATE;`,
        [bookingId]
      );

      if (bookingRes.rows.length === 0) {
        throw { status: 404, message: 'Booking not found' };
      }

      const booking = bookingRes.rows[0];

      // Verify ownership
      if (booking.user_id !== session.id && session.role !== 'ADMIN') {
        throw { status: 403, message: 'You do not have permission to pay for this booking' };
      }

      // Check if already confirmed
      if (booking.status === 'CONFIRMED') {
        const ticketRes = await tx.query(
          `SELECT * FROM tickets WHERE booking_id = $1 LIMIT 1;`,
          [bookingId]
        );
        return {
          alreadyConfirmed: true,
          booking,
          ticket: ticketRes.rows[0],
        };
      }

      // Check hold expiration
      const now = Date.now();
      const expiresAtMs = new Date(booking.expires_at).getTime();
      if (expiresAtMs < now || booking.status === 'EXPIRED') {
        // Mark booking as expired and release seats
        await tx.query(`UPDATE bookings SET status = 'EXPIRED' WHERE id = $1;`, [bookingId]);
        await tx.query(
          `UPDATE showtime_seats
           SET status = 'AVAILABLE', hold_expires_at = NULL, held_by_user_id = NULL
           WHERE booking_id = $1 AND status = 'HELD';`,
          [bookingId]
        );
        throw {
          status: 400,
          message: 'Your seat hold has expired. Please select your seats again.',
        };
      }

      if (booking.status !== 'PENDING') {
        throw {
          status: 400,
          message: `Booking cannot be paid (current status: ${booking.status})`,
        };
      }

      // Check simulated decline
      if (simulateOutcome === 'DECLINED') {
        await tx.query(
          `INSERT INTO payments (
             booking_id,
             idempotency_key,
             provider,
             transaction_ref,
             amount_cents,
             status,
             error_message
           )
           VALUES ($1, $2, 'STRIPE_TEST', $3, $4, 'FAILED', $5)
           ON CONFLICT (idempotency_key) DO UPDATE
           SET status = 'FAILED', error_message = EXCLUDED.error_message;`,
          [
            bookingId,
            idempotencyKey,
            `txn_fail_${Date.now()}`,
            booking.total_cents,
            'Simulated card issuer decline',
          ]
        );

        throw {
          status: 402,
          message: 'Payment declined: The test card was declined by the issuer.',
        };
      }

      // Successful payment execution
      const txnRef = `txn_test_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

      const paymentRes = await tx.query(
        `INSERT INTO payments (
           booking_id,
           idempotency_key,
           provider,
           transaction_ref,
           amount_cents,
           status
         )
         VALUES ($1, $2, 'STRIPE_TEST', $3, $4, 'SUCCEEDED')
         ON CONFLICT (idempotency_key) DO UPDATE
         SET status = 'SUCCEEDED', transaction_ref = EXCLUDED.transaction_ref
         RETURNING *;`,
        [bookingId, idempotencyKey, txnRef, booking.total_cents]
      );

      // Confirm the booking
      await tx.query(
        `UPDATE bookings
         SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1;`,
        [bookingId]
      );

      // Transition seats to BOOKED and clear hold expiry
      await tx.query(
        `UPDATE showtime_seats
         SET 
           status = 'BOOKED',
           hold_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = $1;`,
        [bookingId]
      );

      // Fetch booked seats info for ticket
      const itemsRes = await tx.query(
        `SELECT seat_row, seat_number, seat_tier, price_cents
         FROM booking_items
         WHERE booking_id = $1
         ORDER BY seat_row ASC, seat_number ASC;`,
        [bookingId]
      );

      const seatLabels = itemsRes.rows.map((i) => `${i.seat_row}${i.seat_number}`).join(', ');

      // Issue Digital Ticket with QR code payload
      const ticketNumber = `TCK-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const qrPayload = JSON.stringify({
        v: 1,
        ticket: ticketNumber,
        reference: booking.reference,
        holder: session.fullName,
        movie: booking.movie_title,
        cinema: booking.cinema_name,
        auditorium: booking.auditorium_name,
        showtime: booking.start_time,
        seats: seatLabels,
        amount: `$${(booking.total_cents / 100).toFixed(2)}`,
        verified: true,
      });

      const ticketRes = await tx.query(
        `INSERT INTO tickets (booking_id, ticket_number, qr_code_data)
         VALUES ($1, $2, $3)
         RETURNING *;`,
        [bookingId, ticketNumber, qrPayload]
      );

      // Write Audit Log
      await tx.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, metadata)
         VALUES ('BOOKING', $1, 'PAYMENT_CONFIRMED', $2, $3::jsonb);`,
        [
          bookingId,
          session.id,
          JSON.stringify({
            paymentId: paymentRes.rows[0].id,
            ticketNumber,
            totalCents: booking.total_cents,
            seats: seatLabels,
          }),
        ]
      );

      return {
        booking: {
          ...booking,
          status: 'CONFIRMED',
          seats: itemsRes.rows,
        },
        payment: paymentRes.rows[0],
        ticket: ticketRes.rows[0],
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error.status && error.message) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed. Please try again.' },
      { status: 500 }
    );
  }
}
