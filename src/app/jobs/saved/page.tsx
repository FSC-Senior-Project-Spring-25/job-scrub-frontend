'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/auth-context';
import { db } from '@/app/firebase';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import Link from 'next/link';
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaBuilding,
  FaTrashAlt,
  FaCheckCircle,
} from 'react-icons/fa';

// 🔢 Calculate match score
function keywordMatchScore(resumeKeywords: string[], jobSkills: string[]): number {
  if (!resumeKeywords?.length || !jobSkills?.length) return 0;
  const lowerResume = resumeKeywords.map(k => k.toLowerCase().trim());
  const matches = jobSkills.filter(skill =>
    lowerResume.some(keyword => skill.toLowerCase().includes(keyword))
  );
  return matches.length / jobSkills.length;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workType: string;
  date: string;
  skills?: string[];
  verified?: boolean;
  [key: string]: any;
}

export default function SavedJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [resumeKeywords, setResumeKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!user?.uid) return;

      try {
        const savedRef = collection(db, 'users', user.uid, 'savedJobs');
        const savedSnap = await getDocs(savedRef);
        const ids = savedSnap.docs.map(doc => doc.id);
        setSavedIds(ids);

        const token = await user.getIdToken();

        // ✅ Fetch resume keywords
        const resumeRes = await fetch("/api/resume/keywords", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const resumeData = await resumeRes.json();
        setResumeKeywords(resumeData.keywords || []);

        if (ids.length === 0) {
          setJobs([]);
          return;
        }
      
        const response = await fetch('/api/job/fetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch jobs: ${response.status}`);
        }
        
        const jobMap: Record<string, Job> = await response.json();
        const filteredJobs = ids
        .map(id => {
          const job = jobMap[id];
          // Make sure all required Job fields are present
          if (job && job.title && job.company) {
            return {
              id: id,
              title: job.title || '',
              company: job.company || '',
              location: job.address || '',
              workType: job.locationType || '',
              date: job.date || '',
              skills: job.skills || [],
              verified: job.verified || false,
            } as Job;
          }
          return null;
        })
        .filter((job): job is Job => job !== null);
      
      setJobs(filteredJobs);
      } catch (err) {
        console.error('Error loading saved jobs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedJobs();
  }, [user]);

  const removeSavedJob = async (jobId: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'savedJobs', jobId));
      setJobs(prev => prev.filter(job => job.id !== jobId));
      setSavedIds(prev => prev.filter(id => id !== jobId));
    } catch (err) {
      console.error('Error removing saved job:', err);
    }
  };

  return (
    <div className="p-6 w-full bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Saved Jobs</h1>

      {loading ? (
        <p>Loading...</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-600">You haven’t saved any jobs yet.</p>
      ) : (
        <ul className="space-y-6">
          {jobs.map((job) => {
            const matchScore = keywordMatchScore(resumeKeywords, job.skills || []);

            return (
              <li
                key={job.id}
                className="w-full bg-white border border-gray-300 rounded-lg p-6 shadow-sm flex justify-between items-start"
              >
                {/* LEFT: Green Icon + Job Info */}
                <div className="flex gap-4 w-full">
                  {/* ✅ Green Briefcase Bullet */}
                  <FaBriefcase className="text-green-600 text-xl mt-1 shrink-0" />

                  <div className="flex-1">
                    <Link href={`/jobs/${job.id}`} className="block">
                      <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        {job.title}
                        {job.verified && <FaCheckCircle className="text-green-600 text-sm" />}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <FaBuilding /> {job.company}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <FaMapMarkerAlt /> {job.location} | {job.workType}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Posted on: {new Date(job.date).toLocaleDateString()}
                      </p>
                    </Link>

                    {(job.skills ?? []).length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Skills:</p>
                        <ul className="text-sm text-gray-700 grid grid-cols-2 gap-1 list-none">
                          {(job.skills ?? []).map((skill, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <FaBriefcase className="text-gray-500" />
                              {skill}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={() => removeSavedJob(job.id)}
                      className="mt-4 text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      <FaTrashAlt /> Remove
                    </button>
                  </div>
                </div>

                {/* RIGHT: Match Score */}
                <div className="flex flex-col items-center justify-start min-w-[100px] ml-4">
                  <div className="w-20 h-20 relative">
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
                        strokeDashoffset={2 * Math.PI * 34 * (1 - matchScore)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-semibold text-gray-700">
                      {(matchScore * 100).toFixed(0)}%
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-center">Match</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}










































































