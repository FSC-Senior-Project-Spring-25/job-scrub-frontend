"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, FileUp, XCircle, BadgeCheck } from "lucide-react";
import { useAuth } from "../auth-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  files?: Array<{
    name: string;
  }>;
}

export default function ChatbotTestPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      files: files.map(file => ({
        name: file.name
      })),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    
    setIsLoading(true);
    setInput("");
    setFiles([]);

    try {
      const formData = new FormData();
      formData.append("message", input);
      files.forEach((file) => formData.append("files", file));
      
      const token = await user?.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/stream`, {
        method: "POST",
        body: formData,
        headers: { "Authorization": `Bearer ${token}` },
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body cannot be read");

      const decoder = new TextDecoder();
      let assistantResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const content = line.substring(6);
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
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 bg-green-50">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-full bg-green-700/10">
          <BadgeCheck className="text-green-700" size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-green-900">Resume Enhancer AI</h1>
          <p className="text-sm text-green-700">Get expert help optimizing your resume</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4 bg-white rounded-xl p-4 shadow-sm border border-green-100">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="mb-4 text-green-700">
              <FileUp className="h-8 w-8 mx-auto" />
              <p className="mt-2 font-medium">Upload your resume or ask something..</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <Card className={`max-w-[85%] ${message.role === "user" ? "bg-green-700/20 border-green-200" : "bg-white border-green-100"}`}>
                <CardContent className="p-3">
                  <p className="text-xs font-semibold mb-2 text-green-700">
                    {message.role === "user" ? "You" : "Assistant"}
                  </p>
                  
                  {message.content && (
                    <div className="whitespace-pre-wrap text-green-900 mb-3">
                      {message.content}
                    </div>
                  )}

                  {message.files?.map((file, fileIndex) => (
                    <div key={fileIndex} className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-md">
                      <FileUp className="h-4 w-4 text-green-700" />
                      <span className="text-sm font-medium text-green-900">
                        {file.name}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div 
              key={index} 
              className="flex items-center bg-green-700/5 rounded-lg px-3 py-2 text-sm border border-green-200"
            >
              <span className="truncate max-w-[150px] text-green-800">{file.name}</span>
              <button 
                onClick={() => removeFile(index)}
                className="ml-2 text-green-700 hover:text-green-900"
              >
                <XCircle size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about resume formatting, ATS optimization, or career advice..."
            className="flex-1 min-h-[100px] border-green-200 focus:border-green-300 focus:ring-green-200"
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
              className="border-green-300 text-green-700 hover:bg-green-700/5 hover:border-green-400"
            >
              <FileUp className="h-4 w-4 mr-2" />
              Upload Resume PDF
            </Button>
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading || (!input.trim() && files.length === 0)}
            className="bg-green-700 hover:bg-green-800 text-white"
          >
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