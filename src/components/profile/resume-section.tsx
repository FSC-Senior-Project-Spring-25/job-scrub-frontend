"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/app/firebase"
import { toast } from "sonner"
import { FileText, Upload, Trash2, Download, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/app/auth-context"

interface ResumeSectionProps {
  resumeId: string | null | undefined
  isOwnProfile: boolean
  uid: string
}

export default function ResumeSection({ resumeId, isOwnProfile, uid }: ResumeSectionProps) {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (resumeId) {
      fetchResumePreview(resumeId)
    }
  }, [resumeId])

  const fetchResumePreview = async (id: string) => {
    if (!user) return

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/resume/view?key=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error("Failed to fetch resume preview")

      const data = await response.json()
      if (data && data.url) {
        setPreviewUrl(data.url)
      }
    } catch (error) {
      console.error("Error fetching resume preview:", error)
      toast.error("Failed to load resume preview")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please select a PDF file")
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("user_id", uid)

      const token = await user.getIdToken()
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Upload failed")
      }

      const data = await response.json()

      // Update Firestore with the resume ID
      const userRef = doc(db, "users", uid)
      await updateDoc(userRef, {
        resume_id: data.file_id,
      })

      toast.success("Resume uploaded successfully")

      // Fetch the preview for the newly uploaded resume
      await fetchResumePreview(data.file_id)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload resume")
    } finally {
      setUploading(false)
      setSelectedFile(null)
    }
  }

  const handleDeleteResume = async () => {
    if (!resumeId || !user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/resume/delete?key=${encodeURIComponent(resumeId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error("Delete failed")

      // Update Firestore to remove the resume ID
      const userRef = doc(db, "users", uid)
      await updateDoc(userRef, {
        resume_id: null,
      })

      // Reset state
      setPreviewUrl(null)

      toast.success("Resume deleted successfully")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete resume")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center">
          <FileText className="mr-2 h-5 w-5 text-green-600" />
          Resume
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : resumeId && previewUrl ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Current Resume</h3>
              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteResume}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <object data={previewUrl} type="application/pdf" className="w-full h-[500px]">
                <p className="p-4 text-center">
                  Unable to display PDF.{" "}
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open in new tab
                  </a>
                </p>
              </object>
            </div>

            <div className="flex justify-end">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center text-blue-600 hover:underline"
              >
                <Download className="mr-1 h-4 w-4" />
                Download Resume
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 space-y-4">
            <FileText className="h-16 w-16 mx-auto text-gray-300" />
            <p className="text-gray-500">
              {isOwnProfile ? "Upload your resume to showcase your skills and experience." : "No resume available."}
            </p>

            {isOwnProfile && (
              <div className="max-w-sm mx-auto">
                <label className="block">
                  <div className="flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="space-y-2 text-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                      </div>
                      <p className="text-xs text-gray-500">PDF (MAX. 10MB)</p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                  </div>
                </label>

                {selectedFile && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>
                    <Button onClick={handleUpload} disabled={uploading} className="w-full">
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Resume
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
