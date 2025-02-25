"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [keywordCoverage, setKeywordCoverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
  });

  const handleSubmit = async () => {
    if (!file || !jobDescription) {
      setError("Please upload a resume and enter a job description.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("resumeFile", file);
    formData.append("jobDescription", jobDescription);

    try {
      const response = await fetch("http://127.0.0.1:8000/resume/match", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setMatchScore(data.match_score ? parseFloat((data.match_score * 100).toFixed(2)) : null);
      setKeywordCoverage(data.keyword_coverage ? parseFloat((data.keyword_coverage * 100).toFixed(2)) : null);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to Job Matcher</h1>
      <p className="text-gray-600 mb-4">Upload your resume and enter a job description to see how well it matches.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Resume Upload Box */}
        <div className="p-4 flex flex-col items-center justify-center border-dashed border-2 border-gray-300 rounded-lg cursor-pointer h-60" {...getRootProps()}>
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 text-gray-500" />
          <p className="text-gray-700 mt-2">Drag & drop your resume here or click to upload</p>
          {file && <p className="mt-2 text-sm text-gray-500">{file.name}</p>}
        </div>

        {/* Job Description Box */}
        <textarea
          className="p-4 border border-gray-300 rounded-lg w-full h-60 bg-white shadow-md"
          placeholder="Enter the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>

      {/* Match Result Placeholder */}
      <div className="p-4 flex flex-col items-center justify-center border border-gray-300 rounded-lg h-60 bg-white shadow-md mt-6 w-full max-w-3xl">
        {loading ? (
          <p className="text-gray-700 text-xl font-semibold">Matching...</p>
        ) : matchScore !== null ? (
          <p className="text-gray-700 text-xl font-semibold">Match Score: {matchScore}%</p>
        ) : (
          <p className="text-gray-700 text-xl font-semibold">Match to the Job</p>
        )}

        {keywordCoverage !== null && (
          <p className="text-gray-600 text-lg">Keyword Coverage: {keywordCoverage}%</p>
        )}
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      <button
        onClick={handleSubmit}
        className="mt-4 px-6 py-3 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        disabled={loading}
      >
        {loading ? "Processing..." : "Check Match"}
      </button>
    </div>
  );
}
