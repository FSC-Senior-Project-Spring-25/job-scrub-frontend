"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/app/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User } from "lucide-react"
import Link from "next/link"

interface FollowStatsProps {
  followersCount: number
  followingCount: number
  uid: string
}

interface UserFollowData {
  id: string
  username?: string
  email?: string
  profileIcon?: string
}

export default function FollowStats({ followersCount, followingCount, uid }: FollowStatsProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("followers")
  const [followers, setFollowers] = useState<UserFollowData[]>([])
  const [following, setFollowing] = useState<UserFollowData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFollowData = async (tab: string) => {
    setLoading(true)
    try {
      const endpoint = tab === "followers" 
        ? `/api/users/followers?uid=${encodeURIComponent(uid)}` 
        : `/api/users/following?uid=${encodeURIComponent(uid)}`;
      
      const token = user ? await user.getIdToken() : null;
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, { headers });

      if (response.ok) {
        const data = await response.json();
        console.log(`${tab} data:`, data);
        if (tab === "followers") {
          setFollowers(data.followers || []);
        } else {
          setFollowing(data.following || []);
        }
      } else {
        console.error(`Error response:`, await response.text());
      }
    } catch (error) {
      console.error(`Error fetching ${tab}:`, error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      fetchFollowData(activeTab)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    fetchFollowData(tab)
  }

  // Helper function to get display name
  const getDisplayName = (userData: UserFollowData) => {
    if (userData.username && userData.username.trim() !== '') {
      return userData.username;
    }
    return userData.email?.split('@')[0] || "User";
  }

  // Helper function to render user item
  const renderUserItem = (userData: UserFollowData) => (
    <li key={userData.id} className="p-3 border rounded-md hover:bg-gray-50 transition-colors">
      <Link 
        href={`/profile/${userData.id}`} 
        className="flex items-center gap-3"
      >
        <div className="flex-shrink-0">
          {userData.profileIcon && userData.profileIcon.trim() !== '' ? (
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shadow-sm border">
              {userData.profileIcon}
            </div>
          ) : (
            <Avatar className="border shadow-sm">
              <AvatarFallback className="bg-gray-50 text-gray-500">
                {getDisplayName(userData).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{getDisplayName(userData)}</p>
          {userData.email && (
            <p className="text-sm text-gray-500">{userData.email}</p>
          )}
        </div>
      </Link>
    </li>
  );

  return (
    <div className="flex items-center space-x-4 mt-2">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
            <span className="font-semibold">{followersCount}</span>
            <span className="ml-1 text-gray-600">followers</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connections</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="followers" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="followers">Followers ({followersCount})</TabsTrigger>
              <TabsTrigger value="following">Following ({followingCount})</TabsTrigger>
            </TabsList>
            <TabsContent value="followers" className="mt-4 max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-pulse flex flex-col space-y-2">
                    <div className="h-12 bg-gray-100 rounded"></div>
                    <div className="h-12 bg-gray-100 rounded"></div>
                    <div className="h-12 bg-gray-100 rounded"></div>
                  </div>
                </div>
              ) : followers.length > 0 ? (
                <ul className="space-y-2">
                  {followers.map(renderUserItem)}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2">No followers yet</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="following" className="mt-4 max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-pulse flex flex-col space-y-2">
                    <div className="h-12 bg-gray-100 rounded"></div>
                    <div className="h-12 bg-gray-100 rounded"></div>
                    <div className="h-12 bg-gray-100 rounded"></div>
                  </div>
                </div>
              ) : following.length > 0 ? (
                <ul className="space-y-2">
                  {following.map(renderUserItem)}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2">Not following anyone yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
            <span className="font-semibold">{followingCount}</span>
            <span className="ml-1 text-gray-600">following</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connections</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="following">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="followers">Followers ({followersCount})</TabsTrigger>
              <TabsTrigger value="following">Following ({followingCount})</TabsTrigger>
            </TabsList>
            <TabsContent value="following" className="mt-4 max-h-[300px] overflow-y-auto">
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}