"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FaRegBookmark, FaCheckCircle, FaRegClock } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Job } from "@/types/types";
import { useAuth } from "@/app/auth-context";

type AuthUser = { uid: string };

export default function JobDetailPage() {
  const { id } = useParams();
  const { user }: { user: AuthUser | null } = useAuth();
  const [job, setJob] = useState<Job & { id?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);

  // Fetch job by ID
  useEffect(() => {
    if (!id) return;

    fetch("/api/job/unverified")
      .then((res) => res.json())
      .then((data: Record<string, Job>) => {
        const found = data[id as string];
        if (found) {
          console.log("Job found:", found);
          setJob({ ...found, id: id as string }); // ✅ Add the ID manually
        }
      })
      .catch((err) => console.error("Failed to fetch job:", err))
      .finally(() => setLoading(false));
  }, [id]);

  // Calculate match score
  useEffect(() => {
    const calculateMatchScore = async () => {
      console.log("Calculating match score...");
      if (!user?.uid || !job?.id) {
        console.log("Missing user or job id");
        return;
      }

      try {
        // Fetch resume vector
        const resumeRes = await fetch("http://localhost:8000/api/resumes_vector", {
          credentials: "include", // Ensure credentials are passed if needed
        });

        const resumeData = await resumeRes.json();
        console.log("Resume data received:", resumeData);

        const resumeVector: number[] = Array.isArray(resumeData.vector) ? resumeData.vector : [];
        if (!resumeVector.length) {
          console.warn("Invalid resume vector data");
          return;
        }
        console.log("Resume vector received:", resumeVector);

        // Fetch job vector
        const jobVectorRes = await fetch(`http://localhost:8000/api/jobs/vector?job_id=${job.id}`);
        const jobVectorData = await jobVectorRes.json();
        console.log("Job vector data received:", jobVectorData);

        const jobVector: number[] = Array.isArray(jobVectorData.vector) ? jobVectorData.vector : [];
        if (!jobVector.length) {
          console.warn("Invalid job vector data");
          return;
        }
        console.log("Job vector received:", jobVector);

        // Check if vectors have the same length
        if (resumeVector.length !== jobVector.length) {
          console.warn("Vector length mismatch:", resumeVector.length, jobVector.length);
          return;
        }

        // Calculate match score (Cosine Similarity)
        const dot = resumeVector.reduce((acc, val, i) => acc + val * jobVector[i], 0);
        const magA = Math.sqrt(resumeVector.reduce((sum, val) => sum + val ** 2, 0));
        const magB = Math.sqrt(jobVector.reduce((sum, val) => sum + val ** 2, 0));
        const similarity = dot / (magA * magB);

        if (isNaN(similarity)) {
          console.warn("Invalid match score calculation");
          return;
        }

        console.log("Match Score:", similarity);
        setMatchScore(similarity);
      } catch (err) {
        console.error("Failed to calculate match score:", err);
      }
    };

    calculateMatchScore();
  }, [job, user]);

  const handleSave = () => {
    setIsSaved((prev) => !prev);
    setSavedCount((prev) => (isSaved ? Math.max(prev - 1, 0) : prev + 1));
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
          <Link href="/jobs" className="flex px-3 py-2 rounded hover:bg-gray-100 items-center">
            <FaRegClock className="mr-2" /> My Job Applications
            {appliedCount > 0 && (
              <span className="ml-auto text-sm bg-gray-200 px-2 py-0.5 rounded text-gray-700">
                {appliedCount}
              </span>
            )}
          </Link>
          <Link href="/saved" className="flex px-3 py-2 rounded hover:bg-gray-100 items-center">
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
                <FaCheckCircle className={job.verified ? "text-green-600 text-xl" : "text-gray-400 text-xl"} />
              </h1>
              <p className="text-gray-700 text-sm mt-1">
                {new Date(job.date).toLocaleDateString()} | {job.location}, {job.job_type}
              </p>
              <p className="text-gray-600 text-md mt-1 font-medium">{job.company}</p>
              {matchScore !== null && (
                <p className="text-sm text-blue-700 mt-2">
                  Match Score: {(matchScore * 100).toFixed(1)}%
                </p>
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
                className={`${isSaved ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"} text-white font-semibold py-2 px-6 rounded`}
              >
                {isSaved ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">Job Description</h2>
            <p className="text-gray-800 whitespace-pre-line text-sm leading-relaxed">{job.description}</p>
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-xl space-y-4">
              <p className="text-lg font-medium">Did you apply for this job?</p>
              <div className="flex justify-end gap-4">
                <Button onClick={() => confirmApplication(true)} className="bg-green-600 hover:bg-green-700 text-white">
                  Yes
                </Button>
                <Button onClick={() => confirmApplication(false)} className="bg-gray-300 text-black">
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






























































































































































































































































































































































































































































