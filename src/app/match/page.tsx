"use client"

import { useState,useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud } from "lucide-react"
import type { MatchResponse, SimilarityDetail } from "@/types/types"
import { useAuth } from "../AuthContext"
import { useRouter } from "next/navigation"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter();

  // code to check if the user is logged in 
  const {user} = useAuth(); // user object contains information about the user 


  // redirecting the user to the login page if not logged in
  useEffect(()=>{
    if(!user)  router.push("/login");
  });


  if(!user) return null; // prevents ui flickering 
// end of code to check if the user is logged in 

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0])
      }
    },
  })

  const handleSubmit = async () => {
    if (!file || !jobDescription) {
      setError("Please upload a resume and enter a job description.")
      return
    }
    setMatchResult(null)
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("resumeFile", file)
    formData.append("jobDescription", jobDescription)

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`)
      }

      const data: MatchResponse = await response.json()
      setMatchResult(data)
    } catch (err: any) {
      setError(err.message || "An error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4">Welcome to Job Scrub</h1>
      <p className="text-gray-600 mb-6">Upload your resume and enter a job description to see how well it matches.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-6">
        {/* Resume Upload Box */}
        <div
          className="p-6 flex flex-col items-center justify-center border-dashed border-2 border-gray-300 rounded-lg cursor-pointer h-60 bg-white"
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 text-gray-500 mb-2" />
          <p className="text-gray-700">Drag & drop your resume here or click to upload</p>
          {file && <p className="mt-2 text-sm text-gray-500">{file.name}</p>}
        </div>

        {/* Job Description Box */}
        <textarea
          className="p-4 border border-gray-300 rounded-lg w-full h-60 bg-white shadow-sm resize-none"
          placeholder="Enter the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>

      {/* Match Result */}
      {matchResult && (
        <div className="w-full max-w-4xl bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold mb-4">Match Results</h2>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Match Score</p>
                <p className="text-4xl font-bold text-blue-600">{(matchResult.match_score * 100).toFixed(2)}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Keyword Coverage</p>
                <p className="text-4xl font-bold text-green-600">{(matchResult.keyword_coverage * 100).toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold mb-3">Missing Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {matchResult.missing_keywords.flat().map((keyword, index) => (
                <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Keyword Matches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchResult.similarity_details.map((detail: SimilarityDetail, index: number) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span>{detail.keyword}</span>
                  <span className={`font-semibold ${detail.match_score > 0.7 ? "text-green-600" : "text-yellow-600"}`}>
                    {(detail.match_score * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-gray-200">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Resume Keywords</h3>
                <ul className="list-disc list-inside">
                  {matchResult.resume_keywords.map((keyword, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      {keyword}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Job Keywords</h3>
                <ul className="list-disc list-inside">
                  {matchResult.job_keywords.map((keyword, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      {keyword}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 mt-4">{error}</p>}

      <button
        onClick={handleSubmit}
        className="mt-6 px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition duration-300 ease-in-out"
        disabled={loading}
      >
        {loading ? "Processing..." : "Check Match"}
      </button>
    </div>
  )
}

