import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getSessionFromRequest } from '@/lib/auth/jwt';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showtimeId } = await params;
    const session = await getSessionFromRequest(req);
    const db = await getDb();

    // 1. Fetch showtime and auditorium info
    const stRes = await db.query(
      `SELECT 
        st.id,
        st.movie_id,
        st.auditorium_id,
        st.start_time,
        st.base_price_cents,
        st.format,
        m.title as movie_title,
        a.name as auditorium_name,
        a.screen_type,
        c.name as cinema_name
       FROM showtimes st
       JOIN movies m ON m.id = st.movie_id
       JOIN auditoriums a ON a.id = st.auditorium_id
       JOIN cinemas c ON c.id = a.cinema_id
       WHERE st.id = $1;`,
      [showtimeId]
    );

    if (stRes.rows.length === 0) {
      return NextResponse.json({ error: 'Showtime not found' }, { status: 404 });
    }

    const showtime = stRes.rows[0];

    // 2. Fetch seats joined with showtime_seats inventory
    // Automatically release expired holds on the fly
    await db.query(
      `UPDATE showtime_seats
       SET status = 'AVAILABLE', hold_expires_at = NULL, held_by_user_id = NULL
       WHERE showtime_id = $1 AND status = 'HELD' AND hold_expires_at < NOW();`,
      [showtimeId]
    );

    const seatsRes = await db.query(
      `SELECT 
        s.id as seat_id,
        s.row,
        s.number,
        s.tier,
        ss.id as showtime_seat_id,
        ss.status,
        ss.price_cents,
        ss.hold_expires_at,
        ss.held_by_user_id
       FROM seats s
       JOIN showtime_seats ss ON ss.seat_id = s.id AND ss.showtime_id = $1
       WHERE s.auditorium_id = $2
       ORDER BY s.row ASC, s.number ASC;`,
      [showtimeId, showtime.auditorium_id]
    );

    const rowsMap = new Map<string, any[]>();
    for (const seat of seatsRes.rows) {
      if (!rowsMap.has(seat.row)) {
        rowsMap.set(seat.row, []);
      }

      // Check if held by the current user
      const isHeldByMe = session && seat.status === 'HELD' && seat.held_by_user_id === session.id;

      rowsMap.get(seat.row)!.push({
        seatId: seat.seat_id,
        showtimeSeatId: seat.showtime_seat_id,
        row: seat.row,
        number: seat.number,
        tier: seat.tier,
        status: isHeldByMe ? 'SELECTED_BY_ME' : seat.status,
        priceCents: seat.price_cents,
        holdExpiresAt: seat.hold_expires_at,
        isHeldByMe: Boolean(isHeldByMe),
      });
    }

    const rows = Array.from(rowsMap.entries()).map(([rowLetter, seats]) => ({
      row: rowLetter,
      seats,
    }));

    return NextResponse.json({
      success: true,
      showtime,
      rows,
      totalSeats: seatsRes.rows.length,
      availableCount: seatsRes.rows.filter((s) => s.status === 'AVAILABLE').length,
    });
  } catch (error: any) {
    console.error('Error fetching showtime seats:', error);
    return NextResponse.json({ error: 'Failed to fetch seats' }, { status: 500 });
  }
}
