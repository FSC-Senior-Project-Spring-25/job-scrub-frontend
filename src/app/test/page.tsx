"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, FileUp, XCircle, FileText, Bot, User, Sparkles } from "lucide-react";
import { useAuth } from "../auth-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  files?: Array<{
    name: string;
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

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: Date.now(),
      files: files.map(file => ({ name: file.name }))
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const userInput = input;
    setInput("");

    try {
      const formData = new FormData();
      formData.append("message", userInput);
      formData.append("conversation_history", JSON.stringify(conversationHistory));
      
      files.forEach((file) => {
        formData.append("files", file);
      });
      
      const token = await user?.getIdToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/message`, {
        method: "POST",
        body: formData,
        headers: token ? {
          "Authorization": `Bearer ${token}`
        } : {},
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data: ChatResponse = await response.json();
      
      setConversationHistory(data.conversation);
      if (data.conversation_id) setConversationId(data.conversation_id);
      if (data.selected_agent) setSelectedAgent(data.selected_agent);
      
      setMessages(prev => [
        ...prev, 
        {
          role: "assistant",
          content: data.response,
          timestamp: Date.now()
        }
      ]);

      setFiles([]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-green-200 to-green-100">
      {/* Centered Content Column */}
      <div className="flex-1 overflow-hidden max-w-2xl w-full mx-auto flex flex-col p-4 gap-4">
        {/* Welcome Card (only shows when no messages) */}
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
                Upload your resume and get personalized improvement suggestions
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-green-700 bg-green-50 rounded-full py-1 px-3 w-fit mx-auto">
                <Bot className="h-3 w-3" />
                <span>AI-powered feedback</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div 
                className={`max-w-[85%] rounded-xl p-3 ${message.role === "user" 
                  ? "bg-green-600 text-white" 
                  : "bg-white border border-green-200 shadow-sm"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.role === "user" ? (
                    <User className="h-4 w-4 text-green-200" />
                  ) : (
                    <Bot className="h-4 w-4 text-green-600" />
                  )}
                  <span className={`text-xs font-medium ${message.role === "user" ? "text-green-100" : "text-green-700"}`}>
                    {message.role === "user" ? "You" : "Resume Assistant"}
                  </span>
                  <span className={`text-xs ${message.role === "user" ? "text-green-200" : "text-gray-500"}`}>
                    {message.timestamp && new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`whitespace-pre-wrap text-sm ${message.role === "user" ? "text-white" : "text-gray-700"}`}>
                  {message.content}
                </div>
                
                {message.files && message.files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.files.map((file, fileIndex) => (
                      <div 
                        key={fileIndex} 
                        className={`flex items-center text-xs rounded-full px-2 py-1 ${message.role === "user" 
                          ? "bg-green-500 text-green-50" 
                          : "bg-green-100 text-green-800"}`}
                      >
                        <FileUp className="h-3 w-3 mr-1" />
                        <span className="truncate max-w-[120px]">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* File attachments */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center bg-white rounded-full px-3 py-1 text-sm text-green-800 border border-green-200"
              >
                <FileUp className="h-3 w-3 mr-1 text-green-600" />
                <span className="truncate max-w-[100px]">{file.name}</span>
                <button 
                  onClick={() => removeFile(index)}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  <XCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="sticky bottom-0 bg-white rounded-xl border border-green-200 shadow-sm p-3">
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
                accept=".pdf,.doc,.docx,.txt"
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
                <span className="text-sm font-bold">Attach</span>
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

        {/* Agent indicator (floating) */}
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