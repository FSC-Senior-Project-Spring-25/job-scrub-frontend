"use client";

import { useState } from 'react';
import Link from 'next/link';
import { FaUser, FaBars, FaTimes } from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from '@/app/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/AuthContext';

interface NavItem {
  href: string;
  label: string;
}

interface TopBarProps {
  navItems?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  { href: '/report', label: 'Report a Job' },
  { href: '/match', label: 'Match your resume' },
  { href: '/enhance', label: 'Enhance your resume' },
  { href: '/connect', label: 'Connect with others' },
];

    

export function TopBar({ navItems = defaultNavItems }: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const {user} = useAuth();
  const router = useRouter();
   const logout = async()=>{
       await signOut(auth);
        router.push("/login");
      
   }

  return (
    <nav className="w-full bg-white shadow-md">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Link href="/" className="text-2xl font-bold text-green-700 hover:text-green-800 transition-colors whitespace-nowrap mr-4">
              JobScrub
            </Link>
            <div className="hidden sm:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-700 hover:text-green-600 transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">

            {/* Displaying the signin and signout button if the user is logged in or logged out */}
            {
              user ? 
           <button onClick={logout}className="hidden ml-3 sm:flex text-gray-700 hover:text-green-600 transition-colors items-center whitespace-nowrap">
              <FaUser className="mr-2" />
              <span>Sign Out</span>
           </button> :
              <Link
              href="/login"
              className="hidden sm:flex text-gray-700 hover:text-green-600 transition-colors items-center whitespace-nowrap" >
              <FaUser className="mr-2" />
              <span>Sign In</span>
            </Link>
            }
            <button
              onClick={toggleMenu}
              className="sm:hidden text-gray-700 hover:text-green-600 transition-colors ml-4"
            >
              {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-700 hover:text-green-600 transition-colors block px-3 py-2"
                onClick={toggleMenu}
              >
                {item.label}
              </Link>
            ))}

            {
              user ? 
           <button onClick={logout}className="text-gray-700 hover:text-green-600 transition-colors flex items-center px-3 py-2">
              <FaUser className="mr-2" />
              <span>Sign Out</span>
           </button> 
           :
            <Link
              href="/login"
              className="text-gray-700 hover:text-green-600 transition-colors flex items-center px-3 py-2"
              onClick={toggleMenu}
            >
              <FaUser className="mr-2" />
              <span>Sign In</span>
            </Link>
            }
          </div>
        </div>
      )}
    </nav>
  );
}
