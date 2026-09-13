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
    const result = await db.query(`
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
      LIMIT 100;
    `);

    return NextResponse.json({ success: true, auditLogs: result.rows });
  } catch (error: any) {
    console.error('Audit logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
