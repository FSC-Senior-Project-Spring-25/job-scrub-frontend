"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/app/auth-context"  // Import auth context to get token

interface FollowStatsProps {
  followersCount: number
  followingCount: number
  uid: string
}

export default function FollowStats({ followersCount, followingCount, uid }: FollowStatsProps) {
  const { user } = useAuth(); // Get the current user
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("followers")
  const [followers, setFollowers] = useState<string[]>([])
  const [following, setFollowing] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFollowData = async (tab: string) => {
    setLoading(true)
    try {
      // Use the new API endpoints with query params
      const endpoint = tab === "followers" 
        ? `/api/users/followers?uid=${encodeURIComponent(uid)}` 
        : `/api/users/following?uid=${encodeURIComponent(uid)}`;
      
      // Get token if available
      const token = user ? await user.getIdToken() : null;
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, { headers });

      if (response.ok) {
        const data = await response.json();
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
                <div className="text-center py-4">Loading followers...</div>
              ) : followers.length > 0 ? (
                <ul className="space-y-2">
                  {followers.map((followerId) => (
                    <li key={followerId} className="p-2 border rounded-md">
                      <a href={`/profile/${followerId}`} className="hover:underline">
                        {followerId}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4 text-gray-500">No followers yet</div>
              )}
            </TabsContent>
            <TabsContent value="following" className="mt-4 max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">Loading following...</div>
              ) : following.length > 0 ? (
                <ul className="space-y-2">
                  {following.map((followingId) => (
                    <li key={followingId} className="p-2 border rounded-md">
                      <a href={`/profile/${followingId}`} className="hover:underline">
                        {followingId}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4 text-gray-500">Not following anyone yet</div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}