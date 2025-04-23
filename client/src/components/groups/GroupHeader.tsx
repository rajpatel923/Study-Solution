'use client'; // Mark as client component

import { useState, useEffect } from 'react';
import { Bell, Settings, User } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  name: string;
  avatarUrl?: string;
}

export default function Header() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Only run this code in the browser
    if (typeof window === 'undefined') return;
    
    // For demo purposes, we'll just use a mock user
    // In a real app, you would fetch this from your API
    setUser({
      id: '123',
      name: 'John Doe',
      avatarUrl: '/avatars/user.jpg',
    });

    
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center">
        <div className="text-xl font-semibold text-gray-800">GroupShare</div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
          <Bell size={20} />
        </button>
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
          <Settings size={20} />
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            className="flex items-center space-x-2"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setDropdownOpen(false)}
              >
                Your Profile
              </Link>
              <Link
                href="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setDropdownOpen(false)}
              >
                Settings
              </Link>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setDropdownOpen(false);
                  // Handle logout logic here
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}