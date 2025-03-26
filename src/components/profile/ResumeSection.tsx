"use client";
import React, { useState, useEffect } from "react";
import { FaFileAlt, FaPlus, FaTrash } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/app/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import FileUpload from "../file-upload";
import { useAuth } from "@/app/auth-context";

interface ResumeData {
  success: boolean;
  filename: string;
  file_id: string;
}

export default function ResumeSection() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  
  // Fetch resume data from Firestore
  useEffect(() => {
    const fetchResumeData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().resume_id) {
          const storedResumeId = userDoc.data().resume_id;
          setResumeId(storedResumeId);
          await fetchResumePreview(storedResumeId);
        }
      } catch (error) {
        console.error("Error fetching resume data:", error);
        toast.error("Failed to load your resume data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchResumeData();
  }, [user]);
  
  // Fetch resume preview by ID
  const fetchResumePreview = async (resumeKey: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/resume/view?key=${encodeURIComponent(resumeKey)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch resume preview");

      const data = await response.json();
      if (data && data.url) {
        setPreviewUrl(data.url);
      } else {
        throw new Error("No URL returned from server");
      }
    } catch (error) {
      console.error("Error fetching resume preview:", error);
      toast.error("Failed to load resume preview");
    } finally {
      setLoading(false);
    }
  };

  // Upload the resume and store the ID in Firestore
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }
    
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    setUploading(true);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("user_id", user.uid);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      
      // Get the file_id from the response
      const fileId = data.file_id;
      
      // Update Firestore with the resume ID
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        resume_id: fileId
      });
      
      setResumeId(fileId);
      toast.success("Resume uploaded successfully!");
      
      // Fetch the preview for the newly uploaded resume
      await fetchResumePreview(fileId);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload resume");
    } finally {
      setUploading(false);
      setLoading(false);
      setSelectedFile(null);
    }
  };

  // Delete the resume
  const handleDeleteResume = async () => {
    if (!user || !resumeId) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/resume/delete?key=${encodeURIComponent(resumeId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Delete failed");

      // Update Firestore to remove the resume ID
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        resume_id: null
      });

      // Reset state
      setResumeId(null);
      setPreviewUrl(null);
      
      toast.success("Resume deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete resume.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow w-full h-full flex flex-col">
      <h3 className="text-xl font-semibold flex items-center mb-4 border-b pb-2">
        <FaFileAlt className="mr-2 text-2xl text-green-600" /> Your Resume
      </h3>

      {/* File Upload Section */}
      <div className="mb-6 border-b pb-6">
        <FileUpload
          onFileChange={setSelectedFile}
          label="Upload Resume"
          description="Upload your resume in PDF format"
        />

        {selectedFile && (
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-gray-600">
              Selected file: {selectedFile.name}
            </p>
            <Button 
              onClick={handleUpload} 
              disabled={uploading} 
              className={`px-3 py-1 text-sm text-white rounded flex items-center ${
                uploading ? "bg-gray-400" : "bg-green-500"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                </>
              ) : (
                <>
                  <FaPlus className="mr-1" /> {resumeId ? "Replace Resume" : "Upload Resume"}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Resume Preview Section */}
      <div className="flex-grow">
        {loading ? (
          <div className="flex justify-center items-center h-64 border rounded-lg bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : resumeId && previewUrl ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Current Resume</h4>
              <button
                onClick={handleDeleteResume}
                className="text-red-500 hover:text-red-700 transition flex items-center gap-1 text-sm"
              >
                <FaTrash size={12} /> Delete Resume
              </button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <object
                data={previewUrl}
                type="application/pdf"
                className="w-full h-96"
              >
                <p className="p-4 text-center">
                  Unable to display PDF.{" "}
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-600 hover:underline"
                  >
                    Open in new tab
                  </a>
                </p>
              </object>
            </div>
            <div className="flex justify-end mt-2">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Open in new tab
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center h-64 border rounded-lg bg-gray-50">
            <p className="text-gray-500 mb-2">No resume uploaded yet</p>
            <p className="text-gray-400 text-sm">Upload a PDF resume to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}