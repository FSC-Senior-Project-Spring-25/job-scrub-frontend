// components/UserSearch.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaSearch } from "react-icons/fa";

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

interface UserProfile {
  id: string;
  username?: string;
  email: string;
  bio?: string;
  profileIcon?: string;
}

export default function UserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /** close dropdown if click outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  /** fetch (debounced) */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        setResults(data.results);
      } catch (err: any) {
        setError(err.message || "Search failed");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  /** handle click on a result (wire up navigation later) */
  const onResultClick = (user: UserProfile) => {
    console.log("Clicked:", user);
    setQuery("");
    setResults([]);
    router.push(`/profile/${encodeURIComponent(user.id)}`);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* search box */}
      <div className="flex items-center border rounded px-2 py-1 bg-white">
        <FaSearch className="text-gray-400 mr-1" />
        <input
          type="search"
          placeholder="Search users…"
          className="flex-1 outline-none bg-transparent"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* dropdown */}
      {query && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded max-h-64 overflow-auto">
          {results.map((user) => (
            <li
              key={user.id}
              onClick={() => onResultClick(user)}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center mr-3 flex-shrink-0">
                {user.profileIcon ? (
                  isImageUrl(user.profileIcon) ? (
                    // If profileIcon is an image URL, render it as an image
                    <img
                      src={user.profileIcon}
                      alt={user.username || user.email}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // If profileIcon is not a URL (e.g., an emoji), display as text
                    <span className="text-lg">{user.profileIcon}</span>
                  )
                ) : (
                  // Fallback to first letter of username/email
                  <span className="text-sm font-semibold">
                    {(user.username || user.email).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-sm leading-snug">
                <div className="font-medium">{user.username || user.email}</div>
                <div className="text-gray-500 text-xs">{user.email}</div>
                {user.bio && (
                  <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                    {user.bio}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* loading / error small note */}
      {loading && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow rounded p-2 text-center text-sm">
          Searching…
        </div>
      )}
      {error && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow rounded p-2 text-center text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
