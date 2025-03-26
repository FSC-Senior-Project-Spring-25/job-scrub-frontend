"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Plus, Send } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../auth-context";
import { toast } from "sonner";
import AnimatedLogo from "@/components/animated-logo";

interface Comment {
  id: string;
  author: string;
  text: string;
  created_at: string;
}

interface Post {
  id: string;
  author: string;
  content: string;
  created_at: string;
  likes: number;
  comments: Comment[];
  userHasLiked?: boolean;
}

export default function ConnectFeed() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>(
    {}
  );
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>(
    {}
  );

  // Function to fetch posts
  const fetchPosts = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch("/api/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  // Set up polling every minute
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      fetchPosts();
    }, 60000);

    // Cleanup the interval when component unmounts
    return () => clearInterval(intervalId);
  }, [user]);

  async function toggleLike(postId: string) {
    if (!user) return;

    try {
      const token = await user.getIdToken();

      // Find the current post
      const currentPost = posts.find((p) => p.id === postId);
      if (!currentPost) return;

      // Optimistically update UI first
      setPosts((currentPosts) =>
        currentPosts.map((post) => {
          if (post.id === postId) {
            const currentLikes =
              typeof post.likes === "number" ? post.likes : 0;
            const hasLiked = post.userHasLiked || false;

            return {
              ...post,
              likes: hasLiked ? currentLikes - 1 : currentLikes + 1,
              userHasLiked: !hasLiked,
            };
          }
          return post;
        })
      );

      // Then send request to server
      await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      console.error("Error toggling like:", err);
      // Revert the optimistic update if there's an error
      fetchPosts();
    }
  }

  async function handleAddPost() {
    if (!user || !newPostContent.trim()) {
      return; // Don't post if not logged in or content is empty
    }

    const tempId = `temp-${Date.now()}`; // Create a temporary ID
    const newPost = {
      id: tempId,
      author: user.email || "Anonymous",
      content: newPostContent,
      created_at: new Date().toISOString(),
      likes: 0,
      comments: [],
      userHasLiked: false,
    };

    // Optimistically update UI first
    setPosts((currentPosts) => [newPost, ...currentPosts]);

    // Clear the textarea immediately for better UX
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
          author: user.email || "Anonymous",
          content: newPost.content,
          created_at: newPost.created_at,
        }),
      });

      if (!response.ok) {
        // If the request fails, remove the temporary post
        setPosts((currentPosts) =>
          currentPosts.filter((post) => post.id !== tempId)
        );
        throw new Error("Failed to create post");
      }

      const result = await response.json();
      console.log("Post created:", result);

      // Update the temporary post with the real server data
      // This makes sure our local state matches the server state
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
    setCommentInputs((prev) => ({
      ...prev,
      [postId]: value,
    }));
  };

  async function submitComment(postId: string) {
    if (!user) return;
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    try {
      const token = await user.getIdToken();

      // Optimistically update UI
      const newComment = {
        id: "temp-" + Date.now(),
        author: user.email || "Anonymous",
        text: commentText,
        created_at: new Date().toISOString(),
      };

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, comments: [newComment, ...post.comments] }
            : post
        )
      );

      // Clear the input
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));

      // Send request to server
      await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ text: commentText }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Fetch updated data to ensure consistency
      fetchPosts();
    } catch (error) {
      console.error("Error adding comment:", error);
      // Revert optimistic update on error
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
      {/* Left Sidebar - User Info */}
      <div className="w-full md:w-1/4 bg-white shadow-md rounded-lg p-4 mb-4 md:mb-0">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-300 rounded-full mb-3"></div>
          <p className="font-semibold">
            {user.displayName || user.email || "User"}
          </p>
          <p className="text-sm text-gray-500">
            Member since:{" "}
            {format(
              new Date(user.metadata?.creationTime || Date.now()),
              "yyyy"
            )}
          </p>
        </div>
      </div>

      {/* Main Feed */}
      <div className="w-full md:w-3/4">
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <h2 className="text-lg font-semibold">What's on your mind?</h2>
          <textarea
            className="w-full mt-2 p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            rows={3}
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share your thoughts..."
            onKeyDown={(e) => e.key === "Enter" && handleAddPost()}
          />
          <Button
            className="w-full mt-3 flex items-center justify-center gap-2 bg-green-500 text-white"
            onClick={handleAddPost}
            disabled={!newPostContent.trim()}
          >
            <Plus className="w-4 h-4" /> Add Post
          </Button>
        </div>

        {loading ? (
          <p>Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No posts yet. Be the first to share something!
          </p>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="mb-4">
              <CardContent className="p-4">
                <p className="font-semibold">{post.author}</p>
                <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                  {post.content}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {format(new Date(post.created_at), "PPP")}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <Button
                    variant={post.userHasLiked ? "default" : "ghost"}
                    size="sm"
                    onClick={() => toggleLike(post.id)}
                    className={
                      post.userHasLiked
                        ? "bg-pink-100 text-pink-500 hover:bg-pink-200"
                        : ""
                    }
                  >
                    <Heart
                      className={`w-4 h-4 mr-1 ${
                        post.userHasLiked ? "fill-pink-500 text-pink-500" : ""
                      }`}
                    />
                    {post.likes || 0}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCommentSection(post.id)}
                  >
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
                        className="flex-grow p-2 text-sm border rounded"
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          handleCommentInputChange(post.id, e.target.value)
                        }
                        onKeyPress={(e) =>
                          e.key === "Enter" && submitComment(post.id)
                        }
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
                          className="border-b last:border-0 py-2"
                        >
                          <div className="flex justify-between">
                            <p className="text-sm font-medium">
                              {comment.author}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(
                                new Date(comment.created_at),
                                "MMM d, h:mm a"
                              )}
                            </p>
                          </div>
                          <p className="text-sm mt-1">{comment.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
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
  );
}
