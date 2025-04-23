import { useState } from 'react';
import { MoreVertical, ChevronDown } from 'lucide-react';

// Helper function to safely get initials
const getInitials = (name?: string) => {
  if (!name) return '??';
  return name.substring(0, 2).toUpperCase();
};

interface GroupMemberItemProps {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  isCurrentUser: boolean;
  onChangeRole?: (userId: string, newRole: 'ADMIN' | 'MEMBER') => void;
  onRemoveMember?: (userId: string) => void;
}

export default function GroupMemberItem({
  userId,
  name,
  avatarUrl,
  role,
  isCurrentUser,
  onChangeRole,
  onRemoveMember,
}: GroupMemberItemProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const handleRoleChange = (newRole: 'ADMIN' | 'MEMBER') => {
    if (onChangeRole) {
      onChangeRole(userId, newRole);
    }
    setRoleMenuOpen(false);
    setDropdownOpen(false);
  };

  const handleRemoveMember = () => {
    if (onRemoveMember) {
      onRemoveMember(userId);
    }
    setDropdownOpen(false);
  };

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {getInitials(name)}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {name} {isCurrentUser && <span className="text-xs text-gray-500">(You)</span>}
            </h3>
            <div className="flex items-center">
              <div className="text-xs text-gray-500">
                {role === 'OWNER'
                  ? 'Owner'
                  : role === 'ADMIN'
                  ? 'Admin'
                  : 'Member'}
              </div>
            </div>
          </div>
        </div>

        {/* Only show options for non-owners and if the current user has permission */}
        {role !== 'OWNER' && (
          <div className="relative">
            <button
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <MoreVertical size={16} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                {/* Change role option */}
                <div className="relative">
                  <button
                    className="flex items-center justify-between w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  >
                    <span>Change role</span>
                    <ChevronDown size={14} />
                  </button>

                  {roleMenuOpen && (
                    <div className="absolute left-full ml-2 top-0 w-40 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          role === 'ADMIN' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => handleRoleChange('ADMIN')}
                        disabled={role === 'ADMIN'}
                      >
                        Admin
                      </button>
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          role === 'MEMBER' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => handleRoleChange('MEMBER')}
                        disabled={role === 'MEMBER'}
                      >
                        Member
                      </button>
                    </div>
                  )}
                </div>

                {/* Remove member option */}
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  onClick={handleRemoveMember}
                >
                  Remove from group
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}