import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db/client';
import { getSessionFromRequest } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to hold seats.' },
        { status: 401 }
      );
    }

    const { showtimeId, seatIds } = await req.json();

    if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: showtimeId and at least one seatId are required' },
        { status: 400 }
      );
    }

    if (seatIds.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 seats can be reserved per booking' },
        { status: 400 }
      );
    }

    // Execute atomic booking transaction with row locks
    const result = await withTransaction(async (tx) => {
      // 1. Lock requested showtime-seat rows using SELECT ... FOR UPDATE
      const lockedSeatsRes = await tx.query(
        `SELECT 
          ss.id as showtime_seat_id,
          ss.seat_id,
          ss.status,
          ss.hold_expires_at,
          ss.held_by_user_id,
          ss.price_cents,
          s.row,
          s.number,
          s.tier
         FROM showtime_seats ss
         JOIN seats s ON s.id = ss.seat_id
         WHERE ss.showtime_id = $1 AND ss.seat_id = ANY($2::uuid[])
         FOR UPDATE;`,
        [showtimeId, seatIds]
      );

      if (lockedSeatsRes.rows.length !== seatIds.length) {
        throw {
          status: 400,
          message: 'Some requested seats do not exist for this showtime',
        };
      }

      const now = Date.now();

      // 2. Confirm every requested seat is available
      for (const seat of lockedSeatsRes.rows) {
        const isExpired = seat.hold_expires_at && new Date(seat.hold_expires_at).getTime() < now;
        const isHeldBySameUser = seat.status === 'HELD' && seat.held_by_user_id === session.id;
        const isAvailable = seat.status === 'AVAILABLE' || isExpired || isHeldBySameUser;

        if (!isAvailable) {
          throw {
            status: 409,
            message: `Seat ${seat.row}${seat.number} is no longer available (currently ${seat.status.toLowerCase()}).`,
          };
        }
      }

      // 3. Create a temporary seat hold with an expiration time (10 minutes)
      const holdDurationMinutes = 10;
      const expiresAt = new Date(now + holdDurationMinutes * 60 * 1000);

      await tx.query(
        `UPDATE showtime_seats
         SET 
           status = 'HELD',
           hold_expires_at = $1,
           held_by_user_id = $2
         WHERE showtime_id = $3 AND seat_id = ANY($4::uuid[]);`,
        [expiresAt.toISOString(), session.id, showtimeId, seatIds]
      );

      // 4. Calculate price on the server (integer minor units / cents)
      const subtotalCents = lockedSeatsRes.rows.reduce((sum, s) => sum + s.price_cents, 0);
      const feeCentsPerTicket = 150; // $1.50 convenience fee per ticket
      const feeCents = feeCentsPerTicket * seatIds.length;
      const taxRate = 0.08; // 8% sales tax
      const taxCents = Math.round(subtotalCents * taxRate);
      const totalCents = subtotalCents + feeCents + taxCents;

      // 5. Generate human-readable unique booking reference
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const timestampSuffix = (now % 100000).toString().padStart(5, '0');
      const reference = `CNB-${timestampSuffix}-${randomSuffix}`;

      // 6. Create the pending booking
      const bookingRes = await tx.query(
        `INSERT INTO bookings (
           reference,
           user_id,
           showtime_id,
           status,
           subtotal_cents,
           fee_cents,
           tax_cents,
           total_cents,
           expires_at
         )
         VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8)
         RETURNING id;`,
        [
          reference,
          session.id,
          showtimeId,
          subtotalCents,
          feeCents,
          taxCents,
          totalCents,
          expiresAt.toISOString(),
        ]
      );

      const bookingId = bookingRes.rows[0].id;

      // Update showtime_seats with the pending booking_id
      await tx.query(
        `UPDATE showtime_seats SET booking_id = $1 WHERE showtime_id = $2 AND seat_id = ANY($3::uuid[]);`,
        [bookingId, showtimeId, seatIds]
      );

      // 7. Insert booking items
      for (const s of lockedSeatsRes.rows) {
        await tx.query(
          `INSERT INTO booking_items (
             booking_id,
             showtime_seat_id,
             seat_id,
             seat_row,
             seat_number,
             seat_tier,
             price_cents
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [bookingId, s.showtime_seat_id, s.seat_id, s.row, s.number, s.tier, s.price_cents]
        );
      }

      // Log audit trail
      await tx.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, metadata)
         VALUES ('BOOKING', $1, 'SEATS_HELD', $2, $3::jsonb);`,
        [
          bookingId,
          session.id,
          JSON.stringify({
            reference,
            seats: lockedSeatsRes.rows.map((s) => `${s.row}${s.number}`),
            totalCents,
            expiresAt: expiresAt.toISOString(),
          }),
        ]
      );

      return {
        bookingId,
        reference,
        seats: lockedSeatsRes.rows.map((s) => ({
          seatId: s.seat_id,
          row: s.row,
          number: s.number,
          tier: s.tier,
          priceCents: s.price_cents,
        })),
        pricing: {
          subtotalCents,
          feeCents,
          taxCents,
          totalCents,
        },
        expiresAt: expiresAt.toISOString(),
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
    console.error('Hold seats transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to hold seats. Please try again.' },
      { status: 500 }
    );
  }
}
