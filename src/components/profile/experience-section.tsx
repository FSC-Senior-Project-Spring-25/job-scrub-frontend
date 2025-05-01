"use client"

export const unstable_runtimeJS = true;

import { useState, useEffect } from "react"
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/app/firebase"
import { toast } from "sonner"
import { Briefcase, Plus, Trash2, Building } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/app/auth-context"

interface ExperienceSectionProps {
  experience: string[]
  isOwnProfile: boolean
  uid: string
}

export default function ExperienceSection({ experience, isOwnProfile, uid }: ExperienceSectionProps) {
  const { user } = useAuth()
  const [newExperience, setNewExperience] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const [isAdding, setIsAdding] = useState(false)

  const handleAddExperience = async () => {
    if (!newExperience.trim() || !user) return

    try {
      const userRef = doc(db, "users", uid)
      await updateDoc(userRef, {
        experience: arrayUnion(newExperience),
      })

      setNewExperience("")
      setIsAdding(false)
      toast.success("Experience added successfully")
    } catch (error) {
      console.error("Error adding experience:", error)
      toast.error("Failed to add experience")
    }
  }

  const handleDeleteExperience = async (item: string) => {
    if (!user) return

    try {
      const userRef = doc(db, "users", uid)
      await updateDoc(userRef, {
        experience: arrayRemove(item),
      })

      toast.success("Experience removed successfully")
    } catch (error) {
      console.error("Error removing experience:", error)
      toast.error("Failed to remove experience")
    }
  }

  if (!mounted) {
    return null; // Prevent mismatch by waiting until after mount
  }

  return (
    <Card className="bg-white dark:bg-card dark:text-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center">
          <Briefcase className="mr-2 h-5 w-5 text-green-600" />
          Experience
        </CardTitle>
      </CardHeader>
  
      <CardContent>
        {experience && experience.length > 0 ? (
          <ul className="space-y-4">
            {experience.map((item, index) => (
              <li
                key={index}
                className="flex items-start justify-between p-3 rounded-md bg-gray-50 dark:bg-muted"
              >
                <div className="flex items-start">
                  <Building className="h-5 w-5 mr-3 mt-0.5 text-gray-500 dark:text-muted-foreground" />
                  <span>{item}</span>
                </div>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteExperience(item)}
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
              ? "Add your work experience to showcase your professional background."
              : "No work experience available."}
          </div>
        )}
  
        {isOwnProfile && (
          <div className="mt-6">
            {isAdding ? (
              <div className="space-y-3">
                <Input
                  value={newExperience}
                  onChange={(e) => setNewExperience(e.target.value)}
                  placeholder="Position, Company, Location, Date Range"
                  className="w-full bg-white dark:bg-muted dark:text-foreground"
                />
                <div className="flex space-x-2">
                  <Button onClick={handleAddExperience}>Add</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setNewExperience("");
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
                Add Experience
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
