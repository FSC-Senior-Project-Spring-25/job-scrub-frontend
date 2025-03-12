"use client";
import React, { useState, useEffect } from "react";
import { FaFileAlt, FaPlus, FaTrash } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { auth } from "@/app/firebase";
import { toast } from "sonner";

interface Resume {
  key: string;
  url: string;
}

export default function ResumeSection() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  //  Fetch uploaded resumes from backend
  const fetchResumes = async (resumeKey: string) => {
    if (!auth.currentUser) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/resume/view?key=${encodeURIComponent(resumeKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch resumes");

      const data = await response.json();
      setResumes(data.resumes || []);
    } catch (error) {
      console.error("Error fetching resumes:", error);
      toast.error("Error fetching resumes. Please try again.");
    }
  };

  // useEffect(() => {
  //   if (auth.currentUser) {
  //     fetchResumes();
  //   }
  // }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file.");
      return;
    }
    if (!auth.currentUser) {
      toast.error("User not authenticated.");
      return;
    }

    const token = await auth.currentUser.getIdToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", auth.currentUser.uid);

    setUploading(true);

    try {
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      toast.success(" Resume uploaded successfully!");

      const data = await response.json();
      const resumeKey = data.file_id
      fetchResumes(resumeKey);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload resume.");
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const handleDeleteResume = async (fileName: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/delete-resume?file_name=${fileName}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Delete failed");

      toast.success(" Resume deleted successfully!");
      setResumes((prev) => prev.filter((file) => file.key !== fileName));

      // Clear preview if the deleted resume was being viewed
      if (previewUrl && previewUrl.includes(fileName)) {
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete resume.");
    }
  };

  const handlePreviewResume = (resumeUrl: string) => {
    setPreviewUrl(resumeUrl);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow w-full h-full flex flex-col">
      <h3 className="text-xl font-semibold flex items-center mb-4 border-b pb-2">
        <FaFileAlt className="mr-2 text-2xl text-green-600" /> Uploaded Resumes
      </h3>

      {/* List Uploaded Resumes */}
      <ul className="list-none space-y-3 text-gray-700 flex-grow">
        {resumes.length > 0 ? (
          resumes.map((resume) => (
            <li key={resume.key} className="flex justify-between items-center border-b pb-2">
              <button
                onClick={() => handlePreviewResume(resume.url)}
                className="text-blue-600 hover:underline"
              >
                {resume.key.split("/").pop()}
              </button>
              <button
                onClick={() => handleDeleteResume(resume.key)}
                className="text-red-500 hover:text-red-700 transition"
              >
                <FaTrash />
              </button>
            </li>
          ))
        ) : (
          <p className="text-gray-500">No resumes uploaded yet.</p>
        )}
      </ul>

      {/* File Upload Input  */}
      <div className="flex items-center mt-4">
        <input type="file" accept="application/pdf" onChange={handleFileChange} className="border rounded p-2 w-full" />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`ml-2 px-3 py-1 text-sm text-white rounded flex items-center ${
            uploading ? "bg-gray-400" : "bg-green-500"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
            </>
          ) : (
            <>
              <FaPlus className="mr-1" /> Upload
            </>
          )}
        </button>
      </div>

      {/* Resume Preview Section */}
      {previewUrl && (
        <div className="mt-6 border rounded-lg overflow-hidden">
          <h3 className="text-lg font-semibold mb-2">Resume Preview</h3>
          <object
            data={previewUrl}
            type="application/pdf"
            className="w-full h-96"
          >
            <p>
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
      )}
    </div>
  );
}
