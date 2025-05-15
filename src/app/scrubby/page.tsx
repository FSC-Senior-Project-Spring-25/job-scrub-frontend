"use client";

import type React from "react";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Send,
  FileUp,
  XCircle,
  FileText,
  Bot,
  User,
  Sparkles,
  Menu,
  X,
  MessageSquare,
  Plus,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "../auth-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";

const formatAgentName = (agentName: string): string =>
  agentName
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

const truncateText = (txt: string, max: number) =>
  txt.length <= max ? txt : `${txt.substring(0, max)}…`;

const ensureIntTimestamp = (ts: unknown): number => {
  if (typeof ts === "number") return ts;
  if (ts instanceof Date) return ts.getTime();
  return Date.now();
};

function AssistantBubble({ raw }: { raw: string }) {
  const [rendered, setRendered] = useState(raw);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRendered(raw));
    return () => cancelAnimationFrame(id);
  }, [raw]);
  return (
    <div className="prose prose-sm max-w-none text-sm dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="underline text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-200"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
        }}
      >
        {rendered}
      </ReactMarkdown>
    </div>
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  resumeFile?: { name: string; type: string } | File | null;
  isLoading?: boolean;
  isStreaming?: boolean;
  isThinking?: boolean;
  activeAgents?: string[];
}

interface StreamEventData {
  event?: string;
  type?: string;
  choices?: { delta: { content?: string } }[];
  error?: string;
  conversation?: any[];
  agents?: string[];
  active_agents?: string[];
  response?: any;
}

interface Conversation {
  id: string;
  firstMessage: string;
  lastMessageTimestamp: number;
  messages: Message[];
}

export default function ScrubbyChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streamBuffer, setBuffer] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [isStreaming, setStream] = useState(false);
  const [resumeFile, setResume] = useState<File | null>(null);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [conversationHistory, setHist] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortController = useRef<AbortController | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchConversations();
  }, [user?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ block: "end" }),
        100
      );
    }
  }, [messages, streamBuffer]);

  useEffect(() => () => abortController.current?.abort(), []);

  async function fetchConversations() {
    setIsLoadingConversations(true);
    try {
      if (!user) {
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch("/api/chat/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
          // Add cache control to prevent browser caching
          "Cache-Control": "no-cache, no-store",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error("Error fetching conversations", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }

  async function fetchConversation(id: string) {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(
        `/api/chat/conversations?id=${encodeURIComponent(id)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMessages(data.messages);
      setHist(data.messages);
      setCurrentConversationId(id);
      setSidebarOpen(false); // close on mobile
    } catch (err) {
      console.error("Error fetching conversation", err);
    } finally {
      setLoading(false);
    }
  }

  async function createConversation(first: Message) {
    const msg = { ...first, timestamp: ensureIntTimestamp(first.timestamp) };
    try {
      const token = await user?.getIdToken();
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ firstMessage: msg.content, messages: [msg] }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setCurrentConversationId(data.id);
      fetchConversations();
      return data.id as string;
    } catch (e) {
      console.error("Error creating conversation", e);
      const fallback = `mock-${Date.now()}`;
      setCurrentConversationId(fallback);
      return fallback;
    }
  }

  async function updateConversation(id: string, msgs: Message[]) {
    const safeMsgs = msgs.map((m) => ({
      ...m,
      timestamp: ensureIntTimestamp(m.timestamp),
    }));
    try {
      const token = await user?.getIdToken();
      const response = await fetch(
        `/api/chat/conversations?id=${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ messages: safeMsgs }),
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      fetchConversations();
    } catch (e) {
      console.error("Error updating conversation", e);
    }
  }

  async function deleteConversation(id: string) {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(
        `/api/chat/conversations?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setConversations((p) => p.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setMessages([]);
        setCurrentConversationId(null);
      }
    } catch (e) {
      console.error("Error deleting conversation", e);
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !resumeFile) return;

    // Build user message
    const userMsg: Message = {
      role: "user",
      content: input,
      timestamp: Date.now(),
      resumeFile,
    };

    const updatedHistory = [...conversationHistory, userMsg];
    setHist(updatedHistory);

    let cid = currentConversationId;
    if (!cid) cid = await createConversation(userMsg);

    setMessages((m) => [
      ...m,
      userMsg,
      {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isThinking: true,
      },
    ]);

    setLoading(true);
    setStream(true);
    setBuffer("");
    const userInput = input;
    setInput("");

    const body = new FormData();
    body.append("message", userInput);
    body.append("conversation_history", JSON.stringify(updatedHistory));
    if (resumeFile) body.append("resume", resumeFile);

    const token = await user?.getIdToken();
    abortController.current = new AbortController();

    try {
      const res = await fetch(`/api/chat/`, {
        method: "POST",
        body,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        signal: abortController.current.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const raw of chunk.split("\n\n")) {
          if (!raw.startsWith("data:")) continue;
          const json = raw.replace(/^data:\s*/, "");
          if (json === "[DONE]") continue;
          let evt: StreamEventData;
          try {
            evt = JSON.parse(json);
          } catch (err) {
            console.error("SSE parse error", err, raw);
            continue;
          }

          const delta = evt.choices?.[0]?.delta?.content;
          if (delta) {
            setMessages((prev) => {
              const copy = [...prev];
              const idx = copy.findIndex((m) => m.isThinking || m.isStreaming);
              if (idx !== -1)
                copy[idx] = {
                  ...copy[idx],
                  isThinking: false,
                  isStreaming: true,
                };
              return copy;
            });
            assistantContent += delta;
            setBuffer((p) => p + delta);
            continue;
          }

          /* agent selections */
          const agentsArr = evt.active_agents ?? evt.agents;
          if (agentsArr?.length) {
            setActiveAgents(agentsArr);
            setMessages((prev) => {
              const copy = [...prev];
              const idx = copy.findIndex((m) => m.isThinking);
              if (idx !== -1)
                copy[idx] = { ...copy[idx], activeAgents: agentsArr };
              return copy;
            });
          }

          if (evt.error) throw new Error(evt.error);
        }
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: assistantContent || streamBuffer,
        timestamp: Date.now(),
      };
      setMessages((prev) => [
        ...prev.filter((m) => !m.isThinking && !m.isStreaming),
        assistantMsg,
      ]);
      const finalHistory = [...updatedHistory, assistantMsg];
      setHist(finalHistory);
      if (cid) updateConversation(cid, finalHistory);
    } catch (err) {
      console.error("Chat request error", err);
      const errMsg: Message = {
        role: "assistant",
        content: `Error: ${String(err)}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [
        ...prev.filter((m) => !m.isThinking && !m.isStreaming),
        errMsg,
      ]);
      const errHist = [...updatedHistory, errMsg];
      setHist(errHist);
      if (cid) updateConversation(cid, errHist);
    } finally {
      setLoading(false);
      setStream(false);
      setActiveAgents([]);
      abortController.current = null;
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "PDFs only, please.",
          timestamp: Date.now(),
        },
      ]);
      return;
    }
    setResume(file);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-white text-gray-800 dark:text-gray-200">
      {/* sidebar */}
      <aside
        className={`fixed top-16 inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out 
    border-r border-t border-gray-200 dark:border-gray-800 bg-white
    shadow-[0_4px_12px_0_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_0_rgba(0,0,0,0.3)] md:shadow-none
    ${sidebarOpen ? "w-72" : "w-0 md:w-16"}`}
      >
        {/* Full sidebar - visible when open or on larger screens */}
        <div
          className={`h-full flex flex-col ${
            !sidebarOpen && "hidden md:hidden"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold flex items-center text-gray-800 dark:text-green-100">
              <FileText className="h-5 w-5 mr-2" /> Scrubby
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Collapse sidebar"
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-green-900"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-green-300" />
            </button>
          </div>

          <div className="p-4">
            <Button
              onClick={startNewConversation}
              className="w-full bg-green-700 hover:bg-green-800 dark:bg-green-800 dark:hover:bg-green-900 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pb-20 invisible-scrollbar">
            <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              Recent chats
            </h3>
            {isLoadingConversations ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !Array.isArray(conversations) || conversations.length === 0 ? (
              <div className="text-center p-4 text-gray-500 dark:text-gray-400 text-sm">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between px-2"
                >
                  <button
                    onClick={() => fetchConversation(conv.id)}
                    className={`flex-1 text-left p-3 rounded-lg transition-colors ${
                      currentConversationId === conv.id
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm truncate">
                      {truncateText(conv.firstMessage, 30)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {format(
                        new Date(conv.lastMessageTimestamp),
                        "MMM d, yyyy"
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-red-500 dark:text-red-400 ml-1"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Collapsed rail - only on desktop */}
        <div
          className={`h-full flex flex-col items-center py-4 gap-4 ${
            sidebarOpen ? "hidden" : "hidden md:flex"
          }`}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-full bg-green-700 hover:bg-green-800 text-white"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={startNewConversation}
            className="p-2 rounded-full bg-green-700 hover:bg-green-800 text-white"
            title="New chat"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            className="p-2 rounded-full bg-green-700 hover:bg-green-800 text-white"
            title="View chats"
            onClick={() => setSidebarOpen(true)}
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* main */}
      <main
        className={`flex-1 flex flex-col h-[calc(100vh-64px)] transition-all duration-300 ${
          sidebarOpen ? "md:ml-72" : "md:ml-16"
        }`}
      >
        {/* Mobile-only toggle button - shown when sidebar is closed */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`fixed top-20 left-4 p-2 rounded-full border border-gray-200 dark:border-green-800 bg-white dark:bg-green-900 shadow-sm md:hidden z-10 ${
            sidebarOpen ? "hidden" : "block"
          }`}
        >
          <Menu className="h-5 w-5 text-green-700 dark:text-green-300" />
        </button>

        <div className="flex-1 overflow-hidden max-w-5xl w-full mx-auto flex flex-col p-4 gap-4">
          <div className="flex-1 overflow-y-auto space-y-4 pb-20 invisible-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full text-center">
                  <div className="flex justify-center mb-3">
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
                      <Sparkles className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-green-800 dark:text-green-100 mb-2 flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5" /> Scrubby
                  </h2>
                  <p className="text-sm text-green-600 dark:text-green-300 mb-4">
                    Upload your resume (PDF only) and get personalised
                    improvement suggestions
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs bg-green-100 dark:bg-green-700 text-green-700 dark:text-green-200 rounded-full py-1 px-3 w-fit mx-auto">
                    <Bot className="h-3 w-3" /> <span>AI‑powered feedback</span>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3 ${
                    msg.role === "user"
                      ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 text-xs">
                    {msg.role === "user" ? (
                      <User className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Bot className="h-4 w-4 text-gray-400" />
                    )}
                    <span
                      className={
                        msg.role === "user"
                          ? "text-gray-600 dark:text-gray-300"
                          : "text-gray-800 dark:text-gray-200 font-medium"
                      }
                    >
                      {msg.role === "user" ? "You" : "Scrubby"}
                    </span>
                    {msg.timestamp && (
                      <span className="text-gray-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  {msg.isThinking ? (
                    <div className="whitespace-pre-wrap text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="text-sm text-gray-500">Thinking…</span>
                      </div>
                      {msg.activeAgents?.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {msg.activeAgents.map((a) => (
                            <span
                              key={a}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                            >
                              <Bot className="h-3 w-3 mr-1" />{" "}
                              {formatAgentName(a)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : msg.isStreaming ? (
                    <AssistantBubble raw={streamBuffer} />
                  ) : msg.role === "assistant" ? (
                    <AssistantBubble raw={msg.content} />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* input */}
          <form
            onSubmit={handleSubmit}
            className={`fixed bottom-0 left-0 right-0 border-t border-green-100 dark:border-green-800 bg-white shadow-md p-4 z-10 transition-all duration-300 ${
              sidebarOpen ? "md:ml-72" : "md:ml-16"
            }`}
          >
            <div className="max-w-5xl mx-auto flex flex-col gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your resume or job search…"
                className="min-h-[80px] border border-green-100 dark:border-green-800 rounded-lg focus-visible:ring-green-300 dark:focus-visible:ring-green-700 text-sm resize-none"
                disabled={isLoading || isStreaming}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() || resumeFile)
                      handleSubmit(e as unknown as FormEvent);
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFile}
                  />
                  {resumeFile ? (
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-800 px-3 py-1 rounded-full text-xs">
                      <FileText className="h-4 w-4 text-green-600 dark:text-green-300" />
                      <span className="truncate max-w-[150px] text-green-700 dark:text-green-200">
                        {resumeFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setResume(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-green-700 "
                      onClick={triggerFileInput}
                      disabled={isLoading || isStreaming}
                    >
                      <FileUp className="h-4 w-4 mr-1" /> Attach PDF resume
                    </Button>
                  )}
                </div>

                <Button
                  type="submit"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={
                    isLoading || isStreaming || (!input.trim() && !resumeFile)
                  }
                >
                  {isLoading || isStreaming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />{" "}
                      {isLoading ? "Processing" : "Responding…"}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" /> Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
