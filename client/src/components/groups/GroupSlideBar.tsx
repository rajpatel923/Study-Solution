'use client'; // Add this to make it a client component

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Use usePathname instead of useRouter for checking active routes
import { Search, Plus, } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  avatarUrl?: string;
}

export default function Sidebar() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    // Fetch user's groups from the API
    const fetchGroups = async () => {
      try {
        // In client-side code, we can safely check for window and localStorage
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
        
        const response = await fetch(`/api/groups`, {
          headers: {
            userId,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setGroups(data);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4">
        <h1 className="text-xl font-bold text-blue-600">Messages</h1>
      </div>
      
      {/* Search bar */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="w-full py-2 pl-10 pr-4 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Pinned messages */}
      <div className="px-4 mb-3">
        <div className="flex items-center text-sm text-gray-500">
          <span>Pinned Messages</span>
        </div>
      </div>
      
      {/* Groups list */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {filteredGroups.map((group) => (
              <Link
                href={`/groups/${group.id}`}
                key={group.id}
                className={`flex items-center px-2 py-2 rounded-lg ${
                  pathname === `/groups/${group.id}` ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
                }`}
              >
                {group.avatarUrl ? (
                  <img
                    src={group.avatarUrl}
                    alt={group.name}
                    className="h-8 w-8 rounded-full mr-3"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-gray-600">
                      {group.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 truncate">{group.name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Create new group button */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/groups/new"
          className="flex items-center justify-center w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          <span>New Group</span>
        </Link>
      </div>
    </div>
  );
}