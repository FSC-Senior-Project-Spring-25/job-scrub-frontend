"use client";

import { createContext, useState, useEffect, useContext } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => ({ success: false }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log(
        "Auth state changed:",
        firebaseUser ? "user exists" : "no user"
      );

      if (firebaseUser) {
        try {
          // Get the ID token first
          const idToken = await firebaseUser.getIdToken();
          console.log("Got ID token, establishing session");

          // Establish the session with FastAPI
          const loginResponse = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: idToken }),
            credentials: "include", // Important for cookie handling
          });

          if (!loginResponse.ok) {
            console.error(
              "Failed to establish session:",
              await loginResponse.text()
            );
            await signOut(auth);
            setUser(null);
          } else {
            console.log("Session established, verifying...");

            // Now verify the session
            const verifyResponse = await fetch("/api/auth/verify", {
              credentials: "include", // Important for cookie handling
            });

            if (!verifyResponse.ok) {
              console.error("Session verification failed");
              await signOut(auth);
              setUser(null);
            } else {
              console.log("Session verified successfully");
              setUser(firebaseUser);
            }
          }
        } catch (error) {
          console.error("Error setting session:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    // Set up timeout as a fallback
    timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // No need to set user here as onAuthStateChanged will handle that
      return { success: true };
    } catch (error: any) {
      setLoading(false);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      // Don't set loading to false here, let onAuthStateChanged handle it
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // Call API to clear the session cookie
      await fetch("/api/auth/logout", { method: "POST" });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      // Don't set loading to false here, let onAuthStateChanged handle it
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
