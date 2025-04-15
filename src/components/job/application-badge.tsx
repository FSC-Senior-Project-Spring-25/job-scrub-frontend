'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { FaRegClock } from 'react-icons/fa';

export default function ApplicationBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.uid) return;

      const appRef = collection(db, 'users', user.uid, 'applications');
      const appSnap = await getDocs(appRef);
      setCount(appSnap.size);
    };

    fetchApplications();
  }, [user]);

  return (
    <Link
      href="/applications"
      className="flex px-3 py-2 rounded hover:bg-gray-100 items-center"
    >
      <FaRegClock className="mr-2" />
      My Job Applications
      {count > 0 && (
        <span className="ml-auto text-sm bg-gray-200 px-2 py-0.5 rounded text-gray-700">
          {count}
        </span>
      )}
    </Link>
  );
}
