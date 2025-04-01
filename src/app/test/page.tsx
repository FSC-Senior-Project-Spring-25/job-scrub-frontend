"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, FileUp, XCircle } from "lucide-react";
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

export default function ChatbotTestPage() {
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

    // Add user message to chat
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
      // Create form data with message and files
      const formData = new FormData();
      formData.append("message", userInput);
      formData.append("conversation_history", JSON.stringify(conversationHistory));
      
      files.forEach((file) => {
        formData.append("files", file);
      });
      
      const token = await user?.getIdToken();
      
      // Use the non-streaming chat endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/message`, {
        method: "POST",
        body: formData,
        headers: token ? {
          "Authorization": `Bearer ${token}`
        } : {},
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      // Update conversation history from response
      setConversationHistory(data.conversation);
      
      // Set conversation ID if available
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      
      // Update selected agent if available
      if (data.selected_agent) {
        setSelectedAgent(data.selected_agent);
      }
      
      // Add assistant response to messages
      setMessages(prev => [
        ...prev, 
        {
          role: "assistant",
          content: data.response,
          timestamp: Date.now()
        }
      ]);

      // Clear files after successful submission
      setFiles([]);
    } catch (error) {
      console.error("Error:", error);
      // Add error message
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
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chatbot Test Interface</h1>
      
      {selectedAgent && (
        <div className="mb-4 p-2 bg-blue-50 rounded-md text-sm">
          Active Agent: <span className="font-semibold">{selectedAgent}</span>
          {conversationId && (
            <span className="ml-2 text-gray-500">
              (Conversation ID: {conversationId})
            </span>
          )}
        </div>
      )}
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Send a message to start chatting
          </div>
        ) : (
          messages.map((message, index) => (
            <Card key={index} className={message.role === "user" ? "ml-12" : "mr-12"}>
              <CardContent className="p-3">
                <p className="text-sm font-semibold mb-1">
                  {message.role === "user" ? "You" : "Assistant"}
                </p>
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {message.files && message.files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.files.map((file, fileIndex) => (
                      <div key={fileIndex} className="flex items-center text-xs bg-muted rounded px-2 py-1">
                        <FileUp className="h-3 w-3 mr-1" />
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
                
                {message.timestamp && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* File attachments */}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div 
              key={index} 
              className="flex items-center bg-muted rounded-md px-2 py-1 text-sm"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button 
                onClick={() => removeFile(index)}
                className="ml-1 text-muted-foreground hover:text-destructive"
              >
                <XCircle size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Debug panel (optional) */}
      {conversationHistory.length > 0 && (
        <details className="mb-4">
          <summary className="text-sm text-muted-foreground cursor-pointer">
            Conversation History ({conversationHistory.length} items)
          </summary>
          <pre className="text-xs bg-muted p-2 rounded-md mt-2 max-h-40 overflow-auto">
            {JSON.stringify(conversationHistory, null, 2)}
          </pre>
        </details>
      )}
      
      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 min-h-[80px]"
            disabled={isLoading}
          />
        </div>
        
        <div className="flex justify-between">
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept=".pdf"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={triggerFileInput}
              disabled={isLoading}
            >
              <FileUp className="h-4 w-4 mr-2" />
              Attach PDF
            </Button>
          </div>
          
          <Button type="submit" disabled={isLoading || (!input.trim() && files.length === 0)}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}