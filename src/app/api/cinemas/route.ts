import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT a.id) as auditorium_count,
        COUNT(DISTINCT st.id) as upcoming_showtimes_count,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', a.id,
              'name', a.name,
              'screen_type', a.screen_type,
              'total_seats', a.total_seats
            )
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) as auditoriums
      FROM cinemas c
      LEFT JOIN auditoriums a ON a.cinema_id = c.id
      LEFT JOIN showtimes st ON st.auditorium_id = a.id AND st.start_time >= NOW()
      GROUP BY c.id
      ORDER BY c.name ASC;
    `);

    const cinemas = result.rows.map((c) => ({
      ...c,
      amenities: typeof c.amenities === 'string' ? JSON.parse(c.amenities) : c.amenities,
      auditoriums: typeof c.auditoriums === 'string' ? JSON.parse(c.auditoriums) : c.auditoriums,
      auditorium_count: parseInt(c.auditorium_count || '0', 10),
      upcoming_showtimes_count: parseInt(c.upcoming_showtimes_count || '0', 10),
    }));

    return NextResponse.json({ success: true, cinemas });
  } catch (error: any) {
    console.error('Error fetching cinemas:', error);
    return NextResponse.json({ error: 'Failed to fetch cinemas' }, { status: 500 });
  }
}
