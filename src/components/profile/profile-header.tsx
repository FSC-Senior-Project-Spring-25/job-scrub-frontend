"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/app/auth-context";
import { toast } from "sonner";
import {
  Settings,
  Edit,
  Check,
  X,
  UserCircle,
  Shield,
  ShieldAlert,
  Mail,
  Phone,
  UserPlus,
  UserMinus,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import FollowStats from "./follow-stats";

function isImageUrl(str: string): boolean {
  if (!str) return false;

  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"];
  const isUrl = str.startsWith("http://") || str.startsWith("https://");

  if (!isUrl) return false;

  return (
    imageExtensions.some((ext) => str.toLowerCase().endsWith(ext)) ||
    str.includes("googleusercontent.com") ||
    str.includes("firebasestorage.googleapis.com")
  );
}

interface ProfileHeaderProps {
  userData: {
    username: string;
    email: string;
    bio: string;
    phone: string;
    profileIcon: string;
    isPrivate?: boolean;
  };
  isOwnProfile: boolean;
  uid: string;
}

export default function ProfileHeader({
  userData,
  isOwnProfile,
  uid,
}: ProfileHeaderProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: userData.username || "",
    email: userData.email || "",
    bio: userData.bio || "",
    phone: userData.phone || "",
    profileIcon: userData.profileIcon || "",
    isPrivate: userData.isPrivate || false,
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const emojis = ["😀", "😎", "🤓", "👨‍💻", "👩‍💻", "👨‍🎓", "👩‍🎓", "🦸", "🧑‍🚀", "🧑‍🎨"];

  // Check if current user is following the profile owner
  useEffect(() => {
    if (!user || isOwnProfile) return;

    const checkFollowStatus = async () => {
      try {
        const response = await fetch(
          `/api/users/following?uid=${encodeURIComponent(uid)}`
        );
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.following.includes(uid));
        }
      } catch (error) {
        console.error("Error checking follow status:", error);
      }
    };

    checkFollowStatus();
  }, [user, uid, isOwnProfile]);

  // Fetch followers and following counts
  useEffect(() => {
    const fetchFollowStats = async () => {
      try {
        // Fetch followers
        const followersResponse = await fetch(
          `/api/users/followers?uid=${encodeURIComponent(uid)}`
        );
        if (followersResponse.ok) {
          const followersData = await followersResponse.json();
          setFollowersCount(followersData.followers.length);
        }

        // Fetch following
        const followingResponse = await fetch(
          `/api/users/following?uid=${encodeURIComponent(uid)}`
        );
        if (followingResponse.ok) {
          const followingData = await followingResponse.json();
          setFollowingCount(followingData.following.length);
        }
      } catch (error) {
        console.error("Error fetching follow stats:", error);
      }
    };

    fetchFollowStats();
  }, [uid, isFollowing]);

  const handleSave = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        username: formData.username,
        bio: formData.bio,
        phone: formData.phone,
        profileIcon: formData.profileIcon,
        isPrivate: formData.isPrivate,
      });

      toast.success("Profile updated successfully");
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleCancel = () => {
    setFormData({
      username: userData.username || "",
      email: userData.email || "",
      bio: userData.bio || "",
      phone: userData.phone || "",
      profileIcon: userData.profileIcon || "",
      isPrivate: userData.isPrivate || false,
    });
    setEditing(false);
  };

  const togglePrivacy = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        isPrivate: !formData.isPrivate,
      });

      setFormData((prev) => ({
        ...prev,
        isPrivate: !prev.isPrivate,
      }));

      toast.success(
        `Profile is now ${!formData.isPrivate ? "private" : "public"}`
      );
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      toast.error("Failed to update privacy settings");
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("You must be logged in to follow users");
      return;
    }

    setFollowLoading(true);
    try {
      const response = await fetch(
        `/api/users/follow?uid=${encodeURIComponent(user.uid)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user
              ? { Authorization: `Bearer ${await user.getIdToken()}` }
              : {}),
          },
          body: JSON.stringify({ targetID: uid }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to follow user");
      }

      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
      toast.success(`You are now following ${userData.username}`);
    } catch (error) {
      console.error("Error following user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to follow user"
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!user) return;

    setFollowLoading(true);
    try {
      const response = await fetch(
        `/api/users/unfollow/?uid=${encodeURIComponent(user.uid)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user
              ? { Authorization: `Bearer ${await user.getIdToken()}` }
              : {}),
          },
          body: JSON.stringify({ targetID: uid }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to unfollow user");
      }

      setIsFollowing(false);
      setFollowersCount((prev) => Math.max(0, prev - 1));
      toast.success(`You have unfollowed ${userData.username}`);
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to unfollow user"
      );
    } finally {
      setFollowLoading(false);
    }
  };
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Fix hydration

  return (
    <Card className="bg-white dark:bg-card dark:text-foreground mb-6 overflow-visible">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar Section */}
          <div className="relative flex-shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-100 dark:bg-muted flex items-center justify-center overflow-hidden border-4 border-gray-300 dark:border-muted">
              {formData.profileIcon ? (
                isImageUrl(formData.profileIcon) ? (
                  // If profileIcon is an image URL, display it as an image
                  <Image
                    src={formData.profileIcon}
                    alt={formData.username || "Profile"}
                    className="w-full h-full object-cover"
                    width={96}
                    height={96}
                  />
                ) : (
                  // If profileIcon is not a URL (e.g., emoji), display it as text
                  <span className="text-6xl md:text-7xl">
                    {formData.profileIcon}
                  </span>
                )
              ) : (
                // Fallback to default avatar
                <Avatar className="w-full h-full">
                  <AvatarFallback>
                    <UserCircle className="w-20 h-20 text-gray-400 dark:text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            {editing && (
              <div className="absolute bottom-0 right-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-white dark:bg-muted shadow-md"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {showEmojiPicker && (
                  <div className="absolute bottom-12 right-0 bg-white dark:bg-card rounded-lg shadow-lg p-3 z-10 grid grid-cols-5 gap-2 w-64">
                    {emojis.map((emoji, index) => (
                      <button
                        key={index}
                        className="text-2xl p-2 hover:bg-gray-100 dark:hover:bg-muted rounded-md transition-colors"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            profileIcon: emoji,
                          }));
                          setShowEmojiPicker(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      className="col-span-5 text-sm text-gray-500 mt-2 p-2 hover:bg-gray-100 dark:hover:bg-muted rounded-md"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, profileIcon: "" }));
                        setShowEmojiPicker(false);
                      }}
                    >
                      Clear Avatar
                    </button>
                    {/* Add an option to use an image URL */}
                    <button
                      className="col-span-5 text-sm text-blue-500 mt-2 p-2 hover:bg-gray-100 dark:hover:bg-muted rounded-md flex items-center justify-center"
                      onClick={() => {
                        const url = prompt("Enter image URL:");
                        if (url) {
                          setFormData((prev) => ({
                            ...prev,
                            profileIcon: url,
                          }));
                          setShowEmojiPicker(false);
                        }
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      Use Image URL
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Info Section */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="space-y-1">
                {editing ? (
                  <Input
                    value={formData.username}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    placeholder="Your name"
                    className="text-2xl font-bold h-auto py-1 px-2"
                  />
                ) : (
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-foreground">
                    {userData.username || "No Name Set"}
                  </h1>
                )}
                <div className="flex items-center text-gray-500 dark:text-muted-foreground space-x-4">
                  {formData.isPrivate && (
                    <div className="flex items-center text-amber-600">
                      <ShieldAlert className="h-4 w-4 mr-1" />
                      <span className="text-sm">Private Profile</span>
                    </div>
                  )}
                </div>
                {/* Follow Stats */}
                <FollowStats
                  followersCount={followersCount}
                  followingCount={followingCount}
                  uid={uid}
                />
              </div>

              {/* Settings, Edit, and Follow Buttons */}
              <div className="flex space-x-2">
                {isOwnProfile
                  ? !editing && (
                      <>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                              Profile Settings
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditing(true)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={togglePrivacy}>
                              <Shield className="mr-2 h-4 w-4" />
                              <span>
                                {formData.isPrivate
                                  ? "Make Profile Public"
                                  : "Make Profile Private"}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={() => setEditing(true)}>
                          Edit Profile
                        </Button>
                      </>
                    )
                  : user && (
                      <Button
                        onClick={isFollowing ? handleUnfollow : handleFollow}
                        variant={isFollowing ? "outline" : "default"}
                        className={
                          isFollowing
                            ? "border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                            : ""
                        }
                        disabled={followLoading}
                      >
                        {followLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : isFollowing ? (
                          <UserMinus className="h-4 w-4 mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        {isFollowing ? "Unfollow" : "Follow"}
                      </Button>
                    )}
                {editing && (
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      <Check className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 text-gray-600 dark:text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{userData.email}</span>
              </div>
              {editing ? (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-600 dark:text-muted-foreground" />
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="Phone number"
                    className="h-8"
                  />
                </div>
              ) : (
                userData.phone && (
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{userData.phone}</span>
                  </div>
                )
              )}
            </div>

            {/* Bio */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-muted-foreground mb-1">
                About
              </h3>
              {editing ? (
                <Textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      bio: e.target.value,
                    }))
                  }
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px]"
                />
              ) : (
                <p className="text-gray-700 dark:text-muted-foreground">
                  {userData.bio ||
                    (isOwnProfile
                      ? "Add a bio to tell people about yourself."
                      : "No bio available.")}
                </p>
              )}
            </div>

            {/* Privacy Toggle */}
            {editing && (
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="privacy-mode"
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      isPrivate: checked,
                    }))
                  }
                />
                <Label htmlFor="privacy-mode" className="cursor-pointer">
                  Private Profile
                </Label>
                <div className="text-xs text-gray-500 dark:text-muted-foreground ml-2">
                  (Your profile will not be searchable and will have limited
                  visibility)
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
