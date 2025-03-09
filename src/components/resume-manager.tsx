"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import FileUpload from "./file-upload";

interface ResumeData {
  success: boolean;
  filename: string;
  file_id: string;
}

export default function ResumeManager() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    try {
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to upload resume");
      }
      
      const data = await response.json();
      handleUploadSuccess(data);
    } catch (err) {
      console.error("Error uploading resume:", err);
      toast.error("Error uploading resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (data: ResumeData) => {
    console.log("File uploaded successfully:", data);
    setResumeData(data);
    // Clear any previous URL when a new file is uploaded
    setResumeUrl(null);
    toast.success("Resume uploaded successfully!");
  };

  const loadResumePreview = async () => {
    if (!resumeData?.file_id) return;
    
    setLoading(true);
    setError(null);
    setResumeUrl(null); // Clear any previous URL
    
    try {
      const response = await fetch(`/api/resume/view?key=${encodeURIComponent(resumeData.file_id)}`, {
        method: "GET"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to fetch resume URL");
      }
      
      const data = await response.json();
      console.log("Resume data:", data);
      
      // Update the state with the URL
      if (data && data.url) {
        setResumeUrl(data.url);
      } else {
        throw new Error("No URL returned from the server");
      }
    } catch (err) {
      console.error("Error loading resume:", err);
      toast.error("Error loading resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load the preview when resumeData changes
  useEffect(() => {
    if (resumeData?.file_id) {
      loadResumePreview();
    }
  }, [resumeData]);

  // For debugging
  useEffect(() => {
    console.log("Resume URL updated:", resumeUrl);
  }, [resumeUrl]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Resume Manager</h1>
      
      <div className="space-y-6">
        <FileUpload
          onFileChange={setSelectedFile}
          label="Upload Resume"
          description="Upload your resume in PDF format"
        />
        
        {selectedFile && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Selected file: {selectedFile.name}
            </p>
            <Button 
              onClick={handleUpload} 
              disabled={loading || !selectedFile}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : "Upload Resume"}
            </Button>
          </div>
        )}
      </div>
      
      {resumeData && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Resume</h2>
            <Button 
              onClick={loadResumePreview} 
              variant="outline"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : "Refresh Preview"}
            </Button>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {resumeUrl ? (
            <div className="space-y-2">
              <div className="border rounded-lg overflow-hidden">
                <object
                  data={resumeUrl}
                  type="application/pdf"
                  className="w-full h-96"
                >
                  <p>Unable to display PDF. 
                    <a 
                      href={resumeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-1 text-blue-600 hover:underline"
                    >
                      Open PDF in new tab
                    </a>
                  </p>
                </object>
              </div>
              <div className="flex justify-end">
                <a 
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Open in new tab
                </a>
              </div>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center h-96 border rounded-lg bg-gray-50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex justify-center items-center h-96 border rounded-lg bg-gray-50">
              <p className="text-muted-foreground">Click "Refresh Preview" to load your resume</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}