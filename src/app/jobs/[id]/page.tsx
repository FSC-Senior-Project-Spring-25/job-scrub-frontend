'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaDollarSign,
  FaRegBookmark,
  FaCheckCircle,
  FaRegClock,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Job } from "@/types/types";
import { useAuth } from "@/app/auth-context";


function keywordMatchScore(resumeKeywords: string[], jobSkills: string[]): number {
  if (!resumeKeywords.length || !jobSkills.length) return 0;

  const lowerResume = resumeKeywords.map(k => k.toLowerCase().trim());

  const matches = jobSkills.filter(skill =>
    lowerResume.some(keyword => skill.toLowerCase().includes(keyword))
  );

  console.log("✅ Matched Skills:", matches);
  return matches.length / jobSkills.length;
}

export default function JobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const uuid = user?.uid;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);


  const resumeIndexHost = 'https://resumes-y2cd4or.svc.aped-4627-b74a.pinecone.io';
  const apiKey = 'pcsk_5sSQKM_NhUes3FG76gZECqUrb4TwfzjCUZyjmnQbrkFEirw8CAKhiWuGeUM3seAuk4wKd9';

  useEffect(() => {
    if (!id) return;
  
    fetch("/api/job/unverified")
      .then((res) => res.json())
      .then((data) => {
        const found = data[id as string];
        if (found) {
          setJob(found);
  
          
          if (found.skills?.length && uuid) {
            fetch(`${resumeIndexHost}/vectors/fetch?ids=${uuid}&namespace=resumes`, {
              headers: {
                "Api-Key": apiKey,
                "Content-Type": "application/json",
              },
            })
              .then((res) => res.json())
              .then((data) => {
                const vector = data.vectors?.[uuid];
                const resumeKeywords: string[] = vector?.metadata?.keywords || [];
  
                console.log("🧠 Resume keywords:", resumeKeywords);
                console.log("💼 Job skills:", found.skills);
  
                const score = keywordMatchScore(resumeKeywords, found.skills);
                setMatchScore(score);
              })
              .catch((err) => console.error("❌ Failed to fetch resume vector:", err));
          }
        } else {
          console.warn("⚠️ Job not found for ID:", id);
        }
      })
      .catch((err) => {
        console.error("❌ Failed to fetch job:", err);
      })
      .finally(() => setLoading(false));
  }, [id, uuid]);
  
  const handleSave = () => {
    if (isSaved) {
      setSavedCount((prev) => Math.max(prev - 1, 0));
    } else {
      setSavedCount((prev) => prev + 1);
    }
    setIsSaved(!isSaved);
  };

  const handleApply = () => {
    if (job?.url) {
      window.open(job.url, "_blank");
      setShowModal(true);
    }
  };

  const confirmApplication = (applied: boolean) => {
    setShowModal(false);
    if (applied) setAppliedCount((prev) => prev + 1);
  };

  if (loading) return <div className="p-6">Loading job details...</div>;
  if (!job) return <div className="p-6 text-red-500">Job not found.</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center px-6 py-10">
      {/* Sidebar */}
      <div className="bg-white rounded-lg shadow p-4 h-fit self-start w-64 mr-6">
        <h2 className="font-semibold text-lg mb-4">Quick Links</h2>
        <nav className="space-y-2">
          <Link
            href="/jobs"
            className="flex px-3 py-2 rounded hover:bg-gray-100 items-center"
          >
            <FaRegClock className="mr-2" /> My Job Applications
            {appliedCount > 0 && (
              <span className="ml-auto text-sm bg-gray-200 px-2 py-0.5 rounded text-gray-700">
                {appliedCount}
              </span>
            )}
          </Link>
          <Link
            href="/saved"
            className="flex px-3 py-2 rounded hover:bg-gray-100 items-center"
          >
            <FaRegBookmark className="mr-2" /> Saved Jobs
            {savedCount > 0 && (
              <span className="ml-auto text-sm bg-gray-200 px-2 py-0.5 rounded text-gray-700">
                {savedCount}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex justify-start">
        <div className="bg-white rounded-lg shadow p-8 space-y-8 w-full">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-2">
                {job.title}{" "}
                <FaCheckCircle
                  className={
                    job.verified
                      ? "text-green-600 text-xl"
                      : "text-gray-400 text-xl"
                  }
                />
              </h1>
              <p className="text-gray-700 text-sm mt-1">
                {new Date(job.date).toLocaleDateString()} | {job.location},{" "}
                {job.job_type}
              </p>
              <p className="text-gray-600 text-md mt-1 font-medium">
                {job.company}
              </p>
 
 

              {matchScore !== null && (
    <div className="mt-6 space-y-4">
    <h3 className="text-md font-semibold">Am I a good fit?</h3>

    <div className="flex items-center gap-5">
      {/* Circular Progress Ring */}
      <div className="relative w-20 h-20">
        <svg className="transform -rotate-90" width="80" height="80">
          <circle
            cx="40"
            cy="40"
            r="34"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="40"
            cy="40"
            r="34"
            stroke={
              matchScore < 0.3
                ? "#ef4444"
                : matchScore < 0.6
                ? "#facc15"
                : "#22c55e"
            }
            strokeWidth="8"
            strokeDasharray={2 * Math.PI * 34}
            strokeDashoffset={
              2 * Math.PI * 34 * (1 - matchScore)
            }
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
          {(matchScore * 100).toFixed(0)}%
        </div>
      </div>

      {/* Feedback Message */}
      <div className="text-sm text-gray-700 font-medium">
        You are {(matchScore * 100).toFixed(0)}% compatible with the job description.
        {matchScore < 0.3 && (
          <div className="mt-1 text-red-600">Let’s improve your resume!</div>
        )}
        {matchScore >= 0.3 && matchScore < 0.6 && (
          <div className="mt-1 text-yellow-700">We can help with that!</div>
        )}
        {matchScore >= 0.6 && (
          <div className="mt-1 text-green-700 font-semibold">🎉 Great fit! Go get it!</div>
        )}
      </div>
    </div>
  </div>
)}

            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleApply}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded"
              >
                Apply
              </button>
              <button
                onClick={handleSave}
                className={`${
                  isSaved ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                } text-white font-semibold py-2 px-6 rounded`}
              >
                {isSaved ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">Job Description</h2>
            <p className="text-gray-800 whitespace-pre-line text-sm leading-relaxed">
              {job.description}
            </p>
          </div>

          {job.salary && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Salary</h2>
              <p className="text-gray-800">{job.salary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-lg font-semibold mb-2">Benefits</h2>
              <ul className="list-disc list-inside text-gray-700 text-sm">
                {job.benefits?.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Skills Needed</h2>
              <ul className="list-disc list-inside text-gray-700 text-sm">
                {job.skills?.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Modal for application confirmation */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-xl space-y-4">
              <p className="text-lg font-medium">Did you apply for this job?</p>
              <div className="flex justify-end gap-4">
                <Button
                  onClick={() => confirmApplication(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Yes
                </Button>
                <Button
                  onClick={() => confirmApplication(false)}
                  className="bg-gray-300 text-black"
                >
                  No
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}





























































































































































































































































































































































































































