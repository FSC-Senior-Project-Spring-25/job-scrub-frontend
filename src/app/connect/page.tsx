"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Plus } from "lucide-react";
import { format } from "date-fns";


interface Post {
  id: string;
  author: string;
  content: string;
  created_at: string;
  likes: number;
  comments: string[];
}

export default function ConnectFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch("/api/posts");
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);
  

  async function likePost(postId: string) {
    try {
      
      await fetch(`/api/posts/${postId}/like`, { method: "POST" });

      // Locally update the post's likes count
      const res = await fetch("/api/posts");
      const updatedPosts = await res.json();
      setPosts(updatedPosts);
    } catch (err) {
      console.error("Error liking post:", err);
    }
  }

  async function handleAddPost() {
    if (!newPostContent.trim()) {
      return; // Don't post empty content
    }
    try {
      // For now, we're using query params. Adjust if your backend expects JSON body.
      const response = await fetch(
        `/api/posts?author=testUser&content=${encodeURIComponent(newPostContent)}`,
        { method: "POST" }
      );
      const result = await response.json();
      console.log("Post created:", result);

      // Re-fetch posts to refresh the feed
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data);

      // Clear the textarea
      setNewPostContent("");
    } catch (error) {
      console.error("Error creating post:", error);
    }
  }

  async function addComment(postId: string, comment: string) {
    try {
      await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ comment }),
        headers: { "Content-Type": "application/json" },
      });
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, comment] }
            : post
        )
      );
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 flex gap-6">
      {/* Left Sidebar - User Info */}
      <div className="w-1/4 bg-white shadow-md rounded-lg p-4">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-300 rounded-full mb-3"></div>
          <p className="font-semibold">User Name</p>
          <p className="text-sm text-gray-500">Member since: 2024</p>
          <p className="text-sm mt-2">📩 2 Messages</p>
        </div>
      </div>

      {/* Main Feed */}
      <div className="w-3/4">
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <h2 className="text-lg font-semibold">What's on your mind?</h2>
          <textarea
            className="w-full mt-2 p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            rows={3}
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share your thoughts..."
          />
          <Button className="w-full mt-3 flex items-center gap-2 bg-green-500 text-white"  onClick={handleAddPost}>
            <Plus className="w-4 h-4" /> Add Post
          </Button>
        </div>

        {loading ? (
          <p>Loading posts...</p>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="mb-4">
              <CardContent className="p-4">
                <p className="font-semibold">{post.author}</p>
                <p className="text-gray-700">{post.content}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(post.created_at), "PPP")}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <Button variant="ghost" size="sm" onClick={() => likePost(post.id)}>
                    <Heart className="w-4 h-4 mr-1" /> {post.likes}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => addComment(post.id, "Nice post!")}>
                    <MessageSquare className="w-4 h-4 mr-1" /> {" "}{post.comments.length}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
