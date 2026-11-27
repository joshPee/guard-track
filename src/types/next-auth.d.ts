import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string
    id: string
    photoUrl?: string | null
    shiftScope?: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      photoUrl?: string | null
      shiftScope?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    id: string
    photoUrl?: string | null
    shiftScope?: string | null
  }
}
