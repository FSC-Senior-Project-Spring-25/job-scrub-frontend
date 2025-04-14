"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase";
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
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if the current user is viewing their own profile
  const isOwnProfile = user?.uid === uid;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!uid) return;

      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data() as UserData;
          setUserData(data);
        } else {
          console.error("User not found");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <AnimatedLogo />
      </div>
    );
  } else if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Profile Not Found
          </h2>
          <p className="text-gray-600">
            The user profile you're looking for doesn't exist or has been
            removed.
          </p>
        </div>
      </div>
    );
  }

  // Determine what data to show based on privacy settings
  const displayData =
    userData.isPrivate && !isOwnProfile
      ? {
          ...userData,
          email: "Private",
          phone: "Private",
          bio: userData.bio || "This profile is private",
          education: [],
          experience: [],
        }
      : userData;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
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
