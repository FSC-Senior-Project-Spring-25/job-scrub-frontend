import NextAuth, { NextAuthOptions } from "next-auth";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firestore } from "./firestore";
import { auth } from "./firebase";

// Extend the Session type with Firebase-compatible properties
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      uid: string;
      email?: string | null;
      displayName?: string | null;
      photoURL?: string | null;
      idToken: string;
      provider?: string;
    }
  }
  
  interface User {
    idToken?: string;
    provider?: string;
    uid?: string;
    displayName?: string | null;
    photoURL?: string | null;
  }
  
  interface JWT {
    idToken?: string;
    userId?: string;
    provider?: string;
    displayName?: string | null;
    photoURL?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        idToken: { label: "ID Token", type: "text" },
        googleAuth: { label: "GoogleAuth", type: "boolean", value: "false" },
        uid: { label: "UID", type: "text" },
        displayName: { label: "DisplayName", type: "text" }, 
        photoURL: { label: "PhotoURL", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email) {
            return null;
          }
          
          // Check if this is a Google Auth login or a new signup with ID token
          if (credentials.googleAuth === "true" || credentials.idToken) {
            // For Google auth users or new signups, we use the ID token directly
            return {
              id: credentials.uid || "", // Primary ID for NextAuth
              uid: credentials.uid || "", // Firebase UID
              email: credentials.email,
              displayName: credentials.displayName || null,
              photoURL: credentials.photoURL || null,
              idToken: credentials.idToken || credentials.password, // The Firebase ID token
              provider: credentials.googleAuth === "true" ? "google" : "credentials"
            };
          } else {
            // Regular email/password login
            if (!credentials.password) return null;
            
            try {
              const userCredential = await signInWithEmailAndPassword(
                auth, 
                credentials.email, 
                credentials.password
              );
              
              const firebaseUser = userCredential.user;
              const idToken = await firebaseUser.getIdToken();
              
              // Return the user object with Firebase-compatible properties
              return {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                idToken,
                provider: "credentials"
              };
            } catch (loginError) {
              console.error("Email/password login error:", loginError);
              return null;
            }
          }
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
          userId: user.id,
          uid: user.uid || user.id,
          provider: user.provider,
          displayName: user.displayName,
          photoURL: user.photoURL
        };
      }
      
      // Handle token updates from client
      if (trigger === 'update' && session?.user?.idToken) {
        return {
          ...token,
          idToken: session.user.idToken,
          // Also update other fields if provided
          displayName: session.user.displayName || token.displayName,
          photoURL: session.user.photoURL || token.photoURL
        };
      }
      
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, using Firebase naming conventions
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
          uid: token.uid as string,
          idToken: token.idToken as string,
          provider: token.provider as string,
          displayName: token.displayName as string | null,
          photoURL: token.photoURL as string | null
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