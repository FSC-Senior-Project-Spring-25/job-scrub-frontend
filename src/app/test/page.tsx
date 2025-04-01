"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, FileUp, XCircle } from "lucide-react";
import { useAuth } from "../auth-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
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

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return;

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: input, timestamp: Date.now() }]);
    
    // Create temporary placeholder for assistant response
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "" },
    ]);
    
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
      // Start the streaming request
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/stream`, {
        method: "POST",
        body: formData,
        headers: {
            "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body cannot be read");

      // Create a TextDecoder to decode the received chunks
      const decoder = new TextDecoder();
      let assistantResponse = "";

      // Update the last message (assistant's response) as chunks arrive
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value);
        
        // Process SSE format (data: [content]\n\n)
        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const content = line.substring(6);
            
            // Check if we're done or if there's an error
            if (content === "[DONE]") {
              break;
            } else if (content.startsWith("Error:")) {
              throw new Error(content);
            } else {
              try {
                // Check if this is a history update message
                if (content.startsWith('{"type":"history","conversation":')) {
                  const historyData = JSON.parse(content);
                  setConversationHistory(historyData.conversation);
                  continue;
                }
              } catch (e) {
                // Not JSON, treat as regular text chunk
              }
              
              // Append the chunk to the assistant's response
              assistantResponse += content;
              
              // Update the last message (assistant's response)
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantResponse,
                  timestamp: Date.now()
                };
                return updated;
              });
            }
            if (content === "[DONE]") break;
            if (content.startsWith("Error:")) throw new Error(content);
            
            assistantResponse += content;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantResponse };
              return updated;
            });
          }
        }
      }

      // Clear files after successful submission
      setFiles([]);
    } catch (error) {
      console.error("Error:", error);
      // Update the last message to show the error
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
          timestamp: Date.now()
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chatbot Test Interface</h1>
      
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