import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db/client';
import { getSessionFromRequest } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required to cancel a booking' },
        { status: 401 }
      );
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    const result = await withTransaction(async (tx) => {
      // 1. Lock and fetch the booking
      const bookingRes = await tx.query(
        `SELECT b.*, st.start_time
         FROM bookings b
         JOIN showtimes st ON st.id = b.showtime_id
         WHERE b.id = $1
         FOR UPDATE;`,
        [bookingId]
      );

      if (bookingRes.rows.length === 0) {
        throw { status: 404, message: 'Booking not found' };
      }

      const booking = bookingRes.rows[0];

      // 2. Authorization check
      if (booking.user_id !== session.id && session.role !== 'ADMIN') {
        throw { status: 403, message: 'Forbidden: You cannot cancel another user’s booking' };
      }

      // 3. Status check
      if (booking.status === 'CANCELLED' || booking.status === 'REFUNDED') {
        throw { status: 400, message: 'This booking has already been cancelled.' };
      }

      if (booking.status === 'EXPIRED') {
        throw { status: 400, message: 'This booking has expired.' };
      }

      // 4. Timing eligibility check: cannot cancel after showtime start
      const showtimeStart = new Date(booking.start_time).getTime();
      if (Date.now() >= showtimeStart) {
        throw {
          status: 400,
          message: 'Bookings cannot be cancelled after the showtime has started.',
        };
      }

      const newStatus = booking.status === 'CONFIRMED' ? 'REFUNDED' : 'CANCELLED';

      // 5. Update booking status
      await tx.query(
        `UPDATE bookings
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [newStatus, bookingId]
      );

      // 6. Release all held or booked showtime_seats back to AVAILABLE
      const releasedSeats = await tx.query(
        `UPDATE showtime_seats
         SET 
           status = 'AVAILABLE',
           hold_expires_at = NULL,
           held_by_user_id = NULL,
           booking_id = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = $1
         RETURNING id, seat_id;`,
        [bookingId]
      );

      // 7. Update payment status to REFUNDED if applicable
      await tx.query(
        `UPDATE payments
         SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = $1 AND status = 'SUCCEEDED';`,
        [bookingId]
      );

      // 8. Log audit trail
      await tx.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, metadata)
         VALUES ('BOOKING', $1, 'BOOKING_CANCELLED', $2, $3::jsonb);`,
        [
          bookingId,
          session.id,
          JSON.stringify({
            previousStatus: booking.status,
            newStatus,
            releasedSeatsCount: releasedSeats.rows.length,
            refundedCents: booking.total_cents,
          }),
        ]
      );

      return {
        bookingId,
        reference: booking.reference,
        status: newStatus,
        refundedCents: booking.total_cents,
        seatsReleased: releasedSeats.rows.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully. Your seats have been released and refund processed.',
      ...result,
    });
  } catch (error: any) {
    if (error.status && error.message) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking. Please try again.' },
      { status: 500 }
    );
  }
}
