import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const result = await db.query(
      `SELECT 
        st.id,
        st.movie_id,
        st.auditorium_id,
        st.start_time,
        st.end_time,
        st.base_price_cents,
        st.format,
        st.status,
        m.title as movie_title,
        m.poster_url as movie_poster_url,
        m.duration_mins,
        m.age_rating,
        m.language,
        a.name as auditorium_name,
        a.screen_type,
        a.total_seats,
        c.id as cinema_id,
        c.name as cinema_name,
        c.address as cinema_address,
        c.city as cinema_city
       FROM showtimes st
       JOIN movies m ON m.id = st.movie_id
       JOIN auditoriums a ON a.id = st.auditorium_id
       JOIN cinemas c ON c.id = a.cinema_id
       WHERE st.id = $1;`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Showtime not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, showtime: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching showtime:', error);
    return NextResponse.json({ error: 'Failed to fetch showtime' }, { status: 500 });
  }
}
