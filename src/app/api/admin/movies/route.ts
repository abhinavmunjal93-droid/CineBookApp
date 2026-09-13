import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getSessionFromRequest } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const {
      title,
      synopsis,
      posterUrl,
      backdropUrl,
      trailerUrl,
      durationMins,
      releaseDate,
      ageRating,
      language,
      status,
      genreIds,
    } = await req.json();

    if (!title || !synopsis || !posterUrl || !durationMins || !releaseDate) {
      return NextResponse.json({ error: 'Missing required movie fields' }, { status: 400 });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const db = await getDb();

    const movieRes = await db.query(
      `INSERT INTO movies (
         title,
         slug,
         synopsis,
         poster_url,
         backdrop_url,
         trailer_url,
         duration_mins,
         release_date,
         age_rating,
         language,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *;`,
      [
        title,
        slug,
        synopsis,
        posterUrl,
        backdropUrl || posterUrl,
        trailerUrl || '',
        parseInt(durationMins, 10),
        releaseDate,
        ageRating || 'PG-13',
        language || 'English',
        status || 'NOW_SHOWING',
      ]
    );

    const movie = movieRes.rows[0];

    if (Array.isArray(genreIds)) {
      for (const gId of genreIds) {
        await db.query(
          `INSERT INTO movie_genres (movie_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [movie.id, gId]
        );
      }
    }

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, metadata)
       VALUES ('MOVIE', $1, 'MOVIE_CREATED', $2, $3::jsonb);`,
      [movie.id, session.id, JSON.stringify({ title, slug })]
    );

    return NextResponse.json({ success: true, movie });
  } catch (error: any) {
    console.error('Admin create movie error:', error);
    return NextResponse.json({ error: 'Failed to create movie' }, { status: 500 });
  }
}
