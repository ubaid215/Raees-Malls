import React, { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const AdminProfile = () => {
  const { admin, changeAdminPassword, error: contextError } = useAdminAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePasswords = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      setLocalError('New password and confirm password must match');
      return false;
    }
    if (formData.newPassword.length < 6) {
      setLocalError('New password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');

    if (!validatePasswords()) {
      return;
    }

    try {
      const result = await changeAdminPassword(formData.currentPassword, formData.newPassword);
      setSuccess(result.message || 'Password changed successfully!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      if (err.status === 429) {
        setLocalError(`Too many attempts. Please try again in ${err.retryAfter || 'a few'} seconds.`);
      } else if (err.errors && err.errors.length > 0) {
        setLocalError(err.errors.join(', ')); // Display backend validation errors
      } else {
        setLocalError(err.message || 'Failed to change password');
      }
    }
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'current') setShowCurrentPassword(!showCurrentPassword);
    if (field === 'new') setShowNewPassword(!showNewPassword);
    if (field === 'confirm') setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-[#E63946] mb-6">Admin Profile</h2>
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700">Welcome, {admin?.name || 'Admin'}</h3>
          <p className="text-sm text-gray-500">Email: {admin?.email || 'N/A'}</p>
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">Change Password</h3>
        {(localError || contextError) && (
          <p className="text-red-500 text-sm text-center mb-4">{localError || contextError}</p>
        )}
        {success && (
          <p className="text-green-500 text-sm text-center mb-4">{success}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <input
              id="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData({ ...formData, currentPassword: e.target.value })
              }
              placeholder="Enter current password"
              required
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63946]"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6"
            >
              {showCurrentPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          <div className="relative">
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
              placeholder="Enter new password"
              required
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63946]"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6"
            >
              {showNewPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          <div className="relative">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              placeholder="Confirm new password"
              required
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63946]"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute inset-y-0 right-0 Converter to Grok 3 built by xAI flex items-center pr-3 mt-6"
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-[#E63946] text-white py-2 rounded-md hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] border transition-colors"
          >
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminProfile;