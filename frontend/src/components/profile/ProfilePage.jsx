import React, { useState } from 'react';
import { User, Clock, Calendar, Globe, Save, Lock } from 'lucide-react';
import { Card, Button, Input, Select, Badge } from '../ui';
import { useAuthStore } from '../../store/authStore';
import { userService, authService } from '../../services';
import toast from 'react-hot-toast';

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' }
];

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const WORK_HOURS_OPTIONS = [
  { value: 360, label: '6 hours' },
  { value: 420, label: '7 hours' },
  { value: 480, label: '8 hours' },
  { value: 540, label: '9 hours' },
  { value: 600, label: '10 hours' }
];

export const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    timezone: user?.profile?.timezone || 'Asia/Kolkata',
    dailyWorkTarget: user?.profile?.dailyWorkTarget || 480,
    workingDays: user?.profile?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    breakDuration: user?.profile?.breakDuration || 60,
    preferredPunchMethod: user?.profile?.preferredPunchMethod || 'NFC'
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleDayToggle = (day) => {
    setProfileForm(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const handleProfileSave = async () => {
    try {
      setLoading(true);
      const response = await userService.updateProfile({
        name: profileForm.name,
        profile: {
          timezone: profileForm.timezone,
          dailyWorkTarget: parseInt(profileForm.dailyWorkTarget),
          workingDays: profileForm.workingDays,
          breakDuration: parseInt(profileForm.breakDuration),
          preferredPunchMethod: profileForm.preferredPunchMethod
        }
      });
      updateUser(response.data.user);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-500">Manage your account and work preferences</p>
      </div>

      {/* User Info */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-gray-500">{user?.email}</p>
            <Badge variant={user?.role === 'Admin' ? 'info' : 'default'} className="mt-1">
              {user?.role}
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Full Name"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
          />
        </div>
      </Card>

      {/* Work Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-gray-900">Work Settings</h3>
        </div>

        <div className="space-y-6">
          <Select
            label="Timezone"
            value={profileForm.timezone}
            onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
            options={TIMEZONES}
          />

          <Select
            label="Daily Work Target"
            value={profileForm.dailyWorkTarget}
            onChange={(e) => setProfileForm({ ...profileForm, dailyWorkTarget: e.target.value })}
            options={WORK_HOURS_OPTIONS}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Working Days
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => handleDayToggle(day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    profileForm.workingDays.includes(day)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Preferred Punch Method"
              value={profileForm.preferredPunchMethod}
              onChange={(e) => setProfileForm({ ...profileForm, preferredPunchMethod: e.target.value })}
              options={[
                { value: 'NFC', label: 'NFC Tag' },
                { value: 'Manual', label: 'Manual' }
              ]}
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end">
          <Button onClick={handleProfileSave} loading={loading}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
        </div>

        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
          />
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end">
          <Button 
            variant="secondary" 
            onClick={handlePasswordChange} 
            loading={passwordLoading}
            disabled={!passwordForm.currentPassword || !passwordForm.newPassword}
          >
            Change Password
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
