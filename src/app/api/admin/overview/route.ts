import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getSessionFromRequest } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const db = await getDb();

    // 1. Revenue & Bookings stats
    const statsRes = await db.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED') as confirmed_bookings,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_bookings,
        COUNT(*) FILTER (WHERE status = 'CANCELLED' OR status = 'REFUNDED') as cancelled_bookings,
        COALESCE(SUM(total_cents) FILTER (WHERE status = 'CONFIRMED'), 0) as total_revenue_cents
      FROM bookings;
    `);

    // 2. Count movies, showtimes, users
    const countsRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM movies) as total_movies,
        (SELECT COUNT(*) FROM showtimes WHERE start_time >= NOW()) as active_showtimes,
        (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER') as total_customers,
        (SELECT COUNT(*) FROM auditoriums) as total_screens;
    `);

    // 3. Recent 8 bookings
    const recentBookingsRes = await db.query(`
      SELECT 
        b.id,
        b.reference,
        b.status,
        b.total_cents,
        b.created_at,
        u.email as customer_email,
        u.full_name as customer_name,
        m.title as movie_title,
        st.format,
        c.name as cinema_name
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN showtimes st ON st.id = b.showtime_id
      JOIN movies m ON m.id = st.movie_id
      JOIN auditoriums a ON a.id = st.auditorium_id
      JOIN cinemas c ON c.id = a.cinema_id
      ORDER BY b.created_at DESC
      LIMIT 8;
    `);

    // 4. Recent audit logs
    const auditRes = await db.query(`
      SELECT 
        al.id,
        al.entity_type,
        al.entity_id,
        al.action,
        al.metadata,
        al.created_at,
        u.email as actor_email,
        u.full_name as actor_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_id
      ORDER BY al.created_at DESC
      LIMIT 8;
    `);

    return NextResponse.json({
      success: true,
      stats: {
        totalBookings: parseInt(statsRes.rows[0].total_bookings || '0', 10),
        confirmedBookings: parseInt(statsRes.rows[0].confirmed_bookings || '0', 10),
        pendingBookings: parseInt(statsRes.rows[0].pending_bookings || '0', 10),
        cancelledBookings: parseInt(statsRes.rows[0].cancelled_bookings || '0', 10),
        totalRevenueCents: parseInt(statsRes.rows[0].total_revenue_cents || '0', 10),
        totalMovies: parseInt(countsRes.rows[0].total_movies || '0', 10),
        activeShowtimes: parseInt(countsRes.rows[0].active_showtimes || '0', 10),
        totalCustomers: parseInt(countsRes.rows[0].total_customers || '0', 10),
        totalScreens: parseInt(countsRes.rows[0].total_screens || '0', 10),
      },
      recentBookings: recentBookingsRes.rows,
      recentAuditLogs: auditRes.rows,
    });
  } catch (error: any) {
    console.error('Admin overview error:', error);
    return NextResponse.json({ error: 'Failed to load admin overview' }, { status: 500 });
  }
}
