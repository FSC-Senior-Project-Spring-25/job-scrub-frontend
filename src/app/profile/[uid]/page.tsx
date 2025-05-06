"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/app/auth-context";
import ProfileTabs from "@/components/profile/profile-tabs";
import AnimatedLogo from "@/components/animated-logo";
import ProfileHeader from "@/components/profile/profile-header";

interface UserData {
  username: string;
  email: string;
  bio: string;
  phone: string;
  acctype: boolean;
  profileIcon: string;
  education: string[];
  experience: string[];
  isPrivate?: boolean;
  resume_id?: string | null;
}

export default function ProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { user, loading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if the current user is viewing their own profile
  const isOwnProfile = user?.uid === uid;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupProfileListener = () => {
      if (!uid) return;

      // Create a listener for real-time profile updates
      const userRef = doc(db, "users", uid);
      return onSnapshot(
        userRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as UserData;
            setProfileData(data);
          } else {
            setProfileData(null);
            console.error("User not found");
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error listening to profile updates:", error);
          setLoading(false);
        }
      );
    };

    const fetchUserData = async () => {
      // If auth is still loading, wait
      if (authLoading) return;

      if (isOwnProfile && user) {
        // If viewing own profile, we'll still use Firestore for consistency
        // but we'll pre-populate with user data from auth context
        const userData: UserData = {
          username: user.username || user.displayName || "",
          email: user.email || "",
          bio: user.bio || "",
          phone: user.phone || "",
          acctype: false,
          profileIcon: user.profileIcon || user.photoURL || "",
          education: user.education || [],
          experience: user.experience || [],
          isPrivate: user.isPrivate || false,
          resume_id: user.resume_id || null,
        };
        
        // Set initial data from auth context while Firestore loads
        setProfileData(userData);
        
        // Then setup real-time listener for updates
        unsubscribe = setupProfileListener();
      } else {
        // For other profiles, just use the listener
        unsubscribe = setupProfileListener();
      }
    };

    // Only start fetching once auth has loaded
    if (!authLoading) {
      fetchUserData();
    }

    // Clean up listener when component unmounts or uid changes
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [uid, user, isOwnProfile, authLoading]);

  // Handle loading and error states
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] bg-gray-100 dark:bg-background">
        <AnimatedLogo />
      </div>
    );
  } else if (!profileData) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] bg-gray-100 dark:bg-background">
        <div className="text-center p-8 bg-white dark:bg-card dark:text-foreground rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-foreground mb-2">
            Profile Not Found
          </h2>
          <p className="text-gray-600 dark:text-muted-foreground">
            The user profile you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // Determine what data to show based on privacy settings
  const displayData =
    profileData.isPrivate && !isOwnProfile
      ? {
          ...profileData,
          email: "Private",
          phone: "Private",
          bio: "This profile is private",
          education: [],
          experience: [],
          resume_id: null,
          username: profileData.username,
          profileIcon: profileData.profileIcon,
          isPrivate: true,
        }
      : profileData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <ProfileHeader
          userData={displayData}
          isOwnProfile={isOwnProfile}
          uid={uid as string}
        />
        <ProfileTabs
          userData={displayData}
          isOwnProfile={isOwnProfile}
          uid={uid as string}
        />
      </div>
    </div>
  );
}