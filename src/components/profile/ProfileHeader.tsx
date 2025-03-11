import React, { useState } from "react";
import { FaEdit, FaUserCircle } from "react-icons/fa";

// ✅ Define Props for ProfileHeader
interface ProfileHeaderProps {
  formData: {
    username: string;
    email: string;
    bio: string;
    phone: string;
    acctype: boolean;
    profileIcon: string;
  };
  editing: boolean;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
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
  handleSave: () => void;
}

export default function ProfileHeader({
  formData,
  editing,
  setEditing,
  setFormData,
  handleSave,
}: ProfileHeaderProps) {
  const [showPicker, setShowPicker] = useState(false);

  // ✅ Emoji List
  const emojis = ["😀", "😎", "🤓", "👨‍💻", "👩‍💻", "👨‍🎓", "👩‍🎓", "🦸", "🧑‍🚀", "🧑‍🎨"];

  // ✅ Handle Emoji Selection
  const handleEmojiSelect = (emoji: string) => {
    setFormData((prev) => ({
      ...prev,
      profileIcon: emoji, // ✅ Updates profile icon in state
    }));
    setShowPicker(false); // ✅ Hides picker after selection
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 border-b pb-6 bg-white p-10 rounded-lg w-full max-w-screen-2xl mx-auto">
      <div className="relative flex-shrink-0">
        {/* ✅ Profile Icon */}
        <div className="w-52 h-52 bg-gray-300 rounded-full flex items-center justify-center text-9xl cursor-pointer relative">
          {formData.profileIcon || <FaUserCircle className="text-gray-500 text-9xl" />}
          
          {/* ✅ Edit Icon - Clicking toggles emoji picker */}
          <div className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-lg cursor-pointer"
               onClick={() => setShowPicker(!showPicker)}>
            <FaEdit className="text-gray-600 text-2xl" />
          </div>

          {/* ✅ Emoji Picker */}
          {showPicker && (
            <div className="absolute mt-2 bg-white border p-4 rounded shadow grid grid-cols-5 gap-3 text-center w-64 max-w-xs overflow-auto">
              {emojis.map((emoji, index) => (
                <span key={index} className="text-4xl cursor-pointer p-2"
                      onClick={() => handleEmojiSelect(emoji)}>
                  {emoji}
                </span>
              ))}
              <button
                className="col-span-5 text-sm text-gray-500 mt-2 border rounded-md py-1 px-2 hover:bg-gray-100"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, profileIcon: "" }));
                  setShowPicker(false);
                }}
              >
                Use Default Icon
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Editable User Details */}
      <div className="flex flex-col justify-center md:justify-start text-center md:text-left w-full">
        {/* Editable Username */}
        {editing ? (
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
            placeholder="Enter your name"
            className="border rounded p-2 text-4xl font-bold"
          />
        ) : (
          <h2 className="text-4xl font-bold">{formData.username || "Add Preferred Name"}</h2>
        )}

        {/* Editable Email */}
        {editing ? (
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Enter your email"
            className="border rounded p-2 w-full mt-2"
          />
        ) : (
          <p className="text-gray-600 text-lg">{formData.email}</p>
        )}

        {/* Editable Phone Number */}
        {editing ? (
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="Enter your phone number"
            className="border rounded p-2 w-full mt-2"
          />
        ) : (
          <p className="text-gray-600 text-lg">{formData.phone || "No phone number added"}</p>
        )}

        {/* Editable Bio */}
        {editing ? (
          <textarea
            name="bio"
            value={formData.bio}
            onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
            placeholder="Tell us something about yourself..."
            className="border rounded p-2 w-full mt-2"
            rows={3}
          />
        ) : (
          <p className="text-gray-500 italic text-lg">{formData.bio || "No bio yet. Edit your profile to add one!"}</p>
        )}

        {/* Save & Edit Buttons */}
        <div className="mt-4 flex gap-2">
          <button className="px-3 py-1 text-sm bg-green-500 text-white rounded" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </button>

          {editing && (
            <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded" onClick={handleSave}>
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
