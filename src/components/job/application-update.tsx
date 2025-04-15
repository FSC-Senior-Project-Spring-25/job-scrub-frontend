'use client';

import { useEffect, useState, JSX } from 'react'; // ✅ Fix JSX error
import {
  doc,
  updateDoc,
  setDoc,
  increment,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import {
  FaPhoneAlt,
  FaThumbsUp,
  FaTimesCircle,
  FaRegClock,
} from 'react-icons/fa';

interface Props {
  userId: string;
  jobId: string;
  company: string;
  onStatusUpdateAction?: (status: string) => void; // ✅ Optional callback for external updates
}

const badgeLabels: Record<string, string> = {
  interviewing: "You're interviewing",
  accepted: 'Offer received',
  rejected: 'Not selected',
  no_response: 'No response',
};

const statusIcons: Record<string, JSX.Element> = {
  interviewing: <FaPhoneAlt className="text-blue-600 mr-2" />,
  accepted: <FaThumbsUp className="text-green-600 mr-2" />,
  rejected: <FaTimesCircle className="text-red-600 mr-2" />,
  no_response: <FaRegClock className="text-gray-500 mr-2" />,
};

const statusButtons = [
  { key: 'interviewing', label: "I'm interviewing" },
  { key: 'accepted', label: 'Got an offer' },
  { key: 'rejected', label: 'Was rejected' },
  { key: 'no_response', label: 'No response' },
];

export default function ApplicationUpdatePrompt({
  userId,
  jobId,
  company,
  onStatusUpdateAction,
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const companyId = company.toLowerCase().replace(/[^\w]/g, '');

  useEffect(() => {
    const fetchCurrentStatus = async () => {
      const appRef = doc(db, 'users', userId, 'applications', jobId);
      const snapshot = await getDoc(appRef);
      const data = snapshot.data();
      if (data?.status) setSelectedStatus(data.status);
    };
    fetchCurrentStatus();
  }, [userId, jobId]);

  const handleSelect = async (newStatus: string) => {
    try {
      const appRef = doc(db, 'users', userId, 'applications', jobId);
      const jobStatsRef = doc(db, 'jobStats', jobId);
      const companyRef = doc(db, 'companies', companyId);

      const snapshot = await getDoc(appRef);
      const prevStatus = snapshot.data()?.status;

      await updateDoc(appRef, { status: newStatus });

      const updates: any = {
        [newStatus]: increment(1),
        lastUpdated: serverTimestamp(),
      };
      if (prevStatus && prevStatus !== newStatus) {
        updates[prevStatus] = increment(-1);
      }

      await setDoc(jobStatsRef, updates, { merge: true });
      await setDoc(companyRef, {
        ...updates,
        company,
      }, { merge: true });

      setSelectedStatus(newStatus);
      setShowAll(false);
      if (onStatusUpdateAction) onStatusUpdateAction(newStatus); // ✅ Inform parent
    } catch (err) {
      console.error('❌ Failed to update status from prompt:', err);
    }
  };

  if (selectedStatus) {
    return (
      <div className="flex items-center border border-gray-300 rounded px-3 py-2 text-sm text-black bg-white w-fit">
        {statusIcons[selectedStatus]}
        <span className="mr-4">{badgeLabels[selectedStatus]}</span>
        <button
          onClick={() => {
            setSelectedStatus(null);
            setShowAll(false);
          }}
          className="text-sm text-blue-600 ml-auto hover:underline"
        >
          Update status
        </button>
      </div>
    );
  }

  return (
    <div className="text-sm bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded w-fit mt-2">
      <p className="mb-2 font-medium">Any updates since you applied?</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleSelect('interviewing')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
        >
          I'm interviewing
        </button>
        <button
          onClick={() => setShowAll(true)}
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs"
        >
          I have a different update
        </button>
      </div>

      {showAll && (
        <div className="mt-3 flex flex-wrap gap-2">
          {statusButtons
            .filter((btn) => btn.key !== 'interviewing')
            .map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleSelect(btn.key)}
                className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded text-xs"
              >
                {btn.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
