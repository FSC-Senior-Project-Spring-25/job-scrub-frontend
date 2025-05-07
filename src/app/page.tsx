"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FaSearch, FaBriefcase, FaRegClock, FaRegBookmark } from "react-icons/fa"
import { toast } from "sonner"
import { useAuth } from "./auth-context"
import AnimatedLogo from "@/components/animated-logo"
import { Button } from "@/components/ui/button"
import ChatPopup from "@/components/messages/chat-popup"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Heart, MessageSquare, Plus, Send, User, ArrowRight, ShieldCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"
import Image from "next/image"

interface Comment {
  id: string
  author: string
  author_uid: string
  text: string
  created_at: string
}

interface Post {
  id: string
  author: string
  author_uid: string
  content: string
  created_at: string
  likes: number
  comments: Comment[]
  userHasLiked?: boolean
  profileIcon?: string
}

// Helper function to check if a string is likely an image URL
function isImageUrl(str: string): boolean {
  // Check if the string starts with http or https and ends with an image extension
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"]
  const isUrl = str.startsWith("http://") || str.startsWith("https://")

  if (!isUrl) return false

  // Check if it ends with an image extension or contains an image hosting domain
  return (
    imageExtensions.some((ext) => str.toLowerCase().endsWith(ext)) ||
    str.includes("googleusercontent.com") ||
    str.includes("firebasestorage.googleapis.com")
  )
}

export default function HomePage() {
  const [search, setSearch] = useState("")
  const { user, loading } = useAuth()
  const router = useRouter()

  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState("")
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [userProfileData, setUserProfileData] = useState<any>(null)

  const navigateToProfile = (uid: string) => {
    const encodedId = encodeURIComponent(uid)
    router.push(`/profile/${encodedId}`)
  }

  const fetchPosts = async () => {
    if (!user) return

    try {
      setPostsLoading(true)
      // Use the token directly from the session (which is stable)
      const token = await user.getIdToken()

      const response = await fetch("/api/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      if (!response.ok) {
        console.error("Failed to fetch posts:", response.status, response.statusText)
        throw new Error(`Failed to fetch posts: ${response.status}`)
      }

      const data = await response.json()

      const postsWithIcons = await Promise.all(
        data.map(async (post: Post) => {
          try {
            const docSnap = await getDoc(doc(db, "users", post.author_uid))
            const userData = docSnap.exists() ? docSnap.data() : null
            return { ...post, profileIcon: userData?.profileIcon || null }
          } catch {
            return { ...post, profileIcon: null }
          }
        }),
      )

      setPosts(postsWithIcons)
    } catch (error) {
      console.error("Error fetching posts:", error)
    } finally {
      setPostsLoading(false)
    }
  }

  const fetchFollowStats = async () => {
    if (!user?.uid) return
    try {
      const token = await user.getIdToken()
      const [followersRes, followingRes] = await Promise.all([
        fetch(`/api/users/followers?uid=${encodeURIComponent(user.uid)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/users/following?uid=${encodeURIComponent(user.uid)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (followersRes.ok) {
        const followersData = await followersRes.json()
        setFollowersCount(followersData.followers?.length || 0)
      }
      if (followingRes.ok) {
        const followingData = await followingRes.json()
        setFollowingCount(followingData.following?.length || 0)
      }
    } catch (err) {
      console.error("Error fetching follow stats:", err)
    }
  }

  const fetchUserProfileData = async () => {
    if (!user?.uid) return
    try {
      const docRef = doc(db, "users", user.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) setUserProfileData(docSnap.data())
    } catch (error) {
      console.error("Error fetching user profile:", error)
    }
  }

  useEffect(() => {
    if (user) {
      fetchPosts()
      fetchFollowStats()
      fetchUserProfileData()
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const intervalId = setInterval(() => fetchPosts(), 5 * 60000)
    return () => clearInterval(intervalId)
  }, [user?.id])

  async function toggleLike(postId: string) {
    if (!user) return
    try {
      // Optimistic update
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: post.userHasLiked ? post.likes - 1 : post.likes + 1,
                userHasLiked: !post.userHasLiked,
              }
            : post,
        ),
      )

      const token = await user.getIdToken()
      const response = await fetch(`/api/posts/like?postId=${encodeURIComponent(postId)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      // Only refetch on error
      if (!response.ok) {
        throw new Error("Failed to toggle like")
      }
    } catch (err) {
      console.error("Error toggling like:", err)
      // Only fetch posts on error to revert the optimistic update
      fetchPosts()
    }
  }

  async function handleAddPost() {
    if (!user || !newPostContent.trim()) return

    const tempId = `temp-${Date.now()}`
    const newPost = {
      id: tempId,
      author: user.displayName || user.email || "Anonymous",
      author_uid: user.uid,
      content: newPostContent,
      created_at: new Date().toISOString(),
      likes: 0,
      comments: [],
      userHasLiked: false,
      profileIcon:
        userProfileData?.profileIcon ||
        user.displayName?.charAt(0).toUpperCase() ||
        user.email?.charAt(0).toUpperCase() ||
        "U",
    }

    // Optimistic update
    setPosts((currentPosts) => [newPost, ...currentPosts])
    setNewPostContent("")
    console.log("User Name:", user.displayName)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          author: user.displayName || user.email || "Anonymous",
          content: newPost.content,
          created_at: newPost.created_at,
        }),
      })

      if (!response.ok) {
        // Remove the temp post on failure
        setPosts((currentPosts) => currentPosts.filter((post) => post.id !== tempId))
        throw new Error("Failed to create post")
      }

      const result = await response.json()
      // Just update the ID and any server-generated fields
      setPosts((currentPosts) => currentPosts.map((post) => (post.id === tempId ? { ...post, id: result.id } : post)))
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error("Failed to create post. Please try again.")
    }
  }

  const toggleCommentSection = (postId: string) => {
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  const handleCommentInputChange = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }))
  }

  async function submitComment(postId: string) {
    if (!user) return
    const commentText = commentInputs[postId]?.trim()
    if (!commentText) return

    try {
      const token = await user.getIdToken()
      const newComment = {
        id: "temp-" + Date.now(),
        author: user.displayName || user.email || "Anonymous",
        author_uid: user.uid,
        text: commentText,
        created_at: new Date().toISOString(),
      }

      // Optimistic update
      setPosts((prevPosts) =>
        prevPosts.map((post) => (post.id === postId ? { ...post, comments: [newComment, ...post.comments] } : post)),
      )
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }))

      const response = await fetch(`/api/posts/comment?postId=${encodeURIComponent(postId)}`, {
        method: "POST",
        body: JSON.stringify({
          text: commentText,
          author: user.displayName || user.email || "Anonymous",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      // Only update the specific comment with the server response if needed
      if (response.ok) {
        const data = await response.json()
        if (data.id) {
          // Update just this one comment with the real ID from the server
          setPosts((prevPosts) =>
            prevPosts.map((post) => {
              if (post.id !== postId) return post

              // Find and update the temporary comment with real data
              const updatedComments = post.comments.map((comment) =>
                comment.id === newComment.id ? { ...comment, id: data.id } : comment,
              )

              return { ...post, comments: updatedComments }
            }),
          )
        }
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      // Only fetch posts on error to revert the optimistic update
      fetchPosts()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <AnimatedLogo />
      </div>
    )
  }

  // 2. Not logged in (welcome page + scrubby)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-background flex flex-col md:flex-row items-center justify-between px-12 py-12 gap-12">
        {/* Left side: Scrubby GIF */}
        <div className="flex-1 max-w-lg rounded-xl p-12 text-center self-start -mt-8 bg-[#DDDBD5] dark:bg-muted shadow-md">
          <img src="/assets/Scrubby-logo.gif" alt="Scrubby Logo" className="mx-auto w-full mb-4 rounded" />
          <p className="text-black dark:text-foreground text-sm">
            JobScrub simplifies your career journey with powerful tools designed to match you with the right
            opportunities. Upload your resume, discover personalized job listings, and manage your applications — all in
            one place. Your next career move starts here.
          </p>
          <Link href="/signup">
            <button className="mt-4 bg-green-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-green-700">
              Get Started
            </button>
          </Link>
        </div>

        {/* Right side: text */}
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="max-w-xl mx-auto">
            <p className="text-green-600 dark:text-green-400 text-base font-semibold mb-2">
              Find Your Dream Job Today!
            </p>
            <h1 className="text-6xl font-extrabold text-black dark:text-foreground">Welcome to</h1>
            <h1 className="text-6xl font-extrabold text-black dark:text-foreground">JobScrub!</h1>
            <p className="text-gray-700 dark:text-muted-foreground text-lg mt-6 leading-relaxed font-medium">
              Your Career Journey, Simplified.
            </p>

            {/* Bullet Points */}
            <ul className="text-gray-600 dark:text-muted-foreground text-sm mt-6 space-y-2 text-left pl-2">
              <li>• Upload your resume in seconds</li>
              <li>• Discover job matches instantly</li>
              <li>• Track and manage your applications easily</li>
            </ul>

            {/* Buttons */}
            <div className="mt-8 flex flex-col items-center">
              <Link href="/signup">
                <button className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg text-lg hover:bg-green-700">
                  Create an Account
                </button>
              </Link>
              <Link href="/login" className="mt-4 text-blue-600 dark:text-blue-400 hover:underline text-base">
                Already a User? Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Sidebar / Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-card rounded-lg shadow p-6 mb-4 border border-gray-100 dark:border-gray-800">
              <div className="flex flex-col items-center">
                <div
                  className="w-24 h-24 bg-gradient-to-br from-green-100 to-gray-100 dark:from-green-900 dark:to-gray-800 rounded-full shadow-lg flex items-center justify-center text-5xl text-black dark:text-white cursor-pointer overflow-hidden"
                  onClick={() => navigateToProfile(user.uid)}
                >
                  {userProfileData?.profileIcon ? (
                    isImageUrl(userProfileData.profileIcon) ? (
                      <Image
                        src={userProfileData.profileIcon || "/placeholder.svg"}
                        alt={user.displayName || "Profile"}
                        className="w-full h-full object-cover"
                        width={96}
                        height={96}
                      />
                    ) : (
                      // If profileIcon exists but is not an image URL (e.g., an emoji or text)
                      userProfileData.profileIcon
                    )
                  ) : (
                    // Fallback to first initial of name or email
                    user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
                <p
                  className="font-semibold mt-3 cursor-pointer hover:text-green-600 transition"
                  onClick={() => navigateToProfile(user.uid)}
                >
                  {user.displayName || user.email || "User"}
                </p>

                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                  Member since: {format(new Date(user.metadata?.creationTime || Date.now()), "yyyy")}
                </p>
                <div className="flex justify-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <strong>{followersCount}</strong> followers
                  </div>
                  <div>
                    <strong>{followingCount}</strong> following
                  </div>
                </div>
              </div>

              {/* Quick Links Section */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-lg mb-3">Quick Links</h2>
                <nav className="space-y-2">
                  <Link
                    href="/jobs"
                    className="flex px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 items-center"
                  >
                    <FaBriefcase className="mr-2 text-green-600 dark:text-green-500" /> Find Jobs
                  </Link>
                  <Link
                    href="/jobs/report"
                    className="flex px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 items-center"
                  >
                    <Plus className="mr-2 text-green-600 dark:text-green-500 h-4 w-4" /> Report Job
                  </Link>
                  <Link
                    href="/jobs/verify"
                    className="flex px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 items-center"
                  >
                    <ShieldCheck className="mr-2 text-green-600 dark:text-green-500 h-4 w-4" /> Verify Jobs
                  </Link>
                  <Link
                    href="/scrubby"
                    className="flex px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 items-center"
                  >
                    <User className="mr-2 text-green-600 dark:text-green-500 h-4 w-4" /> Resume Help
                  </Link>
                  <Link
                    href="/applications"
                    className="flex px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 items-center"
                  >
                    <FaRegClock className="mr-2 text-green-600 dark:text-green-500" /> My Applications
                  </Link>
                  <Link
                    href="/saved"
                    className="flex px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 items-center"
                  >
                    <FaRegBookmark className="mr-2 text-green-600 dark:text-green-500" /> Saved Jobs
                  </Link>
                </nav>
              </div>
            </div>

            {/* Job Search Card */}
            <div className="bg-white dark:bg-card rounded-lg shadow p-4 mb-4 border border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold text-lg mb-3">Find Jobs</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 px-4 py-2 w-full">
                  <FaSearch className="text-gray-500 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search for jobs..."
                    className="ml-2 w-full outline-none bg-transparent"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && search.trim()) {
                        router.push(`/jobs?search=${encodeURIComponent(search.trim())}`)
                      }
                    }}
                  />
                </div>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (search.trim()) {
                      router.push(`/jobs?search=${encodeURIComponent(search.trim())}`)
                    } else {
                      router.push("/jobs")
                    }
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full mt-3 text-green-700 dark:text-green-500 border-green-200 dark:border-green-800"
                onClick={() => router.push("/jobs")}
              >
                View All Jobs
              </Button>
            </div>
          </div>

          {/* Main Content - Social Feed (from Connect page) */}
          <div className="md:col-span-2 space-y-6">
            {/* Create Post Card */}
            <div className="bg-white dark:bg-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">What's on your mind?</h2>
              <textarea
                className="w-full mt-3 p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                rows={3}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your thoughts..."
                onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && handleAddPost()}
              />
              <Button
                className="w-full mt-4 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                onClick={handleAddPost}
                disabled={!newPostContent.trim()}
              >
                <Plus className="w-4 h-4" /> Add Post
              </Button>
            </div>

            {postsLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 dark:border-green-500"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                <p className="text-gray-400 dark:text-gray-500 py-8 text-lg italic">
                  No posts yet. Be the first to share something inspiring!
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <Card
                  key={post.id}
                  className="border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl font-bold text-black dark:text-white cursor-pointer overflow-hidden"
                        onClick={() => navigateToProfile(post.author_uid)}
                      >
                        {post.profileIcon ? (
                          isImageUrl(post.profileIcon) ? (
                            <Image
                              src={post.profileIcon || "/placeholder.svg"}
                              alt={post.author || "Profile"}
                              className="w-full h-full object-cover"
                              width={96}
                              height={96}
                            />
                          ) : (
                            post.profileIcon
                          )
                        ) : (
                          post.author.charAt(0)
                        )}
                      </div>
                      <div>
                        <p
                          className="font-semibold cursor-pointer hover:text-green-600 transition-colors"
                          onClick={() => navigateToProfile(post.author_uid)}
                        >
                          {post.author}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {format(new Date(post.created_at), "PPP")}
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-800 dark:text-gray-200 mt-4 text-sm leading-relaxed whitespace-pre-wrap">
                      <ReactMarkdown>{post.content}</ReactMarkdown>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <Button
                        variant={post.userHasLiked ? "default" : "ghost"}
                        size="sm"
                        onClick={() => toggleLike(post.id)}
                        className={
                          post.userHasLiked
                            ? "bg-pink-100 dark:bg-pink-900 text-pink-500 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-800"
                            : ""
                        }
                      >
                        <Heart
                          className={`w-4 h-4 mr-1 ${post.userHasLiked ? "fill-pink-500 dark:fill-pink-300" : ""}`}
                        />
                        {post.likes || 0}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleCommentSection(post.id)}>
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {post.comments?.length || 0}
                      </Button>
                    </div>

                    {showComments[post.id] && (
                      <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            className="flex-grow p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-full focus:ring-2 focus:ring-green-400 transition-all"
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => handleCommentInputChange(post.id, e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && submitComment(post.id)}
                          />
                          <Button
                            size="sm"
                            onClick={() => submitComment(post.id)}
                            disabled={!commentInputs[post.id]?.trim()}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                        {post.comments && post.comments.length > 0 ? (
                          post.comments.map((comment, idx) => (
                            <div
                              key={comment.id || idx}
                              className="border-b border-gray-200 dark:border-gray-700 last:border-0 py-2"
                            >
                              <div className="flex justify-between items-center">
                                <p
                                  className="text-sm font-medium cursor-pointer hover:text-green-600 transition"
                                  onClick={() => navigateToProfile(comment.author_uid)}
                                >
                                  {comment.author}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {format(new Date(comment.created_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                              <p className="text-sm mt-1 text-gray-800 dark:text-gray-200">{comment.text}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No comments yet. Be the first to comment!
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Chat Popup */}
      <ChatPopup />
    </div>
  )
}
