import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/jwt';
import { getDb } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const db = await getDb();
  const userRes = await db.query(
    `SELECT id, email, full_name, role, created_at FROM users WHERE id = $1;`,
    [session.id]
  );

  if (userRes.rows.length === 0) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const user = userRes.rows[0];

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      createdAt: user.created_at,
    },
  });
}
