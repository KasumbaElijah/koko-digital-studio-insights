import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TEAM_SESSION_COOKIE = 'koko_team_session';

function parseSessionCookieEdge(token?: string): { id: string; role: string; exp?: number } | null {
  if (!token || !token.includes('.')) return null;
  try {
    const [dataB64] = token.split('.');
    if (!dataB64) return null;
    // Decode base64url in Edge runtime
    const base64 = dataB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const jsonStr = atob(padded);
    const payload = JSON.parse(jsonStr);
    if (!payload || !payload.id) return null;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth page, privacy policy, static assets, and API routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/logos/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TEAM_SESSION_COOKIE)?.value;
  const session = parseSessionCookieEdge(token);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Restrict /settings (OAuth Integrations & Team Admin) to Management (ADMIN) only
  if (pathname.startsWith('/settings') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
