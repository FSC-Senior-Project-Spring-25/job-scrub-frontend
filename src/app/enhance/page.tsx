"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
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

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  files?: Array<{
    name: string;
    type: string;
  }>;
}

interface ChatResponse {
  response: string;
  conversation: any[];
  conversation_id: string;
  selected_agent: string;
}

export default function ResumeEnhancer() {
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

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    const userInput = input;
    setInput("");

    try {
      const formData = new FormData();
      formData.append("message", userInput);
      formData.append(
        "conversation_history",
        JSON.stringify(conversationHistory)
      );

      files.forEach((file) => {
        formData.append("files", file);
      });

      const token = await user?.getIdToken();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/message`,
        {
          method: "POST",
          body: formData,
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
          credentials: "include",
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data: ChatResponse = await response.json();

      setConversationHistory(data.conversation);
      if (data.conversation_id) setConversationId(data.conversation_id);
      if (data.selected_agent) setSelectedAgent(data.selected_agent);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          timestamp: Date.now(),
        },
      ]);

      setFiles([]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${
            error instanceof Error ? error.message : "Something went wrong"
          }`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Accept  only accept PDF files
      const pdfFiles = newFiles.filter(
        (file) => file.type === "application/pdf"
      );

      if (pdfFiles.length === 0 && newFiles.length > 0) {
        // Show error if any other files were selected
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

      // Only set PDF files
      setFiles((prev) => [...prev, ...pdfFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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

  function SimpleMarkdown({ content }: { content: string }) {
    // Split content into blocks (paragraphs, headers, lists, etc.)
    const blocks = content.split(/\n\n+/);
  
    return (
      <div className="text-sm text-gray-800 w-full">
        {blocks.map((block, blockIndex) => {
          // Handle different heading levels
          if (block.startsWith("# ")) {
            return (
              <h1 key={blockIndex} className="text-xl font-bold mt-4 mb-2 text-green-800">
                {block.substring(2)}
              </h1>
            );
          }
  
          if (block.startsWith("## ")) {
            return (
              <h2 key={blockIndex} className="text-lg font-bold mt-3 mb-2 text-green-700">
                {block.substring(3)}
              </h2>
            );
          }
  
          if (block.startsWith("### ")) {
            return (
              <h3 key={blockIndex} className="text-base font-semibold mt-2 mb-1 text-green-700">
                {block.substring(4)}
              </h3>
            );
          }
  
          if (block.startsWith("#### ")) {
            return (
              <h4 key={blockIndex} className="text-sm font-bold mt-2 mb-1 text-green-600">
                {block.substring(5)}
              </h4>
            );
          }
  
          // Lists
          if (block.match(/^[*-] /m)) {
            const items = block.split(/\n/).filter(item => item.trim().length > 0);
            
            return (
              <ul key={blockIndex} className="list-disc pl-5 my-2 space-y-1">
                {items.map((item, itemIndex) => {
                  const itemContent = item.replace(/^[*-] /, "");
                  
                  return (
                    <li key={itemIndex} className="text-gray-700">
                      {formatInlineMarkdown(itemContent)}
                    </li>
                  );
                })}
              </ul>
            );
          }
  
          // Regular paragraph with inline formatting
          return (
            <p key={blockIndex} className="my-2 whitespace-pre-wrap">
              {formatInlineMarkdown(block)}
            </p>
          );
        })}
      </div>
    );
    
    // Helper function to format inline markdown
    function formatInlineMarkdown(text: string) {
      const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/);
      
      return parts.map((part, partIndex) => {
        // Bold text
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={partIndex} className="font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
  
        // Italic text
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={partIndex} className="italic">
              {part.slice(1, -1)}
            </em>
          );
        }
  
        // Code
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={partIndex}
              className="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono text-sm"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
  
        // Links
        if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
          const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
          if (linkMatch) {
            return (
              <a 
                key={partIndex}
                href={linkMatch[2]} 
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {linkMatch[1]}
              </a>
            );
          }
        }
  
        // Plain text
        return part;
      });
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-green-200 to-green-100">
      <div className="flex-1 overflow-hidden max-w-3xl w-full mx-auto flex flex-col p-4 gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-green-200 w-full text-center">
              <div className="flex justify-center mb-3">
                <div className="bg-green-100 p-3 rounded-full">
                  <Sparkles className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-green-800 mb-2 flex items-center justify-center gap-2">
                <FileText className="h-5 w-5" /> Resume Enhancer Chatbot
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
                    ? "bg-green-600 text-white"
                    : "bg-white border border-green-200 shadow-sm"
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
                    {message.role === "user" ? "You" : "Assistant"}
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
                ) : (
                  <SimpleMarkdown content={message.content} />
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
          <div className="bg-white p-3 rounded-lg border border-green-200">
            <h3 className="text-xs font-medium text-green-700 mb-2">
              Try asking:
            </h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1 rounded-full"
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
          className="sticky bottom-0 bg-white rounded-xl border border-green-200 shadow-sm p-3"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for resume improvements, job application tips..."
            className="min-h-[60px] border-0 focus-visible:ring-1 focus-visible:ring-green-300 text-sm"
            disabled={isLoading}
          />
          <div className="flex justify-between items-center mt-2">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept=".pdf,application/pdf"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={triggerFileInput}
                disabled={isLoading}
                className="text-green-700 hover:bg-green-50"
              >
                <FileUp className="h-4 w-4 mr-1" />
                <span className="text-sm font-bold">Attach PDF resume</span>
              </Button>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={isLoading || (!input.trim() && files.length === 0)}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  <span className="text-sm">Processing</span>
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
            <span>{selectedAgent}</span>
          </div>
        )}
      </div>
    </div>
  );
}
