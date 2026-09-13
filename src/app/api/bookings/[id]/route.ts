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
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = await getDb();

    // Fetch booking
    const bookingRes = await db.query(
      `SELECT 
        b.*,
        m.id as movie_id,
        m.title as movie_title,
        m.poster_url as movie_poster_url,
        m.backdrop_url as movie_backdrop_url,
        m.duration_mins,
        m.age_rating,
        st.id as showtime_id,
        st.start_time,
        st.end_time,
        st.format,
        a.id as auditorium_id,
        a.name as auditorium_name,
        a.screen_type,
        c.id as cinema_id,
        c.name as cinema_name,
        c.address as cinema_address,
        c.city as cinema_city,
        u.email as customer_email,
        u.full_name as customer_name
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN showtimes st ON st.id = b.showtime_id
       JOIN movies m ON m.id = st.movie_id
       JOIN auditoriums a ON a.id = st.auditorium_id
       JOIN cinemas c ON c.id = a.cinema_id
       WHERE b.id = $1 OR b.reference = $1;`,
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingRes.rows[0];

    // Authorization check: User cannot view another user's booking unless Admin
    if (booking.user_id !== session.id && session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this booking' },
        { status: 403 }
      );
    }

    // Fetch seats/items
    const itemsRes = await db.query(
      `SELECT 
        bi.id,
        bi.seat_id,
        bi.showtime_seat_id,
        bi.seat_row,
        bi.seat_number,
        bi.seat_tier,
        bi.price_cents
       FROM booking_items bi
       WHERE bi.booking_id = $1
       ORDER BY bi.seat_row ASC, bi.seat_number ASC;`,
      [booking.id]
    );

    // Fetch tickets
    const ticketRes = await db.query(
      `SELECT * FROM tickets WHERE booking_id = $1;`,
      [booking.id]
    );

    // Fetch payments
    const paymentRes = await db.query(
      `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC;`,
      [booking.id]
    );

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        seats: itemsRes.rows,
        seat_labels: itemsRes.rows.map((s) => `${s.seat_row}${s.seat_number}`).join(', '),
        tickets: ticketRes.rows,
        payments: paymentRes.rows,
      },
    });
  } catch (error: any) {
    console.error('Error fetching booking details:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}
