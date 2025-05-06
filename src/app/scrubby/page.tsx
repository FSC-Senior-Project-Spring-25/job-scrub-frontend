"use client"

import type React from "react"
import { useState, useRef, useEffect, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
} from "lucide-react"
import { useAuth } from "../auth-context"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { format } from "date-fns"

// Helper function to format agent names
const formatAgentName = (agentName: string): string => {
  return agentName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

// Helper function to truncate text
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

// Helper function to ensure timestamps are integers
const ensureIntTimestamp = (timestamp: any): number => {
  if (typeof timestamp === "number") return timestamp
  if (timestamp instanceof Date) return timestamp.getTime()
  return Date.now()
}

function AssistantBubble({ raw }: { raw: string }) {
  const [rendered, setRendered] = useState(raw)
  useEffect(() => {
    const id = requestAnimationFrame(() => setRendered(raw))
    return () => cancelAnimationFrame(id)
  }, [raw])

  return (
    <div className="prose prose-sm max-w-none text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="text-green-600 underline hover:text-green-800"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          p: ({ node, ...props }) => <p className="mb-4" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-md font-bold mb-3" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          pre: ({ node, ...props }) => <pre className="bg-gray-100 p-2 rounded my-2 overflow-x-auto" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-green-200 pl-4 italic my-4" {...props} />
          ),
          strong: ({ node, ...props }) => <span className="font-bold" {...props} />,
        }}
      >
        {rendered}
      </ReactMarkdown>
    </div>
  )
}

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp?: number
  resumeFile?: { name: string; type: string } | File | null
  isLoading?: boolean
  isStreaming?: boolean
  isThinking?: boolean
  activeAgents?: string[]
}

interface StreamEventData {
  event?: string
  type?: string
  choices?: { delta: { content?: string } }[]
  error?: string
  conversation?: any[]
  agents?: string[]
  active_agents?: string[]
  response?: any
}

interface Conversation {
  id: string
  firstMessage: string
  lastMessageTimestamp: number
  messages: Message[]
}

export default function ScrubbyChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streamBuffer, setBuffer] = useState("")
  const [isLoading, setLoading] = useState(false)
  const [isStreaming, setStream] = useState(false)
  const [resumeFile, setResume] = useState<File | null>(null)
  const [activeAgents, setActiveAgents] = useState<string[]>([])
  const [conversationHistory, setHist] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortController = useRef<AbortController | null>(null)
  const { user } = useAuth()

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations()
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      // Force scroll to bottom with a slight delay to ensure content is rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ block: "end" })
      }, 100)
    }
  }, [messages, streamBuffer])

  // Cleanup abort controller on unmount
  useEffect(() => () => abortController.current?.abort(), [])

  // Fetch all conversations
  const fetchConversations = async () => {
    setIsLoadingConversations(true)
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/chat/conversations", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setConversations(data)
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  // Fetch a specific conversation
  const fetchConversation = async (id: string) => {
    setLoading(true)
    try {
      const token = await user?.getIdToken()
      const response = await fetch(`/api/chat/conversations/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setMessages(data.messages)
      setHist(data.messages)
      setCurrentConversationId(id)
      setSidebarOpen(false) // Close sidebar after selection on mobile
    } catch (error) {
      console.error("Error fetching conversation:", error)
    } finally {
      setLoading(false)
    }
  }

  // Create a new conversation
  const createConversation = async (firstMessage: Message) => {
    try {
      // Ensure timestamp is an integer
      const messageWithIntTimestamp = {
        ...firstMessage,
        timestamp: ensureIntTimestamp(firstMessage.timestamp),
      }

      const token = await user?.getIdToken()
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          firstMessage: messageWithIntTimestamp.content,
          messages: [messageWithIntTimestamp],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setCurrentConversationId(data.id)

      // Refresh conversations list
      fetchConversations()

      return data.id
    } catch (error) {
      console.error("Error creating conversation:", error)
      // For demonstration, create a mock ID
      const mockId = `mock-${Date.now()}`
      setCurrentConversationId(mockId)
      return mockId
    }
  }

  // Update an existing conversation
  const updateConversation = async (id: string, newMessages: Message[]) => {
    try {
      // Ensure all timestamps are integers
      const messagesWithIntTimestamps = newMessages.map((msg) => ({
        ...msg,
        timestamp: ensureIntTimestamp(msg.timestamp),
      }))

      const token = await user?.getIdToken()
      const response = await fetch(`/api/chat/conversations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          messages: messagesWithIntTimestamps,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Refresh conversations list
      fetchConversations()
    } catch (error) {
      console.error("Error updating conversation:", error)
    }
  }

  const deleteConversation = async (id: string) => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch(`/api/chat/conversations/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Remove from local state
      setConversations((prev) => prev.filter((conv) => conv.id !== id))

      // If the deleted conversation was active, start a new one
      if (currentConversationId === id) {
        setMessages([])
        setCurrentConversationId(null)
      }
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !resumeFile) return;
  
    /* ── 1.  build the user message ─────────────────────────────────────── */
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: Date.now(),
      resumeFile,
    };
  
    /* ── 2.  update local history with the user message ────────────────── */
    // This ensures user message is in history before we send to backend
    const updatedHistory = [...conversationHistory, userMessage];
    setHist(updatedHistory);
  
    /* ── 3.  make sure we have a conversation id synchronously ──────────── */
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation(userMessage);       // ← returns the id
    }
  
    /* ── 4.  optimistic UI: user bubble + thinking assistant bubble ─────── */
    setMessages((m) => [
      ...m,
      userMessage,
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
  
    const body = new FormData()
    body.append("message", userInput)
  
    // Send the updated history including the current user message
    body.append("conversation_history", JSON.stringify(updatedHistory))
  
    if (resumeFile) body.append("resume", resumeFile)
  
    const token = await user?.getIdToken()
    abortController.current = new AbortController()
  
    try {
      const res = await fetch(`/api/chat/`, {
        method: "POST",
        body,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        signal: abortController.current.signal,
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ""
      let receivedCompleteEvent = false
  
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunkStr = decoder.decode(value, { stream: true })
  
        for (const raw of chunkStr.split("\n\n")) {
          if (!raw.startsWith("data:")) continue
          const json = raw.replace(/^data:\s*/, "")
          if (json === "[DONE]") continue
  
          let evt: StreamEventData
          try {
            evt = JSON.parse(json)
          } catch (e) {
            console.error("Failed to parse event:", e, raw)
            continue
          }
  
          /* --- assistant token --- */
          const delta = evt.choices?.[0]?.delta?.content
          if (delta) {
            // If we're still in thinking mode, transition to streaming mode
            setMessages((prev) => {
              const newMessages = [...prev]
              const assistantMsgIndex = newMessages.findIndex((m) => m.isThinking || m.isStreaming)
              if (assistantMsgIndex !== -1) {
                newMessages[assistantMsgIndex] = {
                  ...newMessages[assistantMsgIndex],
                  isThinking: false,
                  isStreaming: true,
                }
              }
              return newMessages
            })
  
            assistantContent += delta
            setBuffer((prev) => prev + delta)
            continue
          }
  
          // Handle agents_selected event
          if (evt.type === "agents_selected" && evt.agents?.length) {
            const newActiveAgents = evt.agents
            setActiveAgents(newActiveAgents)
  
            // Update the thinking message to show which agents were selected
            setMessages((prev) => {
              const newMessages = [...prev]
              const thinkingMsgIndex = newMessages.findIndex((m) => m.isThinking)
              if (thinkingMsgIndex !== -1) {
                newMessages[thinkingMsgIndex] = {
                  ...newMessages[thinkingMsgIndex],
                  activeAgents: newActiveAgents,
                }
              }
              return newMessages
            })
          }
          // Also check for active_agents field
          else if (evt.active_agents?.length) {
            setActiveAgents(evt.active_agents)
  
            // Update the thinking message with active agents
            setMessages((prev) => {
              const newMessages = [...prev]
              const thinkingMsgIndex = newMessages.findIndex((m) => m.isThinking)
              if (thinkingMsgIndex !== -1) {
                newMessages[thinkingMsgIndex] = {
                  ...newMessages[thinkingMsgIndex],
                  activeAgents: evt.active_agents,
                }
              }
              return newMessages
            })
          }
          // Fallback to agents field if active_agents is not present
          else if (evt.agents?.length) {
            setActiveAgents(evt.agents)
  
            // Update the thinking message with agents
            setMessages((prev) => {
              const newMessages = [...prev]
              const thinkingMsgIndex = newMessages.findIndex((m) => m.isThinking)
              if (thinkingMsgIndex !== -1) {
                newMessages[thinkingMsgIndex] = {
                  ...newMessages[thinkingMsgIndex],
                  activeAgents: evt.agents,
                }
              }
              return newMessages
            })
          }
  
          if (evt.error) throw new Error(evt.error)
  
          // If this is the complete event, mark it so we don't process additional conversation history
          if (evt.event === "complete") {
            receivedCompleteEvent = true
          }
        }
      }
  
      // Create the final assistant message
      const assistantMessage: Message = {
        role: "assistant",
        content: assistantContent || streamBuffer,
        timestamp: Date.now(),
      };
  
      // Update message display
      setMessages((prev) => [
        ...prev.filter((m) => !m.isThinking && !m.isStreaming),
        assistantMessage,
      ]);
  
      /* ── 5.  update conversation history with the assistant message ───── */
      const finalHistory = [...updatedHistory, assistantMessage];
      setHist(finalHistory);
      
      /* ── 6.  persist the full conversation to the backend ─────────────── */
      if (convId) {
        updateConversation(convId, finalHistory);
      } else {
        console.error("Conversation ID is null. Unable to update conversation.");
      }
      
    } catch (err) {
      console.error("Error in chat request:", err);
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${String(err)}`,
        timestamp: Date.now(),
      };
  
      setMessages((prev) => [
        ...prev.filter((m) => !m.isThinking && !m.isStreaming),
        errorMessage,
      ]);
      
      // Also update history with error message
      const errorHistory = [...updatedHistory, errorMessage];
      setHist(errorHistory);
      if (convId) {
        updateConversation(convId, errorHistory);
      } else {
        console.error("Conversation ID is null. Unable to update conversation.");
      }
    } finally {
      setLoading(false);
      setStream(false);
      setActiveAgents([]);
      abortController.current = null;
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "PDFs only, please.",
          timestamp: Date.now(),
        },
      ])
      return
    }
    setResume(file)
  }

  const triggerFileInput = () => fileInputRef.current?.click()

  const startNewConversation = () => {
    setMessages([])
    setCurrentConversationId(null)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Always present but collapsed when not open */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-green-50 border-r border-green-100 shadow-lg transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-72" : "w-0"
        } md:relative md:block md:shadow-none ${sidebarOpen ? "md:w-72" : "md:w-16"}`}
      >
        {/* Sidebar content - only visible when open */}
        <div className={`h-full flex flex-col ${!sidebarOpen && "md:hidden"}`}>
          <div className="flex items-center justify-between p-4 border-b border-green-200">
            <h2 className="text-lg font-semibold text-green-800 flex items-center">
              <FileText className="h-5 w-5 mr-2" /> Scrubby
            </h2>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-full hover:bg-green-100 md:hidden">
              <X className="h-5 w-5 text-green-700" />
            </button>
          </div>

          <div className="p-4">
            <Button
              onClick={startNewConversation}
              className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> New chat
            </Button>
          </div>

          <div
            className="flex-1 overflow-y-auto p-2 invisible-scrollbar"
            style={{
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            <div className="mb-4">
              <h3 className="text-xs font-medium text-green-700 uppercase tracking-wider px-3 py-2">Recent chats</h3>
            </div>
            {isLoadingConversations ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 text-green-600 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center p-4 text-gray-500 text-sm">No conversations yet</div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="flex items-center justify-between">
                    <button
                      onClick={() => fetchConversation(conversation.id)}
                      className={`flex-1 text-left p-3 rounded-lg transition-colors ${
                        currentConversationId === conversation.id
                          ? "bg-green-200 text-green-900"
                          : "hover:bg-green-100 text-gray-700"
                      }`}
                    >
                      <div className="font-medium text-sm truncate">{truncateText(conversation.firstMessage, 30)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(conversation.lastMessageTimestamp), "MMM d, yyyy")}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(conversation.id)
                      }}
                      className="p-2 rounded-full hover:bg-red-100 text-red-500 ml-1"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Collapsed sidebar - only visible on desktop when sidebar is collapsed */}
        <div className={`h-full flex flex-col items-center py-4 ${sidebarOpen ? "hidden" : "hidden md:flex"}`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="mt-4 flex flex-col items-center gap-4">
            <button
              onClick={startNewConversation}
              className="p-2 rounded-full bg-green-600 text-white hover:bg-green-700"
              title="New chat"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              className="p-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200"
              title="View chats"
              onClick={() => setSidebarOpen(true)}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className={`absolute top-4 right-4 ${!sidebarOpen && "md:hidden"}`}>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-full hover:bg-green-100 text-green-700 hidden md:block"
            title="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col h-screen relative transition-all duration-300 ${
          sidebarOpen ? "md:ml-72" : "md:ml-16"
        }`}
      >
        {/* Toggle sidebar button (mobile only) */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`absolute top-4 left-4 p-2 rounded-full bg-white shadow-sm border border-green-100 md:hidden z-10 ${
            sidebarOpen ? "hidden" : "block"
          }`}
        >
          <Menu className="h-5 w-5 text-green-700" />
        </button>

        {/* Chat container */}
        <div className="flex-1 overflow-hidden max-w-5xl w-full mx-auto flex flex-col p-4 gap-4">
          {/* messages */}
          <div
            className="flex-1 overflow-y-auto invislbe-scrollbar space-y-4 pb-20"
            style={{
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 w-full text-center">
                  <div className="flex justify-center mb-3">
                    <div className="bg-green-50 p-3 rounded-full">
                      <Sparkles className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-green-800 mb-2 flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5" /> Scrubby
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload your resume (PDF only) and get personalized improvement suggestions
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-green-700 bg-green-50 rounded-full py-1 px-3 w-fit mx-auto">
                    <Bot className="h-3 w-3" />
                    <span>AI-powered feedback</span>
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl p-3 ${
                    msg.role === "user" ? "bg-green-700 text-white" : "bg-white border border-green-100 shadow-sm"
                  }`}
                >
                  {/* header */}
                  <div className="flex items-center gap-2 mb-1 text-xs">
                    {msg.role === "user" ? (
                      <User className="h-4 w-4 text-green-200" />
                    ) : (
                      <Bot className="h-4 w-4 text-green-600" />
                    )}
                    <span className={msg.role === "user" ? "text-green-100" : "text-green-700 font-medium"}>
                      {msg.role === "user" ? "You" : "Scrubby"}
                    </span>
                    {msg.timestamp && (
                      <span className={msg.role === "user" ? "text-green-200" : "text-gray-500"}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  {/* body */}
                  {msg.isThinking ? (
                    <div className="whitespace-pre-wrap text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                        <span className="text-sm text-green-600">
                          {msg.activeAgents && msg.activeAgents.length > 0 ? "Thinking..." : "Thinking..."}
                        </span>
                      </div>
                      {msg.activeAgents && msg.activeAgents.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {msg.activeAgents.map((agent, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-50 text-green-700"
                            >
                              <Bot className="h-3 w-3 mr-1" />
                              {formatAgentName(agent)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : msg.isLoading && !msg.content ? (
                    <div className="whitespace-pre-wrap text-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                        <span className="text-sm text-green-600">Thinking...</span>
                      </div>
                    </div>
                  ) : msg.isStreaming ? (
                    <AssistantBubble raw={streamBuffer} />
                  ) : msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a
                              {...props}
                              className="text-green-600 underline hover:text-green-800"
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          ),
                          p: ({ node, ...props }) => <p className="mb-4" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-4" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-md font-bold mb-3" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                          pre: ({ node, ...props }) => (
                            <pre className="bg-gray-100 p-2 rounded my-2 overflow-x-auto" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-green-200 pl-4 italic my-4" {...props} />
                          ),
                          strong: ({ node, ...props }) => <span className="font-bold" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm text-white">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* input */}
          <form
            onSubmit={handleSubmit}
            className={`fixed bottom-0 left-0 right-0 bg-white border-t border-green-100 shadow-md p-4 z-10 transition-all duration-300 ${
              sidebarOpen ? "ml-[18rem] md:ml-[18rem]" : "ml-[4rem] md:ml-[4rem]"
            }`}
          >
            <div className="max-w-5xl mx-auto flex flex-col gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your resume or job search…"
                className="min-h-[80px] border border-green-100 rounded-lg focus-visible:ring-green-300 text-sm resize-none"
                disabled={isLoading || isStreaming}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    if (input.trim() || resumeFile) handleSubmit(e as unknown as FormEvent)
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
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full text-xs">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="truncate max-w-[150px] text-green-700">{resumeFile.name}</span>
                      <button type="button" onClick={() => setResume(null)} className="text-red-500 hover:text-red-700">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-green-700"
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
                  disabled={isLoading || isStreaming || (!input.trim() && !resumeFile)}
                >
                  {isLoading || isStreaming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" /> {isLoading ? "Processing" : "Responding…"}
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
      </div>
    </div>
  )
}
