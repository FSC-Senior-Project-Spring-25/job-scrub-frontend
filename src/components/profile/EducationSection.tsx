import React, { useState } from "react";
import { FaTrash, FaPlus, FaGraduationCap } from "react-icons/fa";

// ✅ Define Props for the Component
interface EducationSectionProps {
  formData: { education: string[] };
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
  onDeleteEducation: (educationToRemove: string) => void;
}

export default function EducationSection({ formData, setFormData, onDeleteEducation }: EducationSectionProps) {
  const [newEducation, setNewEducation] = useState("");

  // ✅ Handle Adding Education Entry
  const handleAddEducation = () => {
    if (!newEducation.trim()) return; // Prevent adding empty entries

    setFormData((prev) => ({
      ...prev,
      education: [...prev.education, newEducation], // Add new entry to state
    }));

    setNewEducation(""); // Clear input after adding
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow w-full">
      {/* ✅ Section Title with Icon */}
      <h2 className="text-xl font-semibold flex items-center mb-3 border-b pb-2">
        <FaGraduationCap className="mr-2 text-2xl text-green-600" /> Education
      </h2>

      {/* ✅ Display List of Education Entries */}
      <ul className="list-none space-y-3 text-gray-700">
        {formData.education.length > 0 ? (
          formData.education.map((edu, index) => (
            <li key={index} className="flex justify-between items-center border-b py-2">
              <div className="flex items-center">
                <span className="mr-2 text-black">•</span> {/* ✅ Bullet point added */}
                <span className="text-sm">{edu}</span>
              </div>
              <button onClick={() => onDeleteEducation(edu)} className="text-red-500 hover:text-red-700 transition">
                <FaTrash className="text-lg" />
              </button>
            </li>
          ))
        ) : (
          <p className="text-gray-500">No education added yet.</p>
        )}
      </ul>

      {/* ✅ Add Education Input and Button */}
      <div className="flex items-center mt-4">
        <input
          type="text"
          value={newEducation}
          onChange={(e) => setNewEducation(e.target.value)}
          placeholder="Degree, School, location, Graduation Year"
          className="border rounded p-2 w-full"
        />
        <button
          onClick={handleAddEducation}
          className="ml-2 px-3 py-1 text-sm bg-green-500 text-white rounded flex items-center hover:bg-green-600 transition"
        >
          <FaPlus className="mr-1" /> Add
        </button>
      </div>
    </div>
  );
}
