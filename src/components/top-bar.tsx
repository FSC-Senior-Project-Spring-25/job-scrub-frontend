"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  FaUser,
  FaBars,
  FaTimes,
  FaSearch,
  FaBriefcase,
  FaRegFileAlt,
  FaUserCircle,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth-context";
import { toast } from "sonner";
import UserSearch from "@/components/UserSearch";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Switch } from "./ui/switch";

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface TopBarProps {
  navItems?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  {
    href: "/jobs",
    label: "Jobs",
    icon: <FaBriefcase className="mr-2" />,
  },
  {
    href: "/match",
    label: "Match",
    icon: <FaSearch className="mr-2" />,
  },
  {
    href: "/scrubby",
    label: "Scrubby",
    icon: <FaRegFileAlt className="mr-2" />,
  },
];

export function TopBar({ navItems = defaultNavItems }: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false); // 👈 added

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profilePath = user ? `/profile/${user.uid}` : "/login";

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);

  const handleLogout = async () => {
    const result = await logout();
    if (!result.success) {
      console.error("Logout failed:", result.error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

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
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  return (
    <>
      <div className="sticky top-0 z-50 bg-white dark:bg-background shadow-md">
        <nav className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-4 sm:space-x-8">
              <Link
                href="/"
                className="text-2xl font-bold text-green-700 hover:text-green-800 transition-colors duration-300 flex items-center"
              >
                <span className="bg-green-700 text-white px-2 py-1 rounded mr-1">
                  Job
                </span>
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

            <div className="hidden lg:block w-64 mx-4">
              <UserSearch />
            </div>

            {/* User Actions */}
            <div className="flex items-center">
              {/* Theme toggle switch */}
              {mounted && (
                <div className="flex items-center mr-8">
                  <Moon className="mr-2 h-6 w-6 text-gray-500 dark:text-gray-400" />
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    className="data-[state=checked]:bg-green-600"
                    aria-label="Toggle Theme"
                  />
                  <Sun className="ml-2 h-6 w-6 text-amber-500" />
                </div>
              )}

              {loading ? (
                <div className="flex items-center text-gray-500">
                  <div className="animate-pulse h-8 w-24 bg-gray-200 rounded" />
                </div>
              ) : user ? (
                <div className="flex items-center">
                  <div className="hidden lg:block mr-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Welcome, {user.displayName || user.email?.split("@")[0]}
                    </span>
                  </div>

                  {/* Profile dropdown */}
                  <div className="relative ml-3">
                    <button
                      ref={profileButtonRef}
                      onClick={toggleProfileMenu}
                      className="flex items-center text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500"
                    >
                      <FaUserCircle size={24} />
                      <span className="ml-1 hidden sm:inline">Profile</span>
                    </button>

                    {isProfileMenuOpen && (
                      <div
                        ref={profileMenuRef}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-background rounded-md shadow-lg py-1 z-50"
                      >
                        <Link
                          href={profilePath}
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          View Profile
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsProfileMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <Link
                    href="/login"
                    className="flex items-center px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-300"
                  >
                    <FaUser className="mr-2" />
                    <span>Sign In</span>
                  </Link>
                </div>
              )}
              {!loading && (
                <button
                  onClick={toggleMenu}
                  className="lg:hidden text-gray-700 dark:text-gray-300 hover:text-green-600 transition-colors ml-4"
                  aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {isMenuOpen && !loading && (
          <div className="lg:hidden w-full bg-white dark:bg-background shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={toggleMenu}
                  className="flex items-center text-gray-700 hover:text-green-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link
                    href={profilePath}
                    onClick={toggleMenu}
                    className="flex items-center text-gray-700 hover:text-green-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
                  >
                    <FaUserCircle className="mr-2" />
                    View Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      toggleMenu();
                    }}
                    className="flex items-center w-full text-left text-gray-700 hover:text-green-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
                  >
                    <FaUser className="mr-2" />
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Line between Topbar and content */}
        <div className="border-t border-gray-300 dark:border-gray-700" />
      </div>
    </>
  );
}
