import NextAuth, { NextAuthOptions } from "next-auth";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firestore } from "./firestore";
import { auth } from "./firebase";

// Extend the Session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      idToken: string;
    }
  }
  
  interface User {
    idToken?: string;
  }
  
  interface JWT {
    idToken?: string;
    userId?: string;
  }
}


export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }
          
          // Authenticate with Firebase
          const userCredential = await signInWithEmailAndPassword(
            auth, 
            credentials.email, 
            credentials.password
          );
          
          // Get the user's ID token
          const idToken = await userCredential.user.getIdToken();
          
          // Return the user object
          return {
            id: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName,
            image: userCredential.user.photoURL,
            idToken
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  adapter: FirestoreAdapter(firestore),
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        return {
          ...token,
          idToken: user.idToken,
          userId: user.id
        };
      }
      
      // Handle token updates from client
      if (trigger === 'update' && session?.user?.idToken) {
        return {
          ...token,
          idToken: session.user.idToken
        };
      }
      
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
          idToken: token.idToken as string
        }
      };
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 5 * 24 * 60 * 60, // 5 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth: getServerSession, signIn, signOut } = NextAuth(authOptions);