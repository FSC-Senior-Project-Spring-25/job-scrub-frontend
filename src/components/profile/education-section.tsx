"use client"

export const unstable_runtimeJS = true;

import { useState, useEffect } from "react"
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { GraduationCap, Plus, Trash2, School } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/app/auth-context"

interface EducationSectionProps {
  education: string[]
  isOwnProfile: boolean
  uid: string
}

export default function EducationSection({ education, isOwnProfile, uid }: EducationSectionProps) {
  const { user } = useAuth()
  const [newEducation, setNewEducation] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAddEducation = async () => {
    if (!newEducation.trim() || !user) return

    try {
      const userRef = doc(db, "users", uid)
      await updateDoc(userRef, {
        education: arrayUnion(newEducation),
      })

      setNewEducation("")
      setIsAdding(false)
      toast.success("Education added successfully")
    } catch (error) {
      console.error("Error adding education:", error)
      toast.error("Failed to add education")
    }
  }

  const handleDeleteEducation = async (item: string) => {
    if (!user) return

    try {
      const userRef = doc(db, "users", uid)
      await updateDoc(userRef, {
        education: arrayRemove(item),
      })

      toast.success("Education removed successfully")
    } catch (error) {
      console.error("Error removing education:", error)
      toast.error("Failed to remove education")
    }
  }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // wait for client to mount to avoid hydration error

  return (
    <Card className="bg-white dark:bg-card dark:text-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center">
          <GraduationCap className="mr-2 h-5 w-5 text-green-600" />
          Education
        </CardTitle>
      </CardHeader>
      <CardContent>
        {education && education.length > 0 ? (
          <ul className="space-y-4">
            {education.map((item, index) => (
              <li
                key={index}
                className="flex items-start justify-between p-3 rounded-md bg-gray-50 dark:bg-muted"
              >
                <div className="flex items-start">
                  <School className="h-5 w-5 mr-3 mt-0.5 text-gray-500 dark:text-muted-foreground" />
                  <span>{item}</span>
                </div>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEducation(item)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-muted-foreground">
            {isOwnProfile
              ? "Add your education history to showcase your academic background."
              : "No education history available."}
          </div>
        )}

        {isOwnProfile && (
          <div className="mt-6">
            {isAdding ? (
              <div className="space-y-3">
                <Input
                  value={newEducation}
                  onChange={(e) => setNewEducation(e.target.value)}
                  placeholder="Degree, School, Location, Graduation Year"
                  className="w-full"
                />
                <div className="flex space-x-2">
                  <Button onClick={() => {handleAddEducation()}}>Add</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setNewEducation("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsAdding(true)}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Education
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
