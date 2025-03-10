"use client";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaEdit, FaGraduationCap, FaPlus, FaBriefcase, FaFileAlt, FaUserCircle, FaLock, FaLockOpen } from "react-icons/fa";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    bio: "",
    phone: "",
    acctype: false,
    profileIcon: "",
  });

  const emojis = ["😀", "😎", "🤓", "👨‍💻", "👩‍💻", "👨‍🎓", "👩‍🎓", "🦸", "🧑‍🚀", "🧑‍🎨"];
  const [uploading, setUploading] = useState(false);
const [file, setFile] = useState<File | null>(null);

// Handle file selection
const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (files && files[0]) {
    setFile(files[0]);
  }
};

// Handle file upload
const handleUpload = async () => {
  if (!file) return alert("Please select a file.");

  setUploading(true);
  const formData = new FormData();
  formData.append("resume", file);

  try {
    // Replace with your actual API endpoint for uploading
    const response = await fetch("/api/upload-resume", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Upload failed");

    alert("Resume uploaded successfully!");
    setFile(null); // Reset file input after upload
  } catch (error) {
    alert("Failed to upload resume.");
  } finally {
    setUploading(false);
  }
};

  useEffect(() => {
    const fetchUserData = async (uid: string) => {
      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser(userData);
          setFormData({
            username: userData.username || "",
            email: userData.email || auth.currentUser?.email || "",
            bio: userData.bio || "",
            phone: userData.phone || "",
            acctype: userData.acctype ?? false,
            profileIcon: userData.profileIcon || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        fetchUserData(currentUser.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Toggle Public/Private Account
  const toggleAccountType = async () => {
    if (!auth.currentUser) return;

    const newAcctype = !formData.acctype;
    setFormData((prev) => ({ ...prev, acctype: newAcctype }));

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { acctype: newAcctype });

      setUser((prev: any) => ({ ...prev, acctype: newAcctype }));
      console.log(`Account is now ${newAcctype ? "Public" : "Private"}`);
    } catch (error) {
      console.error("Error updating account type:", error);
    }
  };

  // Save profile updates
  const handleSave = async () => {
    if (!auth.currentUser) {
      alert("User not authenticated!");
      return;
    }

    const userRef = doc(db, "users", auth.currentUser.uid);

    try {
      await updateDoc(userRef, {
        username: formData.username,
        bio: formData.bio,
        phone: formData.phone,
        acctype: formData.acctype,
        profileIcon: formData.profileIcon || "😀", // Default emoji if missing
        email: auth.currentUser.email,
      });

      alert("Profile updated successfully!");
      setUser({ ...formData, email: auth.currentUser.email });
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = async (emoji: string) => {
    if (!auth.currentUser) return;

    setFormData((prev) => ({ ...prev, profileIcon: emoji }));
    setShowPicker(false); // Close picker after selection

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { profileIcon: emoji });

      setUser((prev: any) => ({ ...prev, profileIcon: emoji }));
      console.log("Profile icon updated successfully!");
    } catch (error) {
      console.error("Error updating profile icon:", error);
    }
  };

  return (
    <div className="p-6 w-full bg-gray-100 shadow-md rounded-lg min-h-screen flex flex-col">
      {loading ? (
        <p>Loading profile...</p>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-6 border-b pb-6 bg-white p-10 rounded-lg w-full max-w-screen-2xl mx-auto">
          
          {/* Profile Section - Flex container ensures side-by-side layout */}
<div className="flex flex-col md:flex-row items-center md:items-start gap-6 border-b pb-6 bg-white p-10 rounded-lg w-full max-w-screen-2xl mx-auto">
  
  {/* User Icon Section - Ensures it stays on the left */}
  <div className="relative flex-shrink-0">
    <div className="w-52 h-52 bg-gray-300 rounded-full flex items-center justify-center text-9xl cursor-pointer relative">
      {formData.profileIcon || <FaUserCircle className="text-gray-500 text-9xl" />}

      {/* Edit Icon */}
      <div className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-lg cursor-pointer" onClick={() => setShowPicker(!showPicker)}>
        <FaEdit className="text-gray-600 text-2xl" />
      </div>
    </div>
  </div>

  {/* User Details Section - Ensures it appears next to the icon */}
  <div className="flex flex-col justify-center md:justify-start text-center md:text-left w-full">
    <div className="flex items-center gap-3">
      {/* Editable Username */}
      {editing ? (
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="Enter your name"
          className="border rounded p-2 text-4xl font-bold"
        />
      ) : (
        <h2 className="text-4xl font-bold">{user?.username || "Add Preferred Name"}</h2>
      )}

      {/* Lock Icon for Private/Public Toggle */}
      <span className="cursor-pointer flex items-center" onClick={toggleAccountType}>
        {formData.acctype ? (
          <FaLockOpen className="text-green-500 text-3xl" title="Public Account" />
        ) : (
          <FaLock className="text-gray-600 text-3xl" title="Private Account" />
        )}
      </span>
    </div>

    {/* Editable Email */}
    {editing ? (
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Enter your email"
        className="border rounded p-2 w-full mt-2"
      />
    ) : (
      <p className="text-gray-600 text-lg">{user?.email || "user@example.com"}</p>
    )}

    {/* Editable Phone Number */}
    {editing ? (
      <input
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="Enter your phone number"
        className="border rounded p-2 w-full mt-2"
      />
    ) : (
      <p className="text-gray-600 text-lg">{user?.phone || "No phone number added"}</p>
    )}

    {/* Editable Bio */}
    {editing ? (
      <textarea
        name="bio"
        value={formData.bio}
        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
        placeholder="Tell us something about yourself..."
        className="border rounded p-2 w-full mt-2"
        rows={3}
      />
    ) : (
      <p className="text-gray-500 italic text-lg">{user?.bio || "No bio yet. Edit your profile to add one!"}</p>
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
</div>
      )}
    {/* Move the Main Sections BELOW the Profile Section */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 w-full max-w-screen-2xl mx-auto">
  
  {/* Education Section */}
  <div className="bg-white p-6 rounded-lg shadow w-full">
    <h3 className="text-xl font-semibold flex items-center mb-4 border-b pb-2">
      <FaGraduationCap className="mr-2 text-2xl text-green-600" /> Education
    </h3>
    <ul className="list-none space-y-3 text-gray-700">
      <li className="flex items-start">
        <span className="mr-2 text-black">•</span> 
        <span className="text-sm">[Education Entry]</span>
      </li>
    </ul>
    <button className="flex items-center text-green-600 mt-4">
      <FaPlus className="mr-1 text-lg" /> Add Education
    </button>
  </div>

  {/* Experience Section */}
  <div className="bg-white p-6 rounded-lg shadow w-full">
    <h3 className="text-xl font-semibold flex items-center mb-4 border-b pb-2">
      <FaBriefcase className="mr-2 text-2xl text-green-600" /> Experience
    </h3>
    <ul className="list-none space-y-3 text-gray-700">
      <li className="flex items-start">
        <FaPlus className="mr-2 text-black" /> 
        <span className="text-sm">[Experience Entry]</span>
      </li>
    </ul>
    <button className="flex items-center text-green-600 mt-4">
      <FaPlus className="mr-1 text-lg" /> Add Experience
    </button>
  </div>

  {/* Saved Resumes Section */}
  <div className="bg-white p-6 rounded-lg shadow w-full">
    <h3 className="text-xl font-semibold flex items-center mb-4 border-b pb-2">
      <FaFileAlt className="mr-2 text-2xl text-green-600" /> Saved Resumes
    </h3>
    
    {/* Uploaded Files List */}
    <div className="space-y-2">
      <div className="bg-gray-200 p-3 rounded flex items-center justify-between">
        <FaFileAlt className="text-gray-600 text-xl" />
        <span className="text-sm">file.pdf</span>
      </div>
    </div>

    {/* Upload Section */}
    <div className="flex flex-col items-center mt-4">
      <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" />
      <label htmlFor="file-upload" className="cursor-pointer bg-green-600 text-white p-3 rounded-full flex items-center justify-center">
        <FaPlus className="text-xl" />
      </label>
      <button onClick={handleUpload} disabled={uploading} className="mt-2 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
        {uploading ? "Uploading..." : "Upload Resume"}
      </button>
    </div>
  </div>
</div>
      

      </div>
  
  );
}

