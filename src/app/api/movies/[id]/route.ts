import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    // Check if id is UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const movieRes = await db.query(
      `SELECT 
        m.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', g.id, 'name', g.name, 'slug', g.slug)) 
          FILTER (WHERE g.id IS NOT NULL), '[]'
        ) as genres
       FROM movies m
       LEFT JOIN movie_genres mg ON mg.movie_id = m.id
       LEFT JOIN genres g ON g.id = mg.genre_id
       WHERE ${isUuid ? 'm.id = $1' : 'm.slug = $1'}
       GROUP BY m.id;`,
      [id]
    );

    if (movieRes.rows.length === 0) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const movie = movieRes.rows[0];
    movie.genres = typeof movie.genres === 'string' ? JSON.parse(movie.genres) : movie.genres;

    // Fetch showtimes with seat counts
    const showtimesRes = await db.query(
      `SELECT 
        st.id,
        st.movie_id,
        st.auditorium_id,
        st.start_time,
        st.end_time,
        st.base_price_cents,
        st.format,
        st.status,
        a.name as auditorium_name,
        a.screen_type,
        a.total_seats,
        c.id as cinema_id,
        c.name as cinema_name,
        c.city as cinema_city,
        c.address as cinema_address,
        COUNT(ss.id) FILTER (WHERE ss.status = 'AVAILABLE' OR (ss.status = 'HELD' AND ss.hold_expires_at < NOW())) as available_seats
       FROM showtimes st
       JOIN auditoriums a ON a.id = st.auditorium_id
       JOIN cinemas c ON c.id = a.cinema_id
       LEFT JOIN showtime_seats ss ON ss.showtime_id = st.id
       WHERE st.movie_id = $1 AND st.start_time >= NOW() - INTERVAL '2 hours'
       GROUP BY st.id, a.id, c.id
       ORDER BY st.start_time ASC;`,
      [movie.id]
    );

    const showtimes = showtimesRes.rows.map((row) => ({
      ...row,
      available_seats: parseInt(row.available_seats || '0', 10),
      total_seats: parseInt(row.total_seats || '0', 10),
    }));

    return NextResponse.json({
      success: true,
      movie,
      showtimes,
    });
  } catch (error: any) {
    console.error('Error fetching movie details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie details' },
      { status: 500 }
    );
  }
}
