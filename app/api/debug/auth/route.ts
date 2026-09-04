import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Try both cookie names
    let token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: '__Secure-next-auth.session-token'
    });

    let cookieUsed = '__Secure-next-auth.session-token';

    if (!token) {
      token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: 'next-auth.session-token'
      });
      cookieUsed = 'next-auth.session-token';
    }

    const cookies = req.cookies.getAll();
    const headers = Object.fromEntries(req.headers.entries());
    const url = new URL(req.url);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      debug: {
        environment: process.env.NODE_ENV,
        requestInfo: {
          url: url.toString(),
          host: headers.host,
          protocol: url.protocol,
          pathname: url.pathname,
        },
        authentication: {
          hasToken: !!token,
          cookieUsed: token ? cookieUsed : 'none',
          tokenData: token ? {
            sub: token.sub,
            email: token.email,
            name: token.name,
            role: (token as any).role,
            profileImage: (token as any).profileImage,
            exp: token.exp,
            iat: token.iat,
            expiresAt: token.exp ? new Date(token.exp * 1000).toISOString() : null,
            issuedAt: token.iat ? new Date(token.iat * 1000).toISOString() : null,
          } : null,
        },
        cookies: {
          total: cookies.length,
          authRelated: cookies.filter(c => c.name.includes('next-auth')).map(c => ({
            name: c.name,
            hasValue: !!c.value,
            valueLength: c.value?.length || 0,
          })),
          allCookies: cookies.map(c => ({
            name: c.name,
            hasValue: !!c.value,
            valueLength: c.value?.length || 0
          }))
        },
        configuration: {
          nextAuthUrl: process.env.NEXTAUTH_URL,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
          secretLength: process.env.NEXTAUTH_SECRET?.length || 0,
          nodeEnv: process.env.NODE_ENV,
        },
        headers: {
          host: headers.host,
          'x-forwarded-proto': headers['x-forwarded-proto'],
          'x-forwarded-host': headers['x-forwarded-host'],
          'x-forwarded-for': headers['x-forwarded-for'],
          'user-agent': headers['user-agent'],
          origin: headers.origin,
          referer: headers.referer,
        },
        recommendations: []
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      debug: {
        environment: process.env.NODE_ENV,
        configuration: {
          nextAuthUrl: process.env.NEXTAUTH_URL,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
          secretLength: process.env.NEXTAUTH_SECRET?.length || 0,
        },
        errorDetails: {
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }
      }
    }, { status: 500 });
  }
}
