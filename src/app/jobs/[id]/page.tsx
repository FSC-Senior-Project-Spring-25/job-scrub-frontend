"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaDollarSign,
  FaRegBookmark,
  FaCheckCircle,
  FaStar,
  FaRegClock,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Job } from "@/types/types"; 

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch("/api/job/unverified")
      .then((res) => res.json())
      .then((data) => {
        const found = data[id as string];
        if (found) {
          setJob(found);
        } else {
          console.warn("Job not found for ID:", id);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch job:", err);
      })
      .finally(() => setLoading(false));
  }, [id]);

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




































































































































































































































































































































































































































































