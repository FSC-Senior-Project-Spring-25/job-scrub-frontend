'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/auth-context';
import { db } from '@/app/firebase';
import ApplicationUpdatePrompt from "@/components/job/application-update";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import Link from 'next/link';
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaBuilding,
  FaCheckCircle,
  FaExternalLinkAlt
} from 'react-icons/fa';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workType: string;
  date: string;
  verified?: boolean;
  url?: string;
  [key: string]: any;
}

interface Application {
  appliedAt: any;
  status: string;
}

const statusOptions = ["applied", "rejected", "no_response", "interviewing", "accepted"];

export default function MyApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<{ job: Job; app: Application }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.uid) return;

      try {
        const appRef = collection(db, 'users', user.uid, 'applications');
        const appSnap = await getDocs(appRef);
        const jobIds = appSnap.docs.map(doc => doc.id);
        const appMap: Record<string, Application> = {};
        appSnap.docs.forEach(doc => {
          appMap[doc.id] = doc.data() as Application;
        });

        const token = await user.getIdToken();
        const res = await fetch('/api/job/unverified', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const jobMap: Record<string, Job> = await res.json();

        const combined = jobIds.map(id => ({
          job: { ...jobMap[id], id },
          app: appMap[id],
        })).filter(entry => entry.job);

        setApplications(combined);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  const updateStatus = async (jobId: string, newStatus: string, prevStatus: string) => {
    if (!user?.uid || !newStatus || newStatus === prevStatus) return;

    try {
      const userRef = doc(db, "users", user.uid, "applications", jobId);
      const statsRef = doc(db, "jobStats", jobId);

      await updateDoc(userRef, { status: newStatus });

      const updates: any = {
        lastUpdated: serverTimestamp(),
      };
      updates[newStatus] = increment(1);
      if (prevStatus) {
        updates[prevStatus] = increment(-1);
      }
      await setDoc(statsRef, updates, { merge: true });

      setApplications(prev =>
        prev.map(entry =>
          entry.job.id === jobId
            ? { ...entry, app: { ...entry.app, status: newStatus } }
            : entry
        )
      );

      if (newStatus === "accepted") {
        setShowCongrats(true);
        setTimeout(() => setShowCongrats(false), 4000);
      }
    } catch (err) {
      console.error("❌ Failed to update status:", err);
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'rejected':
        return 'border-red-500';
      case 'no_response':
        return 'border-yellow-400';
      case 'interviewing':
        return 'border-blue-500';
      case 'accepted':
        return 'border-green-500';
      default:
        return 'border-gray-300';
    }
  };

  return (
    <div className="p-6 w-full bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">My Applications</h1>

      {showCongrats && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          🎉 Congratulations! You marked this job as <strong>ACCEPTED</strong>!
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : applications.length === 0 ? (
        <p className="text-gray-600">You haven’t applied to any jobs yet.</p>
      ) : (
        <ul className="space-y-6">
          {applications.map(({ job, app }) => (
            <li
              key={job.id}
              className={`w-full bg-white rounded-lg p-6 shadow-sm flex justify-between items-start border-2 ${getBorderColor(app.status)}`}
            >
              <div className="flex gap-4 w-full">
                <FaBriefcase className="text-green-600 text-xl mt-1 shrink-0" />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/jobs/${job.id}`}>
                      <h2 className="text-xl font-semibold text-gray-800 hover:underline flex items-center gap-2">
                        {job.title}
                        {job.verified && <FaCheckCircle className="text-green-600 text-sm" />}
                      </h2>
                    </Link>

                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Go to job posting"
                        className="text-blue-600 hover:text-blue-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FaExternalLinkAlt />
                      </a>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <FaBuilding /> {job.company}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <FaMapMarkerAlt /> {job.location} | {job.workType}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Applied: {app.appliedAt?.toDate?.().toLocaleDateString?.() || '—'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end justify-start min-w-[140px] ml-4 gap-2">
                {user?.uid && (
                  <ApplicationUpdatePrompt
                    userId={user.uid}
                    jobId={job.id}
                    company={job.company}
                    onStatusUpdateAction={(status) =>
                      updateStatus(job.id, status, app.status)
                    }
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
