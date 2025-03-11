"use client";
import React, { useState, useEffect } from "react";
import { FaFileAlt, FaPlus, FaTrash } from "react-icons/fa";
import { auth } from "@/app/firebase";

interface Resume {
  key: string;
  url: string;
}

export default function ResumeSection() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);

  // ✅ Fetch uploaded resumes from backend
  const fetchResumes = async () => {
    if (!auth.currentUser) return;

    try {
      const response = await fetch("/api/get-resumes");
      if (!response.ok) throw new Error("Failed to fetch resumes");

      const data = await response.json();
      setResumes(data.resumes || []);
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchResumes();
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        alert("Please upload a PDF file.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }
    if (!auth.currentUser) {
      alert("User not authenticated");
      return;
    }

    const token = await auth.currentUser.getIdToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", auth.currentUser.uid);

    setUploading(true);

    try {
      console.log("📡 Uploading file:", file.name);
      const response = await fetch("/api/upload-resume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      alert("✅ Resume uploaded successfully!");
      fetchResumes();
    } catch (error) {
      console.error("🔥 Upload error:", error);
      alert("Failed to upload resume.");
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const handleDeleteResume = async (fileName: string) => {
    try {
      const response = await fetch(`/api/delete-resume?file_name=${fileName}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      alert("✅ Resume deleted successfully!");
      setResumes((prev) => prev.filter((file) => file.key !== fileName));
    } catch (error) {
      console.error("🔥 Delete error:", error);
      alert("Failed to delete resume.");
    }
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
              <a href={resume.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {resume.key.split("/").pop()}
              </a>
              <button onClick={() => handleDeleteResume(resume.key)} className="text-red-500 hover:text-red-700 transition">
                <FaTrash />
              </button>
            </li>
          ))
        ) : (
          <p className="text-gray-500">No resumes uploaded yet.</p>
        )}
      </ul>

      {/* File Upload Input */}
      <div className="flex items-center mt-4">
        <input type="file" accept="application/pdf" onChange={handleFileChange} className="border rounded p-2 w-full" />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`ml-2 px-3 py-1 text-sm text-white rounded flex items-center ${uploading ? "bg-gray-400" : "bg-green-500"}`}
        >
          {uploading ? "Uploading..." : <><FaPlus className="mr-1" /> Upload</>}
        </button>
      </div>
    </div>
  );
}
