"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../lib/firebase';
import { signIn } from 'next-auth/react';
import { Loader2 } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email || !password || !confirmPassword) {
      setError('Please fill all the fields');
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create the user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        username: "", // Will be filled during onboarding
        createdAt: new Date(),
        bio: "",
        phone: "",
        profileIcon: "",
        isPrivate: false,
        education: [],
        experience: [],
        resume_id: null,
        resume_filename: null,
        provider: 'credentials'
      });
      
      // Get Firebase ID token
      const idToken = await user.getIdToken();
      
      // Sign in with NextAuth using a dedicated idToken field
      const result = await signIn('credentials', {
        email,
        idToken, // Pass ID token in its own field
        uid: user.uid, // Send UID explicitly
        redirect: false
      });
      
      if (result?.ok) {
        // Redirect to onboarding
        router.push('/onboarding');
      } else {
        setError('Signup successful but login failed. Please try logging in.');
        router.push('/login');
      }
    } catch (error) {
      if (error instanceof Error) {
        // Handle Firebase specific errors
        if (error.message.includes('email-already-in-use')) {
          setError('This email is already in use.');
        } else {
          setError(error.message);
        }
      } else {
        setError('An error occurred during signup.');
      }
      console.error("Signup error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      // Sign in with Google using Firebase
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if this is a new user or existing user
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create user document in Firestore for new users
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          username: user.displayName || "",
          photoURL: user.photoURL,
          profileIcon: user.photoURL,
          createdAt: new Date(),
          bio: "",
          phone: "",
          isPrivate: false,
          education: [],
          experience: [],
          resume_id: null,
          resume_filename: null,
          provider: 'google'
        });
      }

      // Get the Firebase ID token
      const idToken = await user.getIdToken();
      
      // Sign in with NextAuth using clear field naming
      const signInResult = await signIn('credentials', {
        email: user.email,
        idToken: idToken, // Use dedicated idToken field
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        googleAuth: "true", // String "true", not boolean true
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Error signing in with Google. Please try again.');
      } else {
        // If this is a new user, redirect to onboarding
        if (!userDoc.exists()) {
          router.push('/onboarding');
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-card dark:text-foreground rounded-lg shadow-md border border-gray-300 dark:border-muted">
        <h2 className="text-2xl font-bold text-center">Sign Up</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form className="space-y-6" onSubmit={handleSignup}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-foreground">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-muted rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-foreground">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-muted rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-foreground">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-muted rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Signing up...
              </div>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-muted"></span>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-card text-gray-500 dark:text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-muted rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-foreground bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </div>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </>
          )}
        </button>

        <p className="text-center text-gray-600 dark:text-muted-foreground">
          Already a member?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}