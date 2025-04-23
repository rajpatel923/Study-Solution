import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { Group, updateGroup } from '@/services/groupService';

interface GroupSettingsProps {
  group: Group;
  onClose: () => void;
  onGroupUpdated: (updatedGroup: Group) => void;
}

export default function GroupSettings({ group, onClose, onGroupUpdated }: GroupSettingsProps) {
  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description || '',
    visibility: group.settings.visibility,
    allowMemberSharing: group.settings.allowMemberSharing,
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(group.avatarUrl || null);
  const [loading, setLoading] = useState(false);

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
      const updatedData = {
        name: formData.name,
        description: formData.description,
        avatarUrl: avatarPreview,
        settings: {
          visibility: formData.visibility as 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY',
          allowMemberSharing: formData.allowMemberSharing,
        },
      };

      const updatedGroup = await updateGroup(group.id, updatedData);
      
      if (onGroupUpdated) {
        onGroupUpdated(updatedGroup);
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating group:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 sticky top-0 bg-white border-b border-gray-200">
          <h2 className="text-lg font-semibold">Group Settings</h2>
          <button
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
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

            {/* Danger Zone */}
            <div className="mt-8 border border-red-200 rounded-md p-4 bg-red-50">
              <h3 className="text-sm font-medium text-red-800 mb-2">Danger Zone</h3>
              <p className="text-xs text-red-600 mb-3">
                These actions are destructive and cannot be undone.
              </p>
              <button
                type="button"
                className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded-md hover:bg-red-100"
                onClick={() => {
                  // In a real app, you would show a confirmation dialog before deleting
                  if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
                    // Delete group API call would go here
                    // For now, just close the modal
                    onClose();
                  }
                }}
              >
                Delete Group
              </button>
            </div>

            {/* Submit buttons */}
            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || !formData.name.trim()}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}