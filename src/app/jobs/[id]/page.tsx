'use client';

export const unstable_runtimeJS = true;


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
import { db } from "@/app/firebase";
import CompanyMetrics from "@/components/job/company-metrics";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
  increment,
} from "firebase/firestore";

function keywordMatchScore(resumeKeywords: string[], jobSkills: string[]): number {
  if (!resumeKeywords.length || !jobSkills.length) return 0;
  const lowerResume = resumeKeywords.map(k => k.toLowerCase().trim());
  const matches = jobSkills.filter(skill =>
    lowerResume.some(keyword => skill.toLowerCase().includes(keyword))
  );
  return matches.length / jobSkills.length;
}

export default function JobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);

  useEffect(() => {
    if (!id || !user) return;

    const fetchCounts = async () => {
      const savedSnap = await getDocs(collection(db, "users", user.uid, "savedJobs"));
      setSavedCount(savedSnap.size);

      const appliedSnap = await getDocs(collection(db, "users", user.uid, "applications"));
      setAppliedCount(appliedSnap.size);
    };

    const checkIfSaved = async () => {
      const savedDoc = await getDoc(doc(db, "users", user.uid, "savedJobs", id as string));
      if (savedDoc.exists()) setIsSaved(true);
    };

    fetchCounts();
    checkIfSaved();

    fetch("/api/job/unverified")
      .then(res => res.json())
      .then(data => {
        const found = data[id as string];
        if (found) {
          setJob(found);

          if (found.skills?.length) {
            user.getIdToken()
              .then(token =>
                fetch("/api/resume/keywords", {
                  headers: { Authorization: `Bearer ${token}` },
                })
              )
              .then(res => res.json())
              .then(data => {
                const resumeKeywords: string[] = data.keywords || [];
                const score = keywordMatchScore(resumeKeywords, found.skills);
                setMatchScore(score);
              })
              .catch(err => console.error("❌ Failed to fetch resume keywords:", err));
          }
        } else {
          console.warn("⚠️ Job not found for ID:", id);
        }
      })
      .catch(err => console.error("❌ Failed to fetch job:", err))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleSave = async () => {
    if (!user?.uid || !id) return;

    const ref = doc(db, "users", user.uid, "savedJobs", id as string);
    if (isSaved) {
      await deleteDoc(ref);
      setIsSaved(false);
      setSavedCount(prev => Math.max(prev - 1, 0));
    } else {
      await setDoc(ref, { savedAt: new Date().toISOString() });
      setIsSaved(true);
      setSavedCount(prev => prev + 1);
    }
  };

  const handleApply = () => {
    if (job?.url) {
      window.open(job.url, "_blank");
      setShowModal(true);
    }
  };

  const confirmApplication = async (applied: boolean) => {
    setShowModal(false);
    if (!applied || !user?.uid || !id || !job) return;

    const userAppRef = doc(db, "users", user.uid, "applications", id as string);
    const jobStatsRef = doc(db, "jobStats", id as string);

    try {
      await setDoc(userAppRef, {
        appliedAt: serverTimestamp(),
        status: "no_response",
      });

      await setDoc(
        jobStatsRef,
        {
          jobTitle: job.title,
          company: job.company,
          totalApplicants: increment(1),
          no_response: increment(1),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      setAppliedCount(prev => prev + 1);
    } catch (error) {
      console.error("❌ Failed to record application:", error);
    }
  };

  if (loading) return <div className="p-6">Loading job details...</div>;
  if (!job) return <div className="p-6 text-red-500">Job not found.</div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background flex justify-center px-6 py-10">
      {/* Sidebar */}
      <div className="bg-white dark:bg-card dark:border dark:border-muted rounded-lg shadow p-4 h-fit self-start w-64 mr-6">
        <h2 className="font-semibold text-lg mb-4">Quick Links</h2>
        <nav className="space-y-2">
          <Link href="/applications" className="flex px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-muted items-center">
            <FaRegClock className="mr-2" /> My Job Applications
            {appliedCount > 0 && (
              <span className="ml-auto text-sm bg-gray-200 dark:bg-muted dark:text-foreground px-2 py-0.5 rounded text-gray-700">
                {appliedCount}
              </span>
            )}
          </Link>
          <Link href="/jobs/saved" className="flex px-3 py-2 rounded hover:bg-gray-100 items-center">
            <FaRegBookmark className="mr-2" /> Saved Jobs
            {savedCount > 0 && (
              <span className="ml-auto text-sm bg-gray-200 dark:bg-muted dark:text-foreground px-2 py-0.5 rounded text-gray-700">
                {savedCount}
              </span>
            )}
          </Link>
        </nav>
        {job?.company && <CompanyMetrics companyName={job.company} />}
      </div>
  
      {/* Main Content */}
      <main className="flex-1 flex justify-start">
      <div className="bg-white dark:bg-card border-2 border-gray-300 dark:border-muted rounded-lg shadow p-8 space-y-8 w-full">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                {job.title}
                <FaCheckCircle
                  className={job.verified ? "text-green-600 text-xl" : "text-gray-400 text-xl"}
                />
              </h1>
              <p className="text-gray-700 dark:text-muted-foreground text-sm mt-1">
                {new Date(job.date).toLocaleDateString()} | {job.location?.address ?? "Unknown Location"}, {job.jobType}
              </p>
              <p className="text-gray-600 dark:text-muted-foreground text-md mt-1 font-medium">
                {job.company}
              </p>
  
              {/* Match Score */}
              {matchScore !== null && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-md font-semibold">Am I a good fit?</h3>
                  <div className="flex items-center gap-5">
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
                          stroke={matchScore < 0.3 ? "#ef4444" : matchScore < 0.6 ? "#facc15" : "#22c55e"}
                          strokeWidth="8"
                          strokeDasharray={2 * Math.PI * 34}
                          strokeDashoffset={2 * Math.PI * 34 * (1 - matchScore)}
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800 dark:text-foreground">
                        {(matchScore * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-muted-foreground font-medium">
                      You are {(matchScore * 100).toFixed(0)}% compatible with the job description.
                      {matchScore < 0.3 && <div className="mt-1 text-red-600">Let’s improve your resume!</div>}
                      {matchScore >= 0.3 && matchScore < 0.6 && <div className="mt-1 text-yellow-700">We can help</div>}
                      {matchScore >= 0.6 && <div className="mt-1 text-green-700 font-semibold">🎉 Great fit! Go get it!</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
  
            {/* Apply and Save Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleApply}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded"
              >
                Apply
              </button>
              <button
                onClick={handleSave}
                className={`${isSaved ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"} text-white font-semibold px-4 py-2 rounded`}
              >
                {isSaved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
  
          {/* Job Description */}
          <div>
            <h2 className="text-lg font-semibold mb-1">Job Description</h2>
            <p className="text-gray-800 dark:text-muted-foreground whitespace-pre-line text-sm leading-relaxed">
              {job.description}
            </p>
          </div>
  
          {/* Salary */}
          {job.salary && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Salary</h2>
              <p className="text-gray-800 dark:text-muted-foreground">{job.salary}</p>
            </div>
          )}
  
          {/* Benefits and Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-lg font-semibold mb-2">Benefits</h2>
              <ul className="list-disc list-inside text-gray-700 dark:text-muted-foreground text-sm">
                {job.benefits?.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Skills Needed</h2>
              <ul className="list-disc list-inside text-gray-700 dark:text-muted-foreground text-sm">
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
            <div className="bg-white dark:bg-card dark:border dark:border-muted p-6 rounded shadow-xl space-y-4">
              <p className="text-lg font-medium">Did you apply for this job?</p>
              <div className="flex justify-end gap-4">
                <Button onClick={() => confirmApplication(true)} className="bg-green-600 hover:bg-green-700 text-white">
                  Yes
                </Button>
                <Button onClick={() => confirmApplication(false)} className="bg-gray-300 dark:bg-muted dark:text-foreground text-black">
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
 
 
 
 
 
 
 
 

