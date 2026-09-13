import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const genre = searchParams.get('genre')?.trim() || '';
    const language = searchParams.get('language')?.trim() || '';
    const cinemaId = searchParams.get('cinema')?.trim() || '';
    const date = searchParams.get('date')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';

    const db = await getDb();

    let query = `
      SELECT 
        m.id,
        m.title,
        m.slug,
        m.synopsis,
        m.poster_url,
        m.backdrop_url,
        m.duration_mins,
        m.release_date,
        m.age_rating,
        m.language,
        m.rating_score,
        m.status,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', g.id, 'name', g.name, 'slug', g.slug)) 
          FILTER (WHERE g.id IS NOT NULL), '[]'
        ) as genres,
        COUNT(DISTINCT st.id) as showtimes_count
      FROM movies m
      LEFT JOIN movie_genres mg ON mg.movie_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      LEFT JOIN showtimes st ON st.movie_id = m.id AND st.status = 'SCHEDULED'
      LEFT JOIN auditoriums a ON a.id = st.auditorium_id
      LEFT JOIN cinemas c ON c.id = a.cinema_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      query += ` AND (m.title ILIKE $${paramIdx} OR m.synopsis ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (genre) {
      query += ` AND m.id IN (
        SELECT mg2.movie_id FROM movie_genres mg2 
        JOIN genres g2 ON g2.id = mg2.genre_id 
        WHERE LOWER(g2.slug) = LOWER($${paramIdx}) OR LOWER(g2.name) = LOWER($${paramIdx})
      )`;
      params.push(genre);
      paramIdx++;
    }

    if (language) {
      query += ` AND LOWER(m.language) = LOWER($${paramIdx})`;
      params.push(language);
      paramIdx++;
    }

    if (status) {
      query += ` AND m.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    if (cinemaId) {
      query += ` AND c.id = $${paramIdx}`;
      params.push(cinemaId);
      paramIdx++;
    }

    if (date) {
      query += ` AND DATE(st.start_time) = $${paramIdx}`;
      params.push(date);
      paramIdx++;
    }

    query += `
      GROUP BY m.id
      ORDER BY 
        CASE WHEN m.status = 'NOW_SHOWING' THEN 1 ELSE 2 END,
        m.rating_score DESC,
        m.release_date DESC;
    `;

    const result = await db.query(query, params);

    // Parse json genres properly
    const movies = result.rows.map((row) => ({
      ...row,
      genres: typeof row.genres === 'string' ? JSON.parse(row.genres) : row.genres,
      showtimes_count: parseInt(row.showtimes_count || '0', 10),
    }));

    return NextResponse.json({ success: true, movies });
  } catch (error: any) {
    console.error('Error fetching movies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 }
    );
  }
}
