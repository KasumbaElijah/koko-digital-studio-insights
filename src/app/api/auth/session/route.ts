import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  TEAM_SESSION_COOKIE,
  authenticateTeamUser,
  createSessionToken,
  verifySessionToken,
} from '@/lib/teamAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TEAM_SESSION_COOKIE)?.value;
    const user = verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, email, password } = body;
    const loginId = (identifier || email || '').trim();

    if (!loginId || !password) {
      return NextResponse.json(
        { success: false, error: 'Please enter your team email/username and password.' },
        { status: 400 }
      );
    }

    const user = authenticateTeamUser(loginId, String(password));
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials. Public sign-ups are disabled — contact Management for an invite.',
        },
        { status: 401 }
      );
    }

    const sessionToken = createSessionToken(user);
    const res = NextResponse.json({
      success: true,
      authenticated: true,
      user,
    });

    // Set 30-day persistent HttpOnly cookie so team members stay logged in across page refreshes and browser restarts
    res.cookies.set(TEAM_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, authenticated: false });
  res.cookies.set(TEAM_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
