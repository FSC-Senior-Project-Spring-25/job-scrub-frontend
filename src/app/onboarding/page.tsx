"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../../lib/firebase";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "../auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Briefcase,
  GraduationCap,
  User,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import AnimatedLogo from "@/components/animated-logo";
import { FormStep } from "@/components/onboarding/form-step";
import { ListItem } from "@/components/onboarding/list-item";
import FileUpload from "@/components/file-upload";
import {
  personalInfoSchema,
  educationSchema,
  experienceSchema,
} from "@/lib/schemas";

export default function Onboarding() {
  const router = useRouter();
  const { user, refreshToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
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
  });

  // Resume upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);

  // Education state
  const [newEducation, setNewEducation] = useState("");
  const [isAddingEducation, setIsAddingEducation] = useState(false);

  // Experience state
  const [newExperience, setNewExperience] = useState("");
  const [isAddingExperience, setIsAddingExperience] = useState(false);

  // Form validation
  const personalInfoForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      username: "",
      phone: "",
      bio: "",
      isPrivate: false,
    },
  });

  const educationForm = useForm<z.infer<typeof educationSchema>>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      education: "",
    },
  });

  const experienceForm = useForm<z.infer<typeof experienceSchema>>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      experience: "",
    },
  });

  // Fetch resume preview URL
  const fetchResumePreview = async (resumeId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/resume/view?key=${encodeURIComponent(resumeId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch resume preview");

      const data = await response.json();
      if (data && data.url) {
        setPreviewUrl(data.url);
      }
    } catch (error) {
      console.error("Error fetching resume preview:", error);
      toast.error("Failed to load resume preview");
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          // For Google users, if username is empty but displayName exists, use displayName
          if (!data.username && user.displayName) {
            await updateDoc(userRef, {
              username: user.displayName,
            });
            data.username = user.displayName;
          }

          // For Google users, if no profileIcon but photoURL exists, use photoURL
          if (!data.profileIcon && user.photoURL) {
            await updateDoc(userRef, {
              profileIcon: user.photoURL,
            });
            data.profileIcon = user.photoURL;
          }

          const updatedUserData = {
            username: data.username || "",
            email: data.email || user.email || "",
            bio: data.bio || "",
            phone: data.phone || "",
            profileIcon: data.profileIcon || "",
            isPrivate: data.isPrivate || false,
            education: data.education || [],
            experience: data.experience || [],
            resume_id: data.resume_id || null,
          };

          setUserData(updatedUserData);
          setResumeFileName(data.resume_filename || null);

          // If there's a resume ID, fetch the preview URL
          if (data.resume_id) {
            await fetchResumePreview(data.resume_id);
          }

          // Update form default values
          personalInfoForm.reset({
            username: updatedUserData.username,
            phone: updatedUserData.phone,
            bio: updatedUserData.bio,
            isPrivate: updatedUserData.isPrivate,
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load your profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.uid, router, personalInfoForm]);

  // Handle resume upload
  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("user_id", user.uid);

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
      console.log("Upload response:", data); // Debug log

      // Update Firestore with the resume ID and filename
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        resume_id: data.file_id,
        resume_filename: data.filename || selectedFile.name,
      });

      // Update local state
      setUserData((prev) => ({
        ...prev,
        resume_id: data.file_id,
      }));
      setResumeFileName(data.filename || selectedFile.name);

      toast.success("Resume uploaded successfully");

      // Fetch the preview URL for the newly uploaded resume
      await fetchResumePreview(data.file_id);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload resume");
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  // Handle delete resume
  const handleDeleteResume = async () => {
    if (!userData.resume_id || !user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/resume/delete?key=${encodeURIComponent(userData.resume_id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Delete failed");

      // Update Firestore to remove the resume ID and filename
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        resume_id: null,
        resume_filename: null,
      });

      // Reset state
      setPreviewUrl(null);
      setResumeFileName(null);
      setUserData((prev) => ({
        ...prev,
        resume_id: null,
      }));

      toast.success("Resume deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete resume");
    }
  };

  // Handle add education
  const handleAddEducation = async (
    values: z.infer<typeof educationSchema>
  ) => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        education: arrayUnion(values.education),
      });

      setUserData((prev) => ({
        ...prev,
        education: [...prev.education, values.education],
      }));

      educationForm.reset();
      setIsAddingEducation(false);
      toast.success("Education added successfully");
    } catch (error) {
      console.error("Error adding education:", error);
      toast.error("Failed to add education");
    }
  };

  // Handle delete education
  const handleDeleteEducation = async (item: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        education: arrayRemove(item),
      });

      setUserData((prev) => ({
        ...prev,
        education: prev.education.filter((edu) => edu !== item),
      }));

      toast.success("Education removed successfully");
    } catch (error) {
      console.error("Error removing education:", error);
      toast.error("Failed to remove education");
    }
  };

  // Handle add experience
  const handleAddExperience = async (
    values: z.infer<typeof experienceSchema>
  ) => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        experience: arrayUnion(values.experience),
      });

      setUserData((prev) => ({
        ...prev,
        experience: [...prev.experience, values.experience],
      }));

      experienceForm.reset();
      setIsAddingExperience(false);
      toast.success("Experience added successfully");
    } catch (error) {
      console.error("Error adding experience:", error);
      toast.error("Failed to add experience");
    }
  };

  // Handle delete experience
  const handleDeleteExperience = async (item: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        experience: arrayRemove(item),
      });

      setUserData((prev) => ({
        ...prev,
        experience: prev.experience.filter((exp) => exp !== item),
      }));

      toast.success("Experience removed successfully");
    } catch (error) {
      console.error("Error removing experience:", error);
      toast.error("Failed to remove experience");
    }
  };

  // Handle bio and personal info updates
  const handleUpdateProfile = async (
    values: z.infer<typeof personalInfoSchema>
  ) => {
    if (!user) return;

    try {
      // Update the user's profile in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        username: values.username,
        bio: values.bio || "",
        phone: values.phone || "",
        isPrivate: values.isPrivate,
      });

      // Update local state
      setUserData((prev) => ({
        ...prev,
        username: values.username,
        bio: values.bio || "",
        phone: values.phone || "",
        isPrivate: values.isPrivate,
      }));

      // Update the session with the new profile data
      // This is safer than directly using Firebase's updateProfile
      await refreshToken();

      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
      return false;
    }
  };

  const handleFinish = async () => {
    const isValid = await personalInfoForm.trigger();
    if (!isValid) {
      toast.error("Please complete all required fields");
      setCurrentStep(1);
      return;
    }

    const values = personalInfoForm.getValues();
    const success = await handleUpdateProfile(values);
    if (success) {
      router.push("/");
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      const isValid = await personalInfoForm.trigger();
      if (!isValid) return;

      const values = personalInfoForm.getValues();
      await handleUpdateProfile(values);
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <AnimatedLogo />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl font-bold text-center">
              Complete Your Profile
            </CardTitle>
            <CardDescription className="text-center">
              Let's set up your profile to help you get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress indicator */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      currentStep >= step
                        ? "bg-green-600 border-green-600 text-white"
                        : "border-gray-300 text-gray-400"
                    }`}
                  >
                    {currentStep > step ? (
                      <Check className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      step
                    )}
                  </div>
                ))}
              </div>
              <Progress
                value={(currentStep - 1) * 33.33}
                className="h-2 mb-2 [&>div]:bg-green-600"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Personal Info</span>
                <span>Resume</span>
                <span>Education</span>
                <span>Experience</span>
              </div>
            </div>

            {/* Step 1: Personal Information */}
            <FormStep
              title="Personal Information"
              icon={<User className="h-5 w-5" />}
              isActive={currentStep === 1}
            >
              <Form {...personalInfoForm}>
                <form className="space-y-4">
                  <FormField
                    control={personalInfoForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your full name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={personalInfoForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your phone number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={personalInfoForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself"
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={personalInfoForm.control}
                    name="isPrivate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Private Profile</FormLabel>
                          <FormDescription>
                            Make your profile private to other users
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </FormStep>

            {/* Step 2: Resume Upload */}
            <FormStep
              title="Upload Your Resume"
              description="Share your professional experience with potential employers"
              icon={<FileText className="h-5 w-5" />}
              isActive={currentStep === 2}
            >
              <div className="space-y-4">
                {previewUrl && userData.resume_id ? (
                  <div className="border border-border rounded-lg bg-background">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Your Resume</h3>
                        <Button
                          onClick={handleDeleteResume}
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove file"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="flex flex-col items-center justify-center rounded-md bg-muted p-6">
                        <FileText className="mb-3 h-16 w-16 text-green-600" />
                        <p className="text-center font-medium mb-1">
                          {resumeFileName || "Resume"}
                        </p>
                        <p className="text-sm text-muted-foreground mb-4 text-center">
                          Click the button below to view your resume in a new
                          window
                        </p>
                        <Button
                          variant="default"
                          size="lg"
                          className="bg-green-600 hover:bg-green-700"
                          asChild
                        >
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            View Resume
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <FileUpload
                      onFileChange={setSelectedFile}
                      acceptedFileTypes={{ "application/pdf": [".pdf"] }}
                      maxSize={5 * 1024 * 1024} // 5MB
                      label="Upload Resume"
                      description="Drag & drop your resume here or click to upload"
                    />

                    {selectedFile && (
                      <Button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="bg-green-600 hover:bg-green-700 w-full md:w-auto"
                      >
                        {uploading ? "Uploading..." : "Upload Resume"}
                      </Button>
                    )}
                  </>
                )}

                <p className="text-sm text-muted-foreground">
                  Please upload your resume in PDF format only. Maximum file
                  size: 5MB.
                </p>
              </div>
            </FormStep>

            {/* Step 3: Education */}
            <FormStep
              title="Your Education"
              icon={<GraduationCap className="h-5 w-5" />}
              isActive={currentStep === 3}
            >
              <div className="space-y-4">
                {userData.education.length > 0 ? (
                  <div className="space-y-3">
                    {userData.education.map((edu, index) => (
                      <ListItem
                        key={index}
                        content={edu}
                        onDelete={() => handleDeleteEducation(edu)}
                        icon={<GraduationCap className="h-4 w-4" />}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gray-50 border border-gray-200">
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">
                        No education entries added yet.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {isAddingEducation ? (
                  <Form {...educationForm}>
                    <form
                      onSubmit={educationForm.handleSubmit(handleAddEducation)}
                      className="space-y-4"
                    >
                      <FormField
                        control={educationForm.control}
                        name="education"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Education Details</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Example: Bachelor of Science in Computer Science, Stanford University, 2018-2022"
                                className="resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          type="submit"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddingEducation(false);
                            educationForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingEducation(true)}
                    className="w-full text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Education
                  </Button>
                )}
              </div>
            </FormStep>

            {/* Step 4: Experience */}
            <FormStep
              title="Your Experience"
              icon={<Briefcase className="h-5 w-5" />}
              isActive={currentStep === 4}
            >
              <div className="space-y-4">
                {userData.experience.length > 0 ? (
                  <div className="space-y-3">
                    {userData.experience.map((exp, index) => (
                      <ListItem
                        key={index}
                        content={exp}
                        onDelete={() => handleDeleteExperience(exp)}
                        icon={<Briefcase className="h-4 w-4" />}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gray-50 border border-gray-200">
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">
                        No experience entries added yet.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {isAddingExperience ? (
                  <Form {...experienceForm}>
                    <form
                      onSubmit={experienceForm.handleSubmit(
                        handleAddExperience
                      )}
                      className="space-y-4"
                    >
                      <FormField
                        control={experienceForm.control}
                        name="experience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Experience Details</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Example: Software Engineer, Google, Jan 2020 - Present. Developed and maintained scalable web applications."
                                className="resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          type="submit"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddingExperience(false);
                            experienceForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingExperience(true)}
                    className="w-full text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Experience
                  </Button>
                )}
              </div>
            </FormStep>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6 flex-col sm:flex-row gap-2">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={prevStep}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            ) : (
              <div className="hidden sm:block"></div>
            )}

            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              >
                Complete Profile
                <Check className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}