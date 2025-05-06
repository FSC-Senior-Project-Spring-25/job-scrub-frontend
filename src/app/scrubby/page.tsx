"use client"

import type React from "react"
import { useState, useRef, useEffect, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, FileUp, XCircle, FileText, Bot, User, Sparkles } from "lucide-react"
import { useAuth } from "../auth-context"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Helper function to format agent names
const formatAgentName = (agentName: string): string => {
  // Replace underscores with spaces and convert to title case
  return agentName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
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

export default function ScrubbyChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streamBuffer, setBuffer] = useState("")
  const [isLoading, setLoading] = useState(false)
  const [isStreaming, setStream] = useState(false)
  const [resumeFile, setResume] = useState<File | null>(null)
  const [activeAgents, setActiveAgents] = useState<string[]>([]) 
  const [conversationHistory, setHist] = useState<any[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortController = useRef<AbortController | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      })
    }
  }, [messages, streamBuffer])

  useEffect(() => () => abortController.current?.abort(), [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() && !resumeFile) return

    /* -- optimistic user bubble -- */
    setMessages((m) => [
      ...m,
      { role: "user", content: input, timestamp: Date.now(), resumeFile },
      {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isThinking: true,
      },
    ])

    setLoading(true)
    setStream(true)
    setBuffer("")
    const userInput = input
    setInput("")

    const body = new FormData()
    body.append("message", userInput)

    // Only send the latest conversation history to avoid duplication
    const updatedHistory = [...conversationHistory, { role: "user", content: userInput, timestamp: Date.now() }]
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
            console.log("Received event:", evt)
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
            console.log("Complete event received, buffer:", assistantContent) // Debug log
          }
        }
      }

      // Use the accumulated content for the final message
      const finalContent = assistantContent || streamBuffer
      console.log("Final content before update:", finalContent) // Debug log

      // Replace the streaming message with the final content
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isStreaming && !m.isThinking)
        return [
          ...filtered,
          {
            role: "assistant",
            content: finalContent,
            timestamp: Date.now(),
          },
        ]
      })

      // Update conversation history with the final assistant message
      setHist((prev) => [...prev, { role: "assistant", content: finalContent, timestamp: Date.now() }])
    } catch (err) {
      console.error("Error in chat request:", err)
      setMessages((prev) => [
        ...prev.filter((m) => !m.isStreaming && !m.isThinking),
        {
          role: "assistant",
          content: `Error: ${String(err)}`,
          timestamp: Date.now(),
        },
      ])
    } finally {
      setLoading(false)
      setStream(false)
      setActiveAgents([])
      abortController.current = null
    }
  }

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

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex-1 overflow-hidden max-w-3xl w-full mx-auto flex flex-col p-4 gap-4">
        {/* messages */}
        <div className="flex-1 overflow-y-auto space-y-4">
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
          className="sticky bottom-0 bg-white border border-green-100 shadow-sm rounded-xl p-3 space-y-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your resume or job search…"
            className="min-h-[60px] border-0 focus-visible:ring-green-300 text-sm"
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
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
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
        </form>

        {/* active agent badge */}
        {activeAgents && activeAgents.length > 0 && (
          <div className="absolute top-4 right-4 flex flex-col gap-1">
            {activeAgents.map((agent, index) => (
              <div
                key={index}
                className="text-xs bg-white border border-green-200 shadow-sm rounded-full px-3 py-1 flex items-center gap-1 text-green-700"
              >
                <Bot className="h-3 w-3" /> {formatAgentName(agent)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
