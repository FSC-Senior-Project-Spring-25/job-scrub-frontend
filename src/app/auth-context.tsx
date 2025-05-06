"use client";

import { useSession, signOut, SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState, useMemo, useCallback } from "react";
import { auth } from "@/lib/firebase";

export default function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const loading = status === "loading";
  const [displayName, setDisplayName] = useState<string | null>(null);
  
  // Function to refresh the token when needed
  const refreshToken = useCallback(async () => {
    if (auth.currentUser) {
      try {
        const newToken = await auth.currentUser.getIdToken(true); // Force refresh
        
        // Update the session with the new token
        await update({
          ...session,
          user: {
            ...session?.user,
            idToken: newToken
          }
        });
        
        return newToken;
      } catch (error) {
        console.error("Failed to refresh token:", error);
        return null;
      }
    }
    return null;
  }, [session, update]);
  
  // Get a fresh token, refreshing if necessary
  const getValidToken = useCallback(async () => {
    if (!session?.user?.idToken) return null;
    
    try {
      // Check if token is expired (quick check by decoding JWT)
      const tokenParts = session.user.idToken.split('.');
      if (tokenParts.length !== 3) return refreshToken();
      
      const payload = JSON.parse(atob(tokenParts[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      
      // If token expires in less than 5 minutes, refresh it
      if (Date.now() > expiryTime - 5 * 60 * 1000) {
        return await refreshToken();
      }
      
      return session.user.idToken;
    } catch (error) {
      console.error("Error checking token expiration:", error);
      return refreshToken();
    }
  }, [session, refreshToken]);
  
  useEffect(() => {
    if (session?.user && auth.currentUser) {
      setDisplayName(auth.currentUser.displayName || auth.currentUser.email);
    }
  }, [session]);
  
  // Create user object with proper token handling
  const user = useMemo(() => {
    if (!session?.user) return null;
    
    return {
      ...session.user,
      uid: session.user.id,
      displayName: displayName || session.user.name || session.user.email,
      email: session.user.email,
      metadata: {
        creationTime: auth.currentUser?.metadata?.creationTime || new Date().toISOString()
      },
      // Enhanced getIdToken that checks expiration and refreshes if needed
      getIdToken: async (forceRefresh = true) => {
        if (forceRefresh) return await refreshToken();
        return await getValidToken();
      }
    };
  }, [session, displayName, refreshToken, getValidToken]);

  const logout = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/login");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return {
    user,
    loading,
    logout,
    refreshToken
  };
}