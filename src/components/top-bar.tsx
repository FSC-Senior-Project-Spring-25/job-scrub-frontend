"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FaUser, FaBars, FaTimes, FaSearch, FaBriefcase, FaRegFileAlt, FaUserCircle } from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from '@/app/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/AuthContext';

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface TopBarProps {
  navItems?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  { href: '/report', label: 'Report a Job', icon: <FaBriefcase className="mr-2" /> },
  { href: '/match', label: 'Match Resume', icon: <FaSearch className="mr-2" /> },
  { href: '/enhance', label: 'Enhance Resume', icon: <FaRegFileAlt className="mr-2" /> },
  { href: '/connect', label: 'Connect', icon: <FaUser className="mr-2" /> },
];

export function TopBar({ navItems = defaultNavItems }: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  
  // Add refs for dropdown menus
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);
  
  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Handle clicks outside the profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isProfileMenuOpen && 
        profileMenuRef.current && 
        profileButtonRef.current && 
        !profileMenuRef.current.contains(event.target as Node) && 
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    // Add event listener when dropdown is open
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  return (
    <nav className="w-full bg-white shadow-md sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Link href="/" className="text-2xl font-bold text-green-700 hover:text-green-800 transition-colors duration-300 flex items-center">
              <span className="bg-green-700 text-white px-2 py-1 rounded mr-1">Job</span>
              <span>Scrub</span>
            </Link>
            
            <div className="hidden lg:flex space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-700 hover:text-green-600 hover:scale-105 transition-all duration-300 whitespace-nowrap flex items-center"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center">
                <div className="hidden lg:block mr-4">
                  <span className="text-sm text-gray-600">Welcome, {user.displayName || user.email?.split('@')[0]}</span>
                </div>
                
                {/* Profile dropdown */}
                <div className="relative ml-3">
                  <div>
                    <button 
                      ref={profileButtonRef}
                      onClick={toggleProfileMenu}
                      className="flex items-center text-gray-700 hover:text-green-600"
                    >
                      <FaUserCircle size={24} />
                      <span className="ml-1 hidden sm:inline">Profile</span>
                    </button>
                  </div>
                  
                  {isProfileMenuOpen && (
                    <div 
                      ref={profileMenuRef}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                    >
                      <Link 
                        href="/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        View Profile
                      </Link>
                      <button 
                        onClick={() => {
                          logout();
                          setIsProfileMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-300"
              >
                <FaUser className="mr-2" />
                <span>Sign In</span>
              </Link>
            )}
            
            <button
              onClick={toggleMenu}
              className="lg:hidden text-gray-700 hover:text-green-600 transition-colors ml-4"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden absolute w-full bg-white shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center text-gray-700 hover:text-green-600 hover:bg-gray-50 transition-colors px-3 py-2 rounded"
                onClick={toggleMenu}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            
            {user && (
              <>
                <Link
                  href="/profile"
                  className="flex items-center text-gray-700 hover:text-green-600 hover:bg-gray-50 transition-colors px-3 py-2 rounded"
                  onClick={toggleMenu}
                >
                  <FaUserCircle className="mr-2" />
                  View Profile
                </Link>
                <button 
                  onClick={() => {
                    logout();
                    toggleMenu();
                  }}
                  className="flex items-center w-full text-left text-gray-700 hover:text-green-600 hover:bg-gray-50 transition-colors px-3 py-2 rounded"
                >
                  <FaUser className="mr-2" />
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}