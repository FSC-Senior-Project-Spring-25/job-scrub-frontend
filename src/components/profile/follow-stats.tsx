"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/app/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, UserCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

function isImageUrl(str: string): boolean {
  if (!str) return false

  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"]
  const isUrl = str.startsWith("http://") || str.startsWith("https://")

  if (!isUrl) return false

  return (
    imageExtensions.some((ext) => str.toLowerCase().endsWith(ext)) ||
    str.includes("googleusercontent.com") ||
    str.includes("firebasestorage.googleapis.com")
  )
}

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
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("followers")
  const [followers, setFollowers] = useState<UserFollowData[]>([])
  const [following, setFollowing] = useState<UserFollowData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // If the dialog is open, refresh the active tab data when counts change
    if (open) {
      fetchFollowData(activeTab)
    }
  }, [followersCount, followingCount, open, activeTab, uid])

  const fetchFollowData = async (tab: string) => {
    setLoading(true)
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime()
      const endpoint =
        tab === "followers"
          ? `/api/users/followers?uid=${encodeURIComponent(uid)}&t=${timestamp}`
          : `/api/users/following?uid=${encodeURIComponent(uid)}&t=${timestamp}`

      const token = user ? await user.getIdToken() : null

      const headers: HeadersInit = {}
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
        headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        headers["Pragma"] = "no-cache"
      }

      const response = await fetch(endpoint, {
        headers,
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`${tab} data:`, data)
        if (tab === "followers") {
          setFollowers(data.followers || [])
        } else {
          setFollowing(data.following || [])
        }
      } else {
        console.error(`Error response:`, await response.text())
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
    if (userData.username && userData.username.trim() !== "") {
      return userData.username
    }
    return userData.email?.split("@")[0] || "User"
  }

  // Helper function to render user item
const renderUserItem = (userData: UserFollowData) => (
  <li key={userData.id} className="p-3 border rounded-md hover:bg-gray-50 transition-colors">
    <Link href={`/profile/${userData.id}`} className="flex items-center gap-3">
      {/* Updated avatar container with consistent size */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden">
        {userData.profileIcon ? (
          isImageUrl(userData.profileIcon) ? (
            // If profileIcon is an image URL, display it as an image
            <Image
              src={userData.profileIcon || "/placeholder.svg"}
              alt={userData.username || "Profile"}
              className="w-full h-full object-cover"
              width={40}
              height={40}
            />
          ) : (
            // If profileIcon is not a URL (e.g., emoji), display it as text
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <span className="text-xl">{userData.profileIcon}</span>
            </div>
          )
        ) : (
          // Fallback to default avatar with consistent size
          <Avatar className="w-full h-full">
            <AvatarFallback className="w-full h-full flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-gray-400 dark:text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <div>
        <p className="font-medium text-gray-900">{getDisplayName(userData)}</p>
        {userData.email && <p className="text-sm text-gray-500">{userData.email}</p>}
      </div>
    </Link>
  </li>
)

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
                <ul className="space-y-2">{followers.map(renderUserItem)}</ul>
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
                <ul className="space-y-2">{following.map(renderUserItem)}</ul>
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

      <Dialog
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setActiveTab("following")
            fetchFollowData("following")
          }
        }}
      >
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
          <Tabs defaultValue="following" value={activeTab} onValueChange={handleTabChange}>
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
                <ul className="space-y-2">{followers.map(renderUserItem)}</ul>
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
                <ul className="space-y-2">{following.map(renderUserItem)}</ul>
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
    </div>
  )
}
