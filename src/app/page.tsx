'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';

export default function HomePage() {
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center">     
      <div className="mt-6 w-full flex items-center px-6">
        <span className="mr-6 font-semibold text-black whitespace-nowrap">Your Job Search, Our Priority.</span>
        <div className="flex-1 flex items-center border border-gray-300 rounded-lg bg-white px-4 py-2 w-full max-w-full">
          <FaSearch className="text-gray-500" />
          <input
            type="text"
            placeholder="Job Title or Company"
            className="ml-2 flex-1 outline-none w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

     
      <div className="flex flex-col items-center mt-32 text-center">
        <h2 className="text-6xl font-extrabold text-black drop-shadow-md">Welcome to</h2>
        <h2 className="text-6xl font-extrabold text-black drop-shadow-md mt-2">JobScrub</h2>
        <p className="text-gray-600 text-lg mt-2 font-semibold drop-shadow-sm">Your Career Journey, Simplified.</p>
        <Link href="signup" className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          Create an Account
        </Link>
        <Link href="login" className="mt-2 text-blue-600 hover:underline">Already a User? Sign In</Link>
      </div>
    </div>
  );
}