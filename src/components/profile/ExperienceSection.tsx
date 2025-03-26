"use client"; 

import React, { useState } from "react";
import { FaBriefcase, FaPlus, FaTrash } from "react-icons/fa";
import { db, auth } from "@/app/firebase"; // Ensure correct path
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

//  Components
interface ExperienceSectionProps {
  formData: { experience: string[] };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      username: string;
      email: string;
      bio: string;
      phone: string;
      acctype: boolean;
      profileIcon: string;
      education: string[];
      experience: string[];
    }>
  >;
  onDeleteExperience: (experienceToRemove: string) => void;
}

export default function ExperienceSection({ formData, setFormData, onDeleteExperience }: ExperienceSectionProps) {
  const [newExperience, setNewExperience] = useState("");

  //  Saves to Firestore)
  const handleAddExperience = async () => {
    if (!newExperience.trim()) return; 
    if (!auth.currentUser) return; // Ensure user is authenticated

    const userRef = doc(db, "users", auth.currentUser.uid);

    try {
      // Add to Firestore
      await updateDoc(userRef, {
        experience: arrayUnion(newExperience), 
      });

      // Update Local State 
      setFormData((prev) => ({
        ...prev,
        experience: [...prev.experience, newExperience], 
      }));

      setNewExperience(""); // Clear input 
    } catch (error) {
      console.error(" Error adding experience entry:", error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow w-full">
      {/*Section Title with Icon */}
      <h3 className="text-xl font-semibold flex items-center mb-4 border-b pb-2">
        <FaBriefcase className="mr-2 text-2xl text-green-600" /> Experience
      </h3>

      {/* Display List of Experience Entries */}
      <ul className="list-none space-y-3 text-gray-700">
        {formData.experience.length > 0 ? (
          formData.experience.map((exp, index) => (
            <li key={index} className="flex justify-between items-center border-b py-2">
              <div className="flex items-center">
                <span className="mr-2 text-black">•</span> 
                <span className="text-sm">{exp}</span>
              </div>
              <button onClick={() => onDeleteExperience(exp)} className="text-red-500 hover:text-red-700 transition">
                <FaTrash className="text-lg" />
              </button>
            </li>
          ))
        ) : (
          <p className="text-gray-500">No experience added yet.</p>
        )}
      </ul>

      {/* Add Experience Input and Button */}
      <div className="flex items-center mt-4">
        <input
          type="text"
          value={newExperience}
          onChange={(e) => setNewExperience(e.target.value)}
          placeholder="Position, Company, Location, Dates Frame"
          className="border rounded p-2 w-full"
        />
        <button
          onClick={handleAddExperience}
          className="ml-2 px-3 py-1 text-sm bg-green-500 text-white rounded flex items-center hover:bg-green-600 transition"
        >
          <FaPlus className="mr-1" /> Add
        </button>
      </div>
    </div>
  );
}




