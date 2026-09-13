import { NextRequest, NextResponse } from 'next/server';
import { getDb, withTransaction } from '@/lib/db/client';
import { getSessionFromRequest } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { movieId, auditoriumId, startTime, endTime, basePriceCents, format } =
      await req.json();

    if (!movieId || !auditoriumId || !startTime || !basePriceCents) {
      return NextResponse.json({ error: 'Missing required showtime fields' }, { status: 400 });
    }

    const showtime = await withTransaction(async (tx) => {
      // 1. Insert showtime
      const stRes = await tx.query(
        `INSERT INTO showtimes (
           movie_id,
           auditorium_id,
           start_time,
           end_time,
           base_price_cents,
           format,
           status
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED')
         RETURNING *;`,
        [
          movieId,
          auditoriumId,
          startTime,
          endTime || startTime,
          parseInt(basePriceCents, 10),
          format || 'STANDARD',
        ]
      );

      const newShowtime = stRes.rows[0];

      // 2. Fetch seats for auditorium and populate showtime_seats
      const seatsRes = await tx.query(
        `SELECT id, tier FROM seats WHERE auditorium_id = $1;`,
        [auditoriumId]
      );

      for (const seat of seatsRes.rows) {
        let tierPremium = 0;
        if (seat.tier === 'VIP') tierPremium = 600;
        else if (seat.tier === 'PREMIUM') tierPremium = 300;

        const priceCents = parseInt(basePriceCents, 10) + tierPremium;

        await tx.query(
          `INSERT INTO showtime_seats (showtime_id, seat_id, status, price_cents)
           VALUES ($1, $2, 'AVAILABLE', $3)
           ON CONFLICT (showtime_id, seat_id) DO NOTHING;`,
          [newShowtime.id, seat.id, priceCents]
        );
      }

      // 3. Audit log
      await tx.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, metadata)
         VALUES ('SHOWTIME', $1, 'SHOWTIME_SCHEDULED', $2, $3::jsonb);`,
        [
          newShowtime.id,
          session.id,
          JSON.stringify({
            movieId,
            auditoriumId,
            startTime,
            totalSeats: seatsRes.rows.length,
          }),
        ]
      );

      return newShowtime;
    });

    return NextResponse.json({ success: true, showtime });
  } catch (error: any) {
    console.error('Admin create showtime error:', error);
    return NextResponse.json({ error: 'Failed to schedule showtime' }, { status: 500 });
  }
}
