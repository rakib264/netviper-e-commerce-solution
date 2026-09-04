import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin')) {
    try {
      // Try both cookie names to ensure compatibility
      let token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: '__Secure-next-auth.session-token'
      });

      // Fallback to non-secure cookie name if secure one doesn't exist
      if (!token) {
        token = await getToken({
          req,
          secret: process.env.NEXTAUTH_SECRET,
          cookieName: 'next-auth.session-token'
        });
      }

      // Enhanced debug logging for production
      if (process.env.NODE_ENV === 'production') {
        console.log('Middleware Debug:', {
          pathname,
          hasToken: !!token,
          tokenRole: token ? (token as any).role : 'no-token',
          tokenSub: token ? token.sub : 'no-sub',
          cookies: req.cookies.getAll().map(c => ({
            name: c.name,
            hasValue: !!c.value,
            valueLength: c.value?.length || 0
          })),
          headers: {
            host: req.headers.get('host'),
            'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
            'x-forwarded-host': req.headers.get('x-forwarded-host'),
          }
        });
      }

      if (!token || ((token as any).role !== 'admin' && (token as any).role !== 'manager')) {
        const signInUrl = new URL('/auth/signin', req.nextUrl);
        signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(signInUrl);
      }
    } catch (error) {
      console.error('Middleware auth error:', error);
      const signInUrl = new URL('/auth/signin', req.nextUrl);
      signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
  // Exclude API routes from middleware - this is important to prevent infinite redirects
  exclude: ['/api/:path*']
};
