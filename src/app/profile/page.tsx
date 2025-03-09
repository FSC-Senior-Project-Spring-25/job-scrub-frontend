"use client";
import { useState, useEffect } from "react";
import { FaPlus, FaCog, FaEnvelope, FaGraduationCap, FaBriefcase, FaFileAlt, FaEdit, FaUserCircle, FaLock, FaLockOpen } from "react-icons/fa";

const API_URL = process.env.NEXT_PUBLIC_API_URL;


export default function ProfilePage() {
  const [user, setUser] = useState({});
  const [resumes, setResumes] = useState([]);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const emojis = ["😀", "😎", "🤓", "👨‍💻", "👩‍💻", "👨‍🎓", "👩‍🎓", "🦸", "🧑‍🚀", "🧑‍🎨"];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/user`);
        if (!response.ok) throw new Error("Failed to fetch user data");
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      setFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file.");

    setUploading(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await fetch(`${API_URL}/api/upload-resume`, {
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

  return (
    <div className="p-6 w-full bg-gray-100 shadow-md rounded-lg min-h-screen flex flex-col">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-6 border-b pb-6 bg-white p-10 rounded-lg w-full max-w-screen-2xl mx-auto">
        <div className="relative flex flex-col items-center">
          <div className="w-52 h-52 bg-gray-300 rounded-full flex items-center justify-center text-9xl cursor-pointer" onClick={() => setShowPicker(!showPicker)}>
            {selectedIcon ? selectedIcon : <FaUserCircle className="text-gray-500 text-9xl" />}
          </div>
          <div className="absolute bottom-2 right-2 bg-white rounded-full p-4 shadow cursor-pointer" onClick={() => setShowPicker(!showPicker)}>
            <FaEdit className="text-gray-600 text-3xl" />
          </div>
          {showPicker && (
            <div className="absolute mt-2 bg-white border p-4 rounded shadow grid grid-cols-5 gap-3 text-center w-64 max-w-xs overflow-auto">
              {emojis.map((emoji, index) => (
                <span key={index} className="text-4xl cursor-pointer p-2" onClick={() => {
                  setSelectedIcon(emoji);
                  setShowPicker(false);
                }}>
                  {emoji}
                </span>
              ))}
              <button
                className="col-span-5 text-sm text-gray-500 mt-2 border rounded-md py-1 px-2 hover:bg-gray-100"
                onClick={() => {
                  setSelectedIcon(null);
                  setShowPicker(false);
                }}
              >
                Use Default Icon
              </button>
            </div>
          )}
        </div>
        <div className="text-center md:text-left w-full">
          <h2 className="text-4xl font-bold flex items-center gap-2 justify-start">
            {user.name || "User Name"}
            {user.isPublic ? <FaLockOpen className="text-green-500 ml-2 text-base align-middle" title="Public Profile" /> : <FaLock className="text-gray-600 ml-2 text-base align-middle" title="Private Profile" />}
          </h2>
          <p className="text-gray-600 text-lg">@{user.username || "username"}</p>
          <p className="text-gray-600 text-lg">{user.email || "user@example.com"}</p>
          <p className="text-gray-600 text-lg">{user.phone || "(000) 000-0000"}</p>
          <p className="text-gray-500 italic text-lg">{user.bio || "Say something fun!"}</p>
        </div>
        <div className="ml-auto flex gap-6 text-4xl">
          <FaEnvelope className="cursor-pointer" />
          <FaCog className="cursor-pointer" />
        </div>
      </div>


      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 flex-grow w-full max-w-screen-2xl mx-auto">
        {/* Education Section */}
        <div className="bg-white p-6 rounded-lg shadow w-full">
          <h3 className="text-xl font-semibold flex items-center mb-6">
            <FaGraduationCap className="mr-2 text-2xl text-green-500" /> Education
          </h3>
          <button className="flex items-center text-green-500 mt-6">
            <FaPlus className="mr-1 text-2xl" /> Add Education
          </button>
        </div>

        {/* Experience Section */}
        <div className="bg-white p-6 rounded-lg shadow w-full">
          <h3 className="text-xl font-semibold flex items-center mb-6">
            <FaBriefcase className="mr-2 text-2xl text-green-500" /> Experience
          </h3>
          
          <button className="flex items-center text-green-500 mt-6 self-start">
            <FaPlus className="mr-1 text-2xl" /> Add Experience
          </button>
        </div>

        {/* Saved Resumes Section */}
        <div className="bg-white p-6 rounded-lg shadow w-full">
          <h3 className="text-xl font-semibold flex items-center mb-6">
            <FaFileAlt className="mr-2 text-2xl text-green-500" /> Saved Resumes
          </h3>

          {/* Upload Section */}
          <div className="flex flex-col items-center">
            <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer bg-green-500 text-white p-3 rounded-full flex items-center justify-center">
              <FaPlus className="text-xl" />
            </label>

            {/* Display selected file name */}
            {file && <p className="mt-2 text-gray-700">{file.name}</p>}

            <button onClick={handleUpload} disabled={uploading} className="mt-4 px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50">
              {uploading ? "Uploading..." : "Upload Resume"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
