'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/auth-context';
import { db } from '@/app/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
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
  FaExternalLinkAlt,
  FaTrashAlt
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

  const deleteApplication = async (jobId: string, status: string) => {
    if (!user?.uid || !status) return;
    const confirm = window.confirm("Are you sure you want to delete this application?");
    if (!confirm) return;

    try {
      const userRef = doc(db, "users", user.uid, "applications", jobId);
      const statsRef = doc(db, "jobStats", jobId);

      await deleteDoc(userRef);
      await setDoc(statsRef, {
        [status]: increment(-1),
        totalApplicants: increment(-1),
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      setApplications(prev => prev.filter(entry => entry.job.id !== jobId));
    } catch (err) {
      console.error("❌ Failed to delete application:", err);
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
                  <Link href={`/jobs/${job.id}`} className="block">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      {job.title}
                      {job.verified && <FaCheckCircle className="text-green-600 text-sm" />}
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 ml-1"
                          title="Go to job posting"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FaExternalLinkAlt />
                        </a>
                      )}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                      <FaBuilding /> {job.company}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <FaMapMarkerAlt /> {job.location} | {job.workType}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Applied: {app.appliedAt?.toDate?.().toLocaleDateString?.() || '—'}
                    </p>
                  </Link>
                </div>
              </div>

              <div className="flex flex-col items-end justify-start min-w-[140px] ml-4 gap-2">
                <label htmlFor="status" className="text-sm font-medium text-gray-600">
                  Status
                </label>
                <select
                  value={app.status}
                  onChange={(e) => updateStatus(job.id, e.target.value, app.status)}
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition duration-150 capitalize"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => deleteApplication(job.id, app.status)}
                  className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                >
                  <FaTrashAlt /> Delete Application
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
