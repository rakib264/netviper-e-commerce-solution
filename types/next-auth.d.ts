import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      profileImage?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    profileImage?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    profileImage?: string;
  }
}