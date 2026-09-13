import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getSessionFromRequest } from '@/lib/auth/jwt';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    const db = await getDb();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const ticketRes = await db.query(
      `SELECT 
        t.*,
        b.reference as booking_reference,
        b.user_id,
        b.status as booking_status,
        b.total_cents,
        m.title as movie_title,
        m.poster_url as movie_poster_url,
        m.backdrop_url as movie_backdrop_url,
        m.duration_mins,
        m.age_rating,
        st.start_time,
        st.end_time,
        st.format,
        a.name as auditorium_name,
        a.screen_type,
        c.name as cinema_name,
        c.address as cinema_address,
        c.city as cinema_city,
        u.full_name as customer_name,
        u.email as customer_email
       FROM tickets t
       JOIN bookings b ON b.id = t.booking_id
       JOIN users u ON u.id = b.user_id
       JOIN showtimes st ON st.id = b.showtime_id
       JOIN movies m ON m.id = st.movie_id
       JOIN auditoriums a ON a.id = st.auditorium_id
       JOIN cinemas c ON c.id = a.cinema_id
       WHERE ${isUuid ? 't.id = $1 OR b.id = $1' : 't.ticket_number = $1 OR b.reference = $1'};`,
      [id]
    );

    if (ticketRes.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket = ticketRes.rows[0];

    // Check authorization: must be ticket holder or admin
    if (session && session.role !== 'ADMIN' && ticket.user_id !== session.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access this ticket' },
        { status: 403 }
      );
    }

    // Fetch seats
    const seatsRes = await db.query(
      `SELECT seat_row, seat_number, seat_tier, price_cents
       FROM booking_items
       WHERE booking_id = $1
       ORDER BY seat_row ASC, seat_number ASC;`,
      [ticket.booking_id]
    );

    return NextResponse.json({
      success: true,
      ticket: {
        ...ticket,
        seats: seatsRes.rows,
        seat_labels: seatsRes.rows.map((s) => `${s.seat_row}${s.seat_number}`).join(', '),
      },
    });
  } catch (error: any) {
    console.error('Ticket fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
  }
}
