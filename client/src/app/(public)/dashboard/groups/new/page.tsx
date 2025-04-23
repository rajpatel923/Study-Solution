'use client'; // Mark as client component

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use from navigation, not router
import { ArrowLeft, Upload, X } from 'lucide-react';
import { createGroup } from '@/services/groupService';

export default function NewGroup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'PRIVATE',
    allowMemberSharing: true,
  });
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await createGroup({
        name: formData.name,
        description: formData.description,
        avatarUrl: avatarPreview,
        settings: {
          visibility: formData.visibility as 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY',
          allowMemberSharing: formData.allowMemberSharing,
        },
      });

      // Use App Router navigation
      router.push(`/groups/${response.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <button
          className="flex items-center text-gray-600 hover:text-gray-900"
          onClick={handleBack}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Group</h1>

        <form onSubmit={handleSubmit}>
          {/* Group avatar */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Avatar
            </label>

            {avatarPreview ? (
              <div className="relative inline-block">
                <img
                  src={avatarPreview}
                  alt="Group avatar preview"
                  className="h-24 w-24 rounded-full object-cover"
                />
                <button
                  type="button"
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                  onClick={removeAvatar}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 w-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 cursor-pointer overflow-hidden relative"
                onClick={() => document.getElementById('avatar-input')?.click()}
              >
                <Upload size={24} className="text-gray-400" />
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            )}
          </div>

          {/* Group name */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Group Name*
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter group name"
            />
          </div>

          {/* Group description */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the purpose of this group"
            />
          </div>

          {/* Group visibility */}
          <div className="mb-4">
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
              Group Visibility
            </label>
            <select
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="PUBLIC">Public - Anyone can find and join</option>
              <option value="PRIVATE">Private - Invitation required to join</option>
              <option value="INVITE_ONLY">Invite Only - Only visible to members</option>
            </select>
          </div>

          {/* Sharing permissions */}
          <div className="mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowMemberSharing"
                name="allowMemberSharing"
                checked={formData.allowMemberSharing}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="allowMemberSharing" className="ml-2 block text-sm text-gray-700">
                Allow all members to share items in this group
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              If disabled, only group admins can share items.
            </p>
          </div>

          {/* Submit button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              disabled={loading || !formData.name.trim()}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}