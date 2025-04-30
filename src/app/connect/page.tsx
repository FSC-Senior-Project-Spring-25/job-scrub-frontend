"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Plus, Send } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../auth-context";
import { toast } from "sonner";
import AnimatedLogo from "@/components/animated-logo";
import ChatPopup from "@/components/messages/chat-popup";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase";

interface Comment {
  id: string;
  author: string;
  author_uid: string;
  text: string;
  created_at: string;
}

interface Post {
  id: string;
  author: string;
  author_uid: string;
  content: string;
  created_at: string;
  likes: number;
  comments: Comment[];
  userHasLiked?: boolean;
  profileIcon?: string;
}

export default function ConnectFeed() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const router = useRouter();

  const navigateToProfile = (uid: string) => {
    const encodedId = encodeURIComponent(uid);
    router.push(`/profile/${encodedId}`);
  };

  const fetchPosts = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch("/api/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch posts");

      const data = await response.json();

      const postsWithIcons = await Promise.all(
        data.map(async (post: Post) => {
          try {
            const docSnap = await getDoc(doc(db, "users", post.author_uid));
            const userData = docSnap.exists() ? docSnap.data() : null;
            return { ...post, profileIcon: userData?.profileIcon || null };
          } catch {
            return { ...post, profileIcon: null };
          }
        })
      );

      setPosts(postsWithIcons);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStats = async () => {
    if (!user?.uid) return;
    try {
      const token = await user.getIdToken();
      const [followersRes, followingRes] = await Promise.all([
        fetch(`/api/users/followers?uid=${encodeURIComponent(user.uid)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/users/following?uid=${encodeURIComponent(user.uid)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (followersRes.ok) {
        const followersData = await followersRes.json();
        setFollowersCount(followersData.followers?.length || 0);
      }
      if (followingRes.ok) {
        const followingData = await followingRes.json();
        setFollowingCount(followingData.following?.length || 0);
      }
    } catch (err) {
      console.error("Error fetching follow stats:", err);
    }
  };

  const fetchUserProfileData = async () => {
    if (!user?.uid) return;
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserProfileData(docSnap.data());
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchFollowStats();
      fetchUserProfileData();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const intervalId = setInterval(() => fetchPosts(), 60000);
    return () => clearInterval(intervalId);
  }, [user]);

  async function toggleLike(postId: string) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: post.userHasLiked ? post.likes - 1 : post.likes + 1,
                userHasLiked: !post.userHasLiked,
              }
            : post
        )
      );

      await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      console.error("Error toggling like:", err);
      fetchPosts();
    }
  }

  async function handleAddPost() {
    if (!user || !newPostContent.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const newPost = {
      id: tempId,
      author: user.email || "Anonymous",
      author_uid: user.uid,
      content: newPostContent,
      created_at: new Date().toISOString(),
      likes: 0,
      comments: [],
      userHasLiked: false,
      profileIcon: undefined,
    };

    setPosts((currentPosts) => [newPost, ...currentPosts]);
    setNewPostContent("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          author: user.email,
          content: newPost.content,
          created_at: newPost.created_at,
        }),
      });

      if (!response.ok) {
        setPosts((currentPosts) => currentPosts.filter((post) => post.id !== tempId));
        throw new Error("Failed to create post");
      }

      const result = await response.json();
      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === tempId ? { ...result } : post))
      );
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post. Please try again.");
    }
  }

  const toggleCommentSection = (postId: string) => {
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleCommentInputChange = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  async function submitComment(postId: string) {
    if (!user) return;
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    try {
      const token = await user.getIdToken();
      const newComment = {
        id: "temp-" + Date.now(),
        author: user.email || "Anonymous",
        author_uid: user.uid,
        text: commentText,
        created_at: new Date().toISOString(),
      };

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, comments: [newComment, ...post.comments] } : post
        )
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));

      await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ text: commentText }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      fetchPosts();
    } catch (error) {
      console.error("Error adding comment:", error);
      fetchPosts();
    }
  }

  if (loading || authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <AnimatedLogo />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col md:flex-row gap-6">
      {/* Left Sidebar */}
      <div className="w-full md:w-1/4 bg-white shadow-md rounded-lg p-10 mb-4 md:mb-0 self-start">
        <div className="flex flex-col items-center">
        <div className="w-24 h-24 bg-gradient-to-br from-green-100 bg-gray-100 rounded-full shadow-lg flex items-center justify-center text-5xl text-black">
            {userProfileData?.profileIcon
              ? userProfileData.profileIcon
              : user.displayName?.charAt(0).toUpperCase() ||
                user.email?.charAt(0).toUpperCase() ||
                "U"}
          </div>
          <p
            className="font-semibold mt-3 cursor-pointer hover:text-green-600 transition"
            onClick={() => navigateToProfile(user.uid)}
          >
            {user.email || "User"}
          </p>

          <p className="text-sm p-2 text-gray-500">
            Member since: {format(new Date(user.metadata?.creationTime || Date.now()), "yyyy")}
          </p>
          <div className="flex justify-center space-x-4 mt-2 text-sm text-gray-600">
            <div><strong>{followersCount}</strong> followers</div>
            <div><strong>{followingCount}</strong> following</div>
          </div>
        </div>
      </div>

      {/* Main Feed (updated style) */}
      <div className="w-full md:w-3/4 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">What's on your mind?</h2>
          <textarea
            className="w-full mt-3 p-3 rounded-lg border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            rows={3}
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share your thoughts..."
            onKeyDown={(e) => e.key === "Enter" && handleAddPost()}
          />
          <Button
            className="w-full mt-4 flex items-center justify-center gap-2 bg-green-500 text-white"
            onClick={handleAddPost}
            disabled={!newPostContent.trim()}
          >
            <Plus className="w-4 h-4" /> Add Post
          </Button>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 text-sm">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-lg italic">
            No posts yet. Be the first to share something inspiring!
          </p>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-black cursor-pointer"
                    onClick={() => navigateToProfile(post.author_uid)}
                  >
                    {post.profileIcon || post.author.charAt(0)}
                  </div>
                  <div>
                    <p
                      className="font-semibold cursor-pointer hover:text-green-600 transition-colors"
                      onClick={() => navigateToProfile(post.author_uid)}
                    >
                      {post.author}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(post.created_at), "PPP")}
                    </p>
                  </div>
                </div>
                <p className="text-gray-800 mt-4 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                <div className="flex items-center gap-4 mt-4">
                  <Button
                    variant={post.userHasLiked ? "default" : "ghost"}
                    size="sm"
                    onClick={() => toggleLike(post.id)}
                    className={post.userHasLiked ? "bg-pink-100 text-pink-500 hover:bg-pink-200" : ""}
                  >
                    <Heart className={`w-4 h-4 mr-1 ${post.userHasLiked ? "fill-pink-500" : ""}`} />
                    {post.likes || 0}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleCommentSection(post.id)}>
                    <MessageSquare className="w-4 h-4 mr-1" />
                    {post.comments?.length || 0}
                  </Button>
                </div>

                {showComments[post.id] && (
                  <div className="mt-4 border-t pt-3">
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        className="flex-grow p-2 text-sm border border-gray-300 rounded-full focus:ring-2 focus:ring-green-400 transition-all"
                        value={commentInputs[post.id] || ""}
                        onChange={(e) => handleCommentInputChange(post.id, e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && submitComment(post.id)}
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
                        <div key={comment.id || idx} className="border-b last:border-0 py-2">
                          <div className="flex justify-between items-center">
                            <p
                              className="text-sm font-medium cursor-pointer hover:text-green-600 transition"
                              onClick={() => navigateToProfile(comment.author_uid)}
                            >
                              {comment.author}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(comment.created_at), "MMM d, h:mm a")}
                            </p>
                          </div>
                          <p className="text-sm mt-1 text-gray-800">{comment.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Chat Popup */}
      <ChatPopup />
    </div>
  );
}
