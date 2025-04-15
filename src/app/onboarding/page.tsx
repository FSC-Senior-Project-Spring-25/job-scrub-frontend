"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { db } from "../firebase"
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore"
import { toast } from "sonner"
import { useAuth } from "../auth-context"
import { Check, ChevronLeft, ChevronRight, FileText, Plus, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"

export default function Onboarding() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    bio: "",
    phone: "",
    profileIcon: "",
    isPrivate: false,
    education: [] as string[],
    experience: [] as string[],
    resume_id: null as string | null,
  })

  // Resume upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Education state
  const [newEducation, setNewEducation] = useState("")
  const [isAddingEducation, setIsAddingEducation] = useState(false)

  // Experience state
  const [newExperience, setNewExperience] = useState("")
  const [isAddingExperience, setIsAddingExperience] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        router.push("/login")
        return
      }

      try {
        const userRef = doc(db, "users", user.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const data = userSnap.data()
          setUserData({
            username: data.username || "",
            email: data.email || user.email || "",
            bio: data.bio || "",
            phone: data.phone || "",
            profileIcon: data.profileIcon || "",
            isPrivate: data.isPrivate || false,
            education: data.education || [],
            experience: data.experience || [],
            resume_id: data.resume_id || null,
          })

          if (data.resume_id) {
            await fetchResumePreview(data.resume_id)
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast.error("Failed to load your profile data")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user, router])

  const fetchResumePreview = async (resumeId: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/resume/view?key=${encodeURIComponent(resumeId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error("Failed to fetch preview")

      const blob = await response.blob()
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (error) {
      console.error("Preview error:", error)
      toast.error("Failed to load resume preview")
    }
  }

  // Handle file selection for resume
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

  // Handle resume upload
  const handleUpload = async () => {
    if (!selectedFile || !user) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("user_id", user.uid)

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
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        resume_id: data.file_id,
      })

      setUserData((prev) => ({
        ...prev,
        resume_id: data.file_id,
      }))

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

  // Handle delete resume
  const handleDeleteResume = async () => {
    if (!userData.resume_id || !user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/resume/delete?key=${encodeURIComponent(userData.resume_id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error("Delete failed")

      // Update Firestore to remove the resume ID
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        resume_id: null,
      })

      // Reset state
      setPreviewUrl(null)
      setUserData((prev) => ({
        ...prev,
        resume_id: null,
      }))

      toast.success("Resume deleted successfully")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete resume")
    }
  }

  // Handle add education
  const handleAddEducation = async () => {
    if (!newEducation.trim() || !user) return

    try {
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        education: arrayUnion(newEducation),
      })

      setUserData((prev) => ({
        ...prev,
        education: [...prev.education, newEducation],
      }))

      setNewEducation("")
      setIsAddingEducation(false)
      toast.success("Education added successfully")
    } catch (error) {
      console.error("Error adding education:", error)
      toast.error("Failed to add education")
    }
  }

  // Handle delete education
  const handleDeleteEducation = async (item: string) => {
    if (!user) return

    try {
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        education: arrayRemove(item),
      })

      setUserData((prev) => ({
        ...prev,
        education: prev.education.filter((edu) => edu !== item),
      }))

      toast.success("Education removed successfully")
    } catch (error) {
      console.error("Error removing education:", error)
      toast.error("Failed to remove education")
    }
  }

  // Handle add experience
  const handleAddExperience = async () => {
    if (!newExperience.trim() || !user) return

    try {
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        experience: arrayUnion(newExperience),
      })

      setUserData((prev) => ({
        ...prev,
        experience: [...prev.experience, newExperience],
      }))

      setNewExperience("")
      setIsAddingExperience(false)
      toast.success("Experience added successfully")
    } catch (error) {
      console.error("Error adding experience:", error)
      toast.error("Failed to add experience")
    }
  }

  // Handle delete experience
  const handleDeleteExperience = async (item: string) => {
    if (!user) return

    try {
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        experience: arrayRemove(item),
      })

      setUserData((prev) => ({
        ...prev,
        experience: prev.experience.filter((exp) => exp !== item),
      }))

      toast.success("Experience removed successfully")
    } catch (error) {
      console.error("Error removing experience:", error)
      toast.error("Failed to remove experience")
    }
  }

  // Handle bio and personal info updates
  const handleUpdateProfile = async () => {
    if (!user) return

    try {
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        username: userData.username,
        bio: userData.bio,
        phone: userData.phone,
        profileIcon: userData.profileIcon,
        isPrivate: userData.isPrivate,
      })

      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    setUserData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleFinish = async () => {
    await handleUpdateProfile()
    router.push("/dashboard")
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle className="text-center">Loading...</CardTitle>
            <CardDescription className="text-center">Setting up your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={75} className="w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Complete Your Profile</CardTitle>
            <CardDescription className="text-center">Let's set up your profile to help you get started</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      currentStep >= step ? "bg-green-600 border-green-600 text-white" : "border-gray-300 text-gray-400"
                    }`}
                  >
                    {currentStep > step ? <Check className="h-5 w-5" /> : step}
                  </div>
                ))}
              </div>
              <Progress value={(currentStep - 1) * 33.33} className="h-2 mb-2 bg-green-600" />


              <div className="flex justify-between text-xs text-gray-500">
                <span>Personal Info</span>
                <span>Resume</span>
                <span>Education</span>
                <span>Experience</span>
              </div>
            </div>

            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="username" className="text-base">
                    Full Name
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={userData.username}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-base">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={userData.phone}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <Label htmlFor="bio" className="text-base">
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={userData.bio}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPrivate"
                    checked={userData.isPrivate}
                    onCheckedChange={(checked) => setUserData((prev) => ({ ...prev, isPrivate: checked }))}
                  />
                  <Label htmlFor="isPrivate">Make my profile private</Label>
                </div>
              </div>
            )}

            {/* Step 2: Resume Upload */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Upload Your Resume</h3>

                  {previewUrl ? (
                    <Card className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-8 w-8 text-red-500" />
                            <span>Your Resume.pdf</span>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                                View
                              </a>
                            </Button>
                            <Button variant="destructive" size="sm" onClick={handleDeleteResume}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        id="resume"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {selectedFile ? (
                        <div className="my-3">
                          <p className="text-sm text-gray-600 mb-3">Selected file: {selectedFile.name}</p>
                          <Button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? "Uploading..." : "Upload Resume"}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 mb-4">Drag and drop your resume or click to browse</p>
                          <Label
                            htmlFor="resume"
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md cursor-pointer inline-block"
                          >
                            Select PDF
                          </Label>
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-sm text-gray-500 italic mt-3">
                    Please upload your resume in PDF format only. Maximum file size: 5MB.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Education */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Your Education</h3>

                  {userData.education.length > 0 ? (
                    <div className="space-y-3">
                      {userData.education.map((edu, index) => (
                        <Card key={index} className="bg-gray-50 border border-gray-200">
                          <CardContent className="p-4 flex items-center justify-between">
                            <span className="text-sm">{edu}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEducation(edu)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-gray-50 border border-gray-200">
                      <CardContent className="p-6 text-center">
                        <p className="text-gray-500 italic">No education entries added yet.</p>
                      </CardContent>
                    </Card>
                  )}

                  {isAddingEducation ? (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        value={newEducation}
                        onChange={(e) => setNewEducation(e.target.value)}
                        placeholder="Example: Bachelor of Science in Computer Science, Stanford University, 2018-2022"
                        className="w-full"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <Button onClick={handleAddEducation} className="bg-green-600 hover:bg-green-700">
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddingEducation(false)
                            setNewEducation("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingEducation(true)}
                      className="mt-4 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Education
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Experience */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Your Experience</h3>

                  {userData.experience.length > 0 ? (
                    <div className="space-y-3">
                      {userData.experience.map((exp, index) => (
                        <Card key={index} className="bg-gray-50 border border-gray-200">
                          <CardContent className="p-4 flex items-center justify-between">
                            <span className="text-sm">{exp}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExperience(exp)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-gray-50 border border-gray-200">
                      <CardContent className="p-6 text-center">
                        <p className="text-gray-500 italic">No experience entries added yet.</p>
                      </CardContent>
                    </Card>
                  )}

                  {isAddingExperience ? (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        value={newExperience}
                        onChange={(e) => setNewExperience(e.target.value)}
                        placeholder="Example: Software Engineer, Google, Jan 2020 - Present. Developed and maintained scalable web applications."
                        className="w-full"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <Button onClick={handleAddExperience} className="bg-green-600 hover:bg-green-700">
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddingExperience(false)
                            setNewExperience("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingExperience(true)}
                      className="mt-4 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Experience
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            ) : (
              <div></div>
            )}

            {currentStep < 4 ? (
              <Button onClick={nextStep} className="bg-green-600 hover:bg-green-700">
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                Complete Profile
                <Check className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
