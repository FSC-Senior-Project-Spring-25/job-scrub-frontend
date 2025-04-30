"use client";

import type React from "react";

import { useState, useRef, type FormEvent, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "../auth-context";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  files?: Array<{
    name: string;
    type: string;
  }>;
  isLoading?: boolean;
  isStreaming?: boolean;
}

interface StreamEventData {
  type: "agents_selected" | "content_chunk" | "complete" | "error";
  agents?: string[];
  content?: string;
  response?: string;
  conversation?: any[];
  active_agents?: string;
  error?: string;
}

export default function ScrubbyChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedContent]);

  // Update suggestions when files change or messages reset
  useEffect(() => {
    if (files.length > 0) {
      setSuggestions([
        "Can you summarize my resume?",
        "How can I improve my work experience section?",
        "What keywords are missing for my target job?",
      ]);
    } else {
      setSuggestions([]);
    }
  }, [files, messages]);

  // Clean up any active stream when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: Date.now(),
      files: files.map((file) => ({
        name: file.name,
        type: file.type,
      })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamedContent("");

    // Add a streaming placeholder message
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isLoading: true,
        isStreaming: true,
      },
    ]);

    const userInput = input;
    setInput("");

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      const formData = new FormData();
      formData.append("message", userInput);
      formData.append(
        "conversation_history",
        JSON.stringify(conversationHistory)
      );
    
      // Rename files to resume and only send the first one
      if (files.length > 0) {
        formData.append("resume", files[0]);
      }
    
      const token = await user?.getIdToken();
    
      const response = await fetch(`/api/chat/`, {
        method: "POST",
        body: formData,
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
        credentials: "include",
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let selectedAgents: string[] = [];

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const eventLines = chunk.split("\n\n");

        for (const eventLine of eventLines) {
          if (eventLine.trim() === "" || !eventLine.startsWith("data: "))
            continue;

          const jsonData = eventLine.replace("data: ", "").trim();
          if (jsonData === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonData) as StreamEventData;

            // Handle different event types
            switch (data.type) {
              case "agents_selected":
                if (data.agents && data.agents.length > 0) {
                  selectedAgents = data.agents;
                  setSelectedAgent(data.agents[0]); // Use first agent as primary
                }
                break;

              case "content_chunk":
                if (data.content) {
                  accumulatedContent += data.content;
                  setStreamedContent(accumulatedContent);

                  // Update the streaming message with current content
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const streamingMsgIndex = newMessages.findIndex(
                      (m) => m.isStreaming
                    );
                    if (streamingMsgIndex !== -1) {
                      newMessages[streamingMsgIndex] = {
                        ...newMessages[streamingMsgIndex],
                        content: accumulatedContent,
                      };
                    }
                    return newMessages;
                  });
                }
                break;

              case "complete":
                // Update conversation history with the full response
                if (data.conversation) {
                  setConversationHistory(data.conversation);
                }

                // Set the active agent if provided
                if (data.active_agents) {
                  setSelectedAgent(data.active_agents.toLowerCase());
                }

                // Replace the streaming message with the final response
                setMessages((prev) => {
                  const finalMessages = prev.filter((m) => !m.isStreaming);
                  return [
                    ...finalMessages,
                    {
                      role: "assistant",
                      content: data.response || accumulatedContent,
                      timestamp: Date.now(),
                    },
                  ];
                });
                break;

                case "error":
                  // Handle server-side error without throwing
                  console.error("Server error:", data.error);
                  // Store the error in state to display to user but don't throw
                  setMessages((prev) => {
                    const finalMessages = prev.filter((m) => !m.isStreaming);
                    return [
                      ...finalMessages,
                      {
                        role: "assistant",
                        content: `Sorry, I couldn't process your request: ${data.error || "An unknown error occurred"}`,
                        timestamp: Date.now(),
                      },
                    ];
                  });
                  
                  // Break the streaming loop after error
                  accumulatedContent = "ERROR_OCCURRED";
                  break;
              }
              
              // Check if we need to break the streaming due to error
              if (accumulatedContent === "ERROR_OCCURRED") {
                // Exit the while loop
                break;
              }
            } catch (err) {
              console.error("Error parsing stream data:", err, jsonData);
              // Continue processing the stream - we don't want to break on parse errors
            }
        }
      }

      setFiles([]);
    } catch (error) {
      console.error("Error:", error);

      // Remove the streaming message and add an error message
      setMessages((prev) => {
        const finalMessages = prev.filter(
          (m) => !m.isStreaming && !m.isLoading
        );
        return [
          ...finalMessages,
          {
            role: "assistant",
            content: `Error: ${
              error instanceof Error ? error.message : "Something went wrong"
            }`,
            timestamp: Date.now(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Get just the first file
      const file = e.target.files[0];

      // Check if it's a PDF
      if (file.type !== "application/pdf") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Please upload only PDF files for resumes.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      // Replace existing files with the new file (only keep one)
      setFiles([file]);
    }
  };

  const removeFile = (index: number) => {
    setFiles([]);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const renderFilePreview = (file: File) => {
    return (
      <div className="flex items-center justify-center h-full flex-col">
        <FileText className="h-10 w-10 text-red-500" />
        <span className="text-xs mt-1 text-black">PDF File</span>
        <span className="text-xs text-gray-500">{file.name}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex-1 overflow-hidden max-w-3xl w-full mx-auto flex flex-col p-4 gap-4">
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
                Upload your resume (PDF only) and get personalized improvement
                suggestions
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-green-700 bg-green-50 rounded-full py-1 px-3 w-fit mx-auto">
                <Bot className="h-3 w-3" />
                <span>AI-powered feedback</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-3 ${
                  message.role === "user"
                    ? "bg-green-700 text-white"
                    : "bg-white border border-green-100 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.role === "user" ? (
                    <User className="h-4 w-4 text-green-200" />
                  ) : (
                    <Bot className="h-4 w-4 text-green-600" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      message.role === "user"
                        ? "text-green-100"
                        : "text-green-700"
                    }`}
                  >
                    {message.role === "user" ? "You" : "Scrubby"}
                  </span>
                  <span
                    className={`text-xs ${
                      message.role === "user"
                        ? "text-green-200"
                        : "text-gray-500"
                    }`}
                  >
                    {message.timestamp &&
                      new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </span>
                </div>
                {message.role === "user" ? (
                  <div className="whitespace-pre-wrap text-sm text-white">
                    {message.content}
                  </div>
                ) : message.isLoading && !message.content ? (
                  <div className="whitespace-pre-wrap text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                      <span className="text-sm text-green-600">
                        Thinking...
                      </span>
                    </div>
                  </div>
                ) : message.isStreaming ? (
                  <div className="text-sm text-gray-800 prose prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                    <div className="inline-block h-4 w-4 ml-1 align-middle">
                      <span className="inline-flex w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-800 prose prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                )}

                {message.files && message.files.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.files.map((file, fileIndex) => (
                      <div
                        key={fileIndex}
                        className="bg-white rounded-lg border border-green-200 p-2"
                      >
                        <div className="text-xs font-medium text-green-700 mb-1">
                          {file.name}
                        </div>
                        <div className="h-40 border rounded flex items-center justify-center bg-gray-50">
                          <div className="flex items-center justify-center h-full flex-col">
                            <FileText className="h-10 w-10 text-red-500" />
                            <span className="text-xs mt-1 text-black">
                              PDF File
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {suggestions.length > 0 && (
          <div className="bg-white p-3 rounded-lg border border-green-100">
            <h3 className="text-xs font-medium text-green-700 mb-2">
              Try asking:
            </h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="text-xs bg-green-50 hover:bg-green-100 text-green-600 px-3 py-1 rounded-full"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-lg border border-green-200 p-2 w-full max-w-[200px]"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-green-700 truncate">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-32 border rounded bg-gray-50">
                  {renderFilePreview(file)}
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 bg-white rounded-xl border border-green-100 shadow-sm p-3"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for resume improvements, job application tips..."
            className="min-h-[60px] border-0 focus-visible:ring-1 focus-visible:ring-green-300 text-sm"
            disabled={isLoading || isStreaming}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() || files.length > 0) {
                  handleSubmit(e as unknown as FormEvent);
                }
              }
            }}
          />
          <div className="flex justify-between items-center mt-2">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,application/pdf"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={triggerFileInput}
                disabled={isLoading || isStreaming || files.length > 0}
                className={`text-green-700 ${
                  files.length > 0 ? "opacity-50" : "hover:bg-green-50"
                }`}
              >
                <FileUp className="h-4 w-4 mr-1" />
                <span className="text-sm font-bold">Attach PDF resume</span>
              </Button>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={
                isLoading ||
                isStreaming ||
                (!input.trim() && files.length === 0)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading || isStreaming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  <span className="text-sm">
                    {isLoading ? "Processing" : "Responding..."}
                  </span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  <span className="text-sm font-bold">Send</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {selectedAgent && (
          <div className="absolute top-4 right-4 text-xs bg-white rounded-full px-3 py-1 shadow-sm border border-green-200 text-green-700 flex items-center gap-1">
            <Bot className="h-3 w-3" />
            <span>Scrubby</span>
          </div>
        )}
      </div>
    </div>
  );
}
