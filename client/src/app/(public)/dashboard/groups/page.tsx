"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, Users, FileText, MessageSquare } from 'lucide-react';
import GroupCard from '@/components/groups/GroupCard';
import { getMyGroups } from '@/services/groupService';

interface Group {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  memberCount: number;
  lastActivity?: string;
}

export default function Group() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user's groups from the API
    const fetchGroups = async () => {
      try {
        const userId = localStorage.getItem('userId') || '';
        const response = await getMyGroups()
          
        if (response) {
  
          // Add member count for display purposes (in a real app, this would be returned by the API)
          const enhancedData = response.map((group: any) => ({
            ...group,
            memberCount: group.members?.length || Math.floor(Math.random() * 10) + 1,
          }));
          setGroups(enhancedData);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  return (  
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Your Groups</h1>
          <Link
            href="/dashboard/groups/new"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={18} className="mr-2" />
            Create Group
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mb-4 flex justify-center">
              <Users size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No groups yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first group to start collaborating with others.
            </p>
            <Link
              href="/dashboard/groups/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusCircle size={18} className="mr-2" />
              Create a Group
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}

        {groups.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <FileText size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      <span className="text-blue-600">Sarah Johnson</span> shared a document in{" "}
                      <Link href="/dashboard/groups/1" className="text-blue-600 hover:underline">
                        Biology Study Group
                      </Link>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <MessageSquare size={20} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      <span className="text-blue-600">Michael Chen</span> posted a message in{" "}
                      <Link href="/dashboard/groups/2" className="text-blue-600 hover:underline">
                        Project Alpha Team
                      </Link>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Yesterday</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Users size={20} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      <span className="text-blue-600">You</span> added 3 members to{" "}
                      <Link href="/dashboard/groups/3" className="text-blue-600 hover:underline">
                        Marketing Team
                      </Link>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">3 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    
  );
}