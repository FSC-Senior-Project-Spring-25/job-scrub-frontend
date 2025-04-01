"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/app/firebase";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import EducationSection from "@/components/profile/EducationSection";
import ExperienceSection from "@/components/profile/ExperienceSection";
import ResumeSection from "@/components/profile/ResumeSection";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { toast } from "sonner";
import { useAuth } from "../auth-context";
import AnimatedLogo from "@/components/animated-logo";

interface FormData {
  username: string;
  email: string;
  bio: string;
  phone: string;
  acctype: boolean;
  profileIcon: string;
  education: string[];
  experience: string[];
  isPrivate?: boolean; // privacy setting
}

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  //Form Data State
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    bio: "",
    phone: "",
    acctype: false,
    profileIcon: "",
    education: [],
    experience: [],
  });

  //Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async (uid: string) => {
      setLoading(true);
      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setFormData({
            username: userData.username || "",
            email: userData.email || auth.currentUser?.email || "",
            bio: userData.bio || "",
            phone: userData.phone || "",
            acctype: userData.acctype ?? false,
            profileIcon: userData.profileIcon || "",
            education: userData.education || [],
            experience: userData.experience || [],
            isPrivate: userData.isPrivate ?? false, //maps Firestore field into local state
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    //Firebase auth
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        fetchUserData(currentUser.uid);
      } else {
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Saving Profile Updates
  const handleSave = async () => {
    if (!auth.currentUser) {
      toast.error("You must be logged in to update your profile.");
      return;
    }

    const userRef = doc(db, "users", auth.currentUser.uid);

    try {
      await updateDoc(userRef, {
        ...formData,
        email: auth.currentUser.email,
        isPrivate: formData.isPrivate ?? false, // including this if you have a privacy setting
      });

      toast.success("Profile updated successfully!");
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  // Remove an Education Entry
  const handleDeleteEducation = async (educationToRemove: string) => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    try {
      // Remove from Firestore
      await updateDoc(userRef, {
        education: arrayRemove(educationToRemove), // Firebase Firestore Array Remove
      });

      // Update Local State Immediately
      setFormData((prev) => ({
        ...prev,
        education: prev.education.filter((edu) => edu !== educationToRemove),
      }));
    } catch (error) {
      console.error(" Error deleting education:", error);
    }
  };

  // Function to Remove an Experience Entry
  const handleDeleteExperience = async (experienceToRemove: string) => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    try {
      // Remove from Firestore
      await updateDoc(userRef, {
        experience: arrayRemove(experienceToRemove), // Firebase Firestore Array Remove
      });

      // Update Local State Immediately
      setFormData((prev) => ({
        ...prev,
        experience: prev.experience.filter((exp) => exp !== experienceToRemove),
      }));
    } catch (error) {
      console.error(" Error deleting experience:", error);
    }
  };

  if (loading || authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <AnimatedLogo />
      </div>
    );
  }

  return (
    <div className="p-6 w-full bg-gray-100 shadow-md rounded-lg min-h-screen flex flex-col">
      {/* Profile Header */}
      <ProfileHeader
           formData={{ ...formData, isPrivate: formData.isPrivate ?? false }}
           editing={editing}
           setEditing={setEditing}
           setFormData={setFormData}
           handleSave={handleSave}
      />

      {/* Profile Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 w-full max-w-screen-2xl mx-auto">
        <EducationSection
          formData={formData}
          setFormData={setFormData}
          onDeleteEducation={handleDeleteEducation}
        />
        <ExperienceSection
          formData={formData}
          setFormData={setFormData}
          onDeleteExperience={handleDeleteExperience}
        />
        <ResumeSection />
      </div>
    </div>
  );
}
