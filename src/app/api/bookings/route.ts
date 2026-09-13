import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getSessionFromRequest } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required to view booking history' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const viewAll = searchParams.get('all') === 'true' && session.role === 'ADMIN';

    const db = await getDb();

    let query = `
      SELECT 
        b.id,
        b.reference,
        b.user_id,
        b.status,
        b.subtotal_cents,
        b.fee_cents,
        b.tax_cents,
        b.total_cents,
        b.created_at,
        b.expires_at,
        m.id as movie_id,
        m.title as movie_title,
        m.poster_url as movie_poster_url,
        m.duration_mins,
        m.age_rating,
        st.id as showtime_id,
        st.start_time,
        st.end_time,
        st.format,
        a.name as auditorium_name,
        c.name as cinema_name,
        c.address as cinema_address,
        t.ticket_number,
        t.id as ticket_id,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'row', bi.seat_row,
              'number', bi.seat_number,
              'tier', bi.seat_tier,
              'priceCents', bi.price_cents
            )
          ) FILTER (WHERE bi.id IS NOT NULL), '[]'
        ) as seats
      FROM bookings b
      JOIN showtimes st ON st.id = b.showtime_id
      JOIN movies m ON m.id = st.movie_id
      JOIN auditoriums a ON a.id = st.auditorium_id
      JOIN cinemas c ON c.id = a.cinema_id
      LEFT JOIN booking_items bi ON bi.booking_id = b.id
      LEFT JOIN tickets t ON t.booking_id = b.id
    `;

    const params: any[] = [];
    if (!viewAll) {
      query += ` WHERE b.user_id = $1`;
      params.push(session.id);
    }

    query += `
      GROUP BY b.id, m.id, st.id, a.id, c.id, t.id
      ORDER BY b.created_at DESC;
    `;

    const result = await db.query(query, params);

    const bookings = result.rows.map((b) => ({
      ...b,
      seats: typeof b.seats === 'string' ? JSON.parse(b.seats) : b.seats,
      seat_labels: (typeof b.seats === 'string' ? JSON.parse(b.seats) : b.seats)
        .map((s: any) => `${s.row}${s.number}`)
        .join(', '),
      is_eligible_for_cancel:
        b.status === 'CONFIRMED' && new Date(b.start_time).getTime() > Date.now(),
    }));

    return NextResponse.json({ success: true, bookings });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}
