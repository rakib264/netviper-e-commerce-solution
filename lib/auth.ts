import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import FacebookProvider from 'next-auth/providers/facebook';
import GoogleProvider from 'next-auth/providers/google';
import { cookies } from 'next/headers';
import { notifyAdminNewCustomer, notifyCustomerWelcome } from './notifications/events';
import User from './models/User';
import connectDB from './mongodb';

// NextAuth v5 setup compatible with Next.js 15 (async headers/cookies)
export const {
  auth,
  handlers: { GET, POST },
  signIn,
  signOut,
} = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password as string);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          profileImage: user.profileImage,
        } as any;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  // Remove hardcoded cookie domain - let NextAuth handle it automatically
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Remove hardcoded domain - NextAuth will set it automatically based on NEXTAUTH_URL
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? `__Secure-next-auth.callback-url`
        : `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Remove hardcoded domain
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? `__Host-next-auth.csrf-token`
        : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'google' || account?.provider === 'facebook') {
          await connectDB();

          // Check if user exists
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            // Create new user from social login
            const [firstName, ...lastNameParts] = (user.name || '').split(' ');
            const lastName = lastNameParts.join(' ') || '';

            const newUser = await User.create({
              email: user.email,
              firstName: firstName || '',
              lastName: lastName || '',
              phone: '', // Will be filled later
              role: 'customer',
              isActive: true,
              emailVerified: true, // Social login emails are verified
              authProvider: account.provider,
              authProviderId: profile?.sub || profile?.id,
              profileImage: '', // Initialize as empty string
            });

            user.id = newUser._id.toString();
            user.role = newUser.role;
            user.profileImage = newUser.profileImage;

            try {
              await Promise.all([
                notifyCustomerWelcome({
                  userId: newUser._id.toString(),
                  firstName: newUser.firstName || 'Customer',
                }),
                notifyAdminNewCustomer({
                  customerId: newUser._id.toString(),
                  customerName: `${newUser.firstName || ''} ${newUser.lastName || ''}`.trim() || 'Customer',
                  customerEmail: newUser.email,
                }),
              ]);
            } catch (notificationError) {
              console.error('Failed to enqueue social signup notifications:', notificationError);
            }
          } else {
            // Update existing user's auth provider info
            existingUser.authProvider = account.provider;
            existingUser.authProviderId = profile?.sub || profile?.id;
            existingUser.emailVerified = true;
            await existingUser.save();

            user.id = existingUser._id.toString();
            user.role = existingUser.role;
            user.profileImage = existingUser.profileImage;
          }
        }

        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      try {
        if (user) {
          // persist role on token
          (token as any).role = (user as any).role;
          (token as any).id = (user as any).id;
          (token as any).profileImage = (user as any).profileImage;
        }

        // If token exists but profileImage is not set, fetch it from database
        if (token && token.sub && !(token as any).profileImage) {
          try {
            await connectDB();
            const dbUser = await User.findById(token.sub);
            if (dbUser) {
              (token as any).profileImage = dbUser.profileImage;
              (token as any).role = dbUser.role; // Ensure role is always fresh from DB
            }
          } catch (dbError) {
            console.error('JWT callback DB error:', dbError);
            // Continue without profileImage if DB fails
          }
        }

        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (token && token.sub) {
          (session.user as any).id = token.sub as string; // Use token.sub instead of token.id
          (session.user as any).role = (token as any).role as string;
          (session.user as any).profileImage = (token as any).profileImage as string;
        }
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects properly for production
      try {
        // If url is relative, make it absolute
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }

        // If url is for the same site, allow it
        if (url.startsWith(baseUrl)) {
          return url;
        }

        // Default to baseUrl for external URLs
        return baseUrl;
      } catch (error) {
        console.error('Redirect callback error:', error);
        return baseUrl;
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // Redirect errors to signin page
  },
});

export type SimpleSession = {
  user: {
    id: string;
    role: string;
  };
} | null;

// Helper for Next.js 15: avoid next-auth's sync cookies() by reading session JWT directly
export async function getSessionFromCookies(): Promise<SimpleSession> {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get('__Secure-next-auth.session-token')?.value ||
      cookieStore.get('next-auth.session-token')?.value;

    if (!token) return null;

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('NEXTAUTH_SECRET is not defined');
      return null;
    }

    try {
      const decoded = jwt.verify(token, secret) as any;
      const userId = (decoded?.sub || decoded?.userId || '') as string;
      const role = (decoded?.role || '') as string;

      if (!userId) {
        console.warn('No user ID found in token');
        return null;
      }

      return { user: { id: userId, role } };
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return null;
    }
  } catch (error) {
    console.error('getSessionFromCookies error:', error);
    return null;
  }
}
