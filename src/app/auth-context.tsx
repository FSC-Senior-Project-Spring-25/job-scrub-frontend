"use client";

import { useSession, signOut, SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState, useMemo, useCallback, createContext, useContext } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// Extended user interface to include Firestore profile data
export interface ExtendedUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  idToken: string;
  provider?: string;
  metadata: {
    creationTime: string;
  };
  // Firestore profile fields
  bio?: string;
  phone?: string;
  isPrivate?: boolean;
  education?: string[];
  experience?: string[];
  resume_id?: string | null;
  resume_filename?: string | null;
  profileIcon?: string;
  username?: string;
  // Method to get a fresh token
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
}

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  profileLoading: boolean;
  logout: () => Promise<{ success: boolean; error?: string }>;
  refreshToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const loading = status === "loading";
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, any> | null>(null);

  // Function to fetch user profile data from Firestore
  const fetchProfileData = useCallback(async (userId: string) => {
    try {
      setProfileLoading(true);
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setProfileData(userSnap.data());
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Refresh profile data when needed
  const refreshProfile = useCallback(async () => {
    if (session?.user?.uid || session?.user?.id) {
      await fetchProfileData(session.user.uid || session.user.id);
    }
  }, [session, fetchProfileData]);

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
            idToken: newToken,
          },
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
      const tokenParts = session.user.idToken.split(".");
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

  // Fetch profile data when session changes
  useEffect(() => {
    if (session?.user?.uid || session?.user?.id) {
      fetchProfileData(session.user.uid || session.user.id);
    }
  }, [session?.user?.uid, session?.user?.id, fetchProfileData]);

  // Create enhanced user object with profile data and token handling
  const user = useMemo(() => {
    if (!session?.user) return null;

    const uid = session.user.uid || session.user.id;
    
    return {
      ...session.user,
      uid,
      // Prefer profile values over session values when available
      displayName: profileData?.username || session.user.displayName || "",
      email: session.user.email ?? null,
      photoURL: profileData?.profileIcon || session.user.photoURL,
      provider: session.user.provider || "credentials",
      // Include all profile data from Firestore
      ...(profileData || {}),
      metadata: {
        creationTime: auth.currentUser?.metadata?.creationTime || new Date().toISOString(),
      },
      // Enhanced getIdToken that checks expiration and refreshes if needed
      getIdToken: async (forceRefresh = false) => {
        if (forceRefresh) return await refreshToken();
        return await getValidToken();
      },
    };
  }, [session, profileData, refreshToken, getValidToken]);

  const logout = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const contextValue = {
    user,
    loading: loading || profileLoading,
    profileLoading,
    logout,
    refreshToken,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}