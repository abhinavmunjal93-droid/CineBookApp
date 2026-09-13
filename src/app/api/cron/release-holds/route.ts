import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db/client';

async function handleReleaseHolds(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    const queryKey = req.nextUrl.searchParams.get('key');
    const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron');

    // Protect endpoint if CRON_SECRET is set
    if (cronSecret && cronSecret.trim() !== '') {
      const authorized =
        authHeader === `Bearer ${cronSecret}` ||
        queryKey === cronSecret ||
        isVercelCron;

      if (!authorized) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or missing CRON_SECRET' },
          { status: 401 }
        );
      }
    }

    const result = await withTransaction(async (tx) => {
      // 1. Release expired HELD seats back to AVAILABLE
      const releasedSeats = await tx.query(`
        UPDATE showtime_seats
        SET 
          status = 'AVAILABLE',
          hold_expires_at = NULL,
          held_by_user_id = NULL,
          booking_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE status = 'HELD' AND hold_expires_at < NOW()
        RETURNING id, showtime_id, seat_id;
      `);

      // 2. Mark pending bookings whose holds expired as EXPIRED
      const expiredBookings = await tx.query(`
        UPDATE bookings
        SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'PENDING' AND expires_at < NOW()
        RETURNING id, reference;
      `);

      // 3. Log audit entry if changes occurred
      if (releasedSeats.rows.length > 0 || expiredBookings.rows.length > 0) {
        await tx.query(
          `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, metadata)
           VALUES ('SYSTEM', '00000000-0000-0000-0000-000000000000'::uuid, 'CRON_RELEASE_HOLDS', NULL, $1::jsonb);`,
          [
            JSON.stringify({
              releasedSeatsCount: releasedSeats.rows.length,
              expiredBookingsCount: expiredBookings.rows.length,
              timestamp: new Date().toISOString(),
            }),
          ]
        );
      }

      return {
        releasedSeatsCount: releasedSeats.rows.length,
        expiredBookingsCount: expiredBookings.rows.length,
      };
    });

    return NextResponse.json({
      success: true,
      idempotent: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cron release-holds error:', error);
    return NextResponse.json(
      { error: 'Internal server error releasing expired holds' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleReleaseHolds(req);
}

export async function POST(req: NextRequest) {
  return handleReleaseHolds(req);
}
