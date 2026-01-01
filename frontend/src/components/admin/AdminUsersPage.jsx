import React, { useState, useEffect } from 'react';
import { Users, Edit2, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, Badge, Input, Select, Modal, LoadingSpinner } from '../ui';
import { userService, dashboardService } from '../../services';
import toast from 'react-hot-toast';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [viewModal, setViewModal] = useState({ open: false, user: null, dashboard: null });
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [editForm, setEditForm] = useState({ name: '', role: '', isActive: true });

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await userService.getUsers({ page, limit: 20 });
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleViewUser = async (user) => {
    try {
      const dashboardResponse = await dashboardService.getUserDashboard(user.id);
      setViewModal({ 
        open: true, 
        user, 
        dashboard: dashboardResponse.data 
      });
    } catch (error) {
      toast.error('Failed to load user dashboard');
    }
  };

  const handleEditUser = (user) => {
    setEditForm({
      name: user.name,
      role: user.role,
      isActive: user.isActive
    });
    setEditModal({ open: true, user });
  };

  const handleSaveUser = async () => {
    try {
      await userService.updateUser(editModal.user.id, editForm);
      toast.success('User updated successfully');
      setEditModal({ open: false, user: null });
      fetchUsers(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      await userService.deleteUser(userId);
      toast.success('User deactivated');
      fetchUsers(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate user');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchUsers(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-500">Manage all users in the system</p>
        </div>
      </div>

      {/* Users List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Timezone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'Admin' ? 'info' : 'default'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.profile?.timezone || 'Not set'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {user.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivateUser(user.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages} ({pagination.total} users)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* View User Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, user: null, dashboard: null })}
        title={`${viewModal.user?.name}'s Dashboard`}
        size="lg"
      >
        {viewModal.dashboard && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-semibold text-gray-900">
                  {viewModal.dashboard.status === 'WORKING' ? 'Working' : 'Not Working'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Today Worked</p>
                <p className="font-semibold text-gray-900">
                  {viewModal.dashboard.todayStats?.totalWorkedFormatted || '0h 0m'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Daily Target</p>
                <p className="font-semibold text-gray-900">
                  {viewModal.dashboard.todayStats?.dailyTargetFormatted || '8h 0m'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Progress</p>
                <p className="font-semibold text-gray-900">
                  {viewModal.dashboard.todayStats?.progressPercent || 0}%
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Today's Punches</h4>
              {viewModal.dashboard.todayPunches?.length === 0 ? (
                <p className="text-gray-500">No punches today</p>
              ) : (
                <div className="space-y-2">
                  {viewModal.dashboard.todayPunches?.map((punch) => (
                    <div key={punch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant={punch.type === 'IN' ? 'success' : 'danger'}>
                          {punch.type}
                        </Badge>
                        <span>{punch.timeLocal}</span>
                      </div>
                      <Badge variant="info">{punch.source}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, user: null })}
        title="Edit User"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Select
            label="Role"
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            options={[
              { value: 'User', label: 'User' },
              { value: 'Admin', label: 'Admin' }
            ]}
          />
          <Select
            label="Status"
            value={editForm.isActive}
            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
            options={[
              { value: true, label: 'Active' },
              { value: false, label: 'Inactive' }
            ]}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setEditModal({ open: false, user: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
