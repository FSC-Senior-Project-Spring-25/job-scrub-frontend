'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/auth-context';
import { db } from '@/app/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FaRegBookmark } from 'react-icons/fa';

export default function SavedJobsBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!user?.uid) return;

      const savedRef = collection(db, 'users', user.uid, 'savedJobs');
      const snap = await getDocs(savedRef);
      setCount(snap.size);
    };

    fetchSavedJobs();
  }, [user]);

  return (
    <Link
      href="/jobs/saved"
      className="flex px-3 py-2 rounded hover:bg-gray-100 items-center"
    >
      <FaRegBookmark className="mr-2" />
      Saved Jobs
      {count > 0 && (
        <span className="ml-auto text-sm bg-gray-200 px-2 py-0.5 rounded text-gray-700">
          {count}
        </span>
      )}
    </Link>
  );
}
