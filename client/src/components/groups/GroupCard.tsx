import Link from 'next/link';
import { Users, FileText, MessageSquare } from 'lucide-react';

interface GroupProps {
  group: {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
    memberCount: number;
    lastActivity?: string;
  };
}

export default function GroupCard({ group }: GroupProps) {
  return (
    <Link
      href={`/dashboard/groups/${group.id}`}
      className="block bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Group header with background color or image */}
      <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        {group.avatarUrl && (
          <img
            src={group.avatarUrl}
            alt={group.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>

      {/* Group content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{group.name}</h3>
        {group.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{group.description}</p>
        )}

        {/* Group stats */}
        <div className="flex items-center text-sm text-gray-500 space-x-4">
          <div className="flex items-center">
            <Users size={16} className="mr-1" />
            <span>{group.memberCount} members</span>
          </div>
          <div className="flex items-center">
            <FileText size={16} className="mr-1" />
            <span>7 files</span>
          </div>
        </div>

        {/* Last activity */}
        {group.lastActivity && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex items-center">
              <MessageSquare size={14} className="mr-1" />
              <span>Last activity {group.lastActivity}</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}