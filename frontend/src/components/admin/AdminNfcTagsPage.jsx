import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Power, PowerOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, Badge, Input, Select, Modal, LoadingSpinner } from '../ui';
import { nfcService, userService } from '../../services';
import toast from 'react-hot-toast';

export const AdminNfcTagsPage = () => {
  const [tags, setTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [addModal, setAddModal] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState({ open: false, tag: null });
  const [addForm, setAddForm] = useState({ uid: '', userId: '', label: '' });
  const [deactivateReason, setDeactivateReason] = useState('');

  const fetchTags = async (page = 1) => {
    try {
      setLoading(true);
      const response = await nfcService.getAllTags({ page, limit: 20 });
      setTags(response.data.tags);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load NFC tags');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userService.getUsers({ limit: 100 });
      setUsers(response.data.users.filter(u => u.isActive));
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  useEffect(() => {
    fetchTags();
    fetchUsers();
  }, []);

  const handleAddTag = async () => {
    if (!addForm.uid || !addForm.userId) {
      toast.error('UID and User are required');
      return;
    }

    try {
      await nfcService.registerTag(addForm);
      toast.success('NFC tag registered successfully');
      setAddModal(false);
      setAddForm({ uid: '', userId: '', label: '' });
      fetchTags(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register NFC tag');
    }
  };

  const handleDeactivateTag = async () => {
    if (!deactivateReason.trim()) {
      toast.error('Deactivation reason is required');
      return;
    }

    try {
      await nfcService.deactivateTag(deactivateModal.tag._id, deactivateReason);
      toast.success('NFC tag deactivated');
      setDeactivateModal({ open: false, tag: null });
      setDeactivateReason('');
      fetchTags(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate NFC tag');
    }
  };

  const handleReactivateTag = async (tagId) => {
    try {
      await nfcService.reactivateTag(tagId);
      toast.success('NFC tag reactivated');
      fetchTags(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reactivate NFC tag');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchTags(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NFC Tags Management</h1>
          <p className="text-gray-500">Register and manage NFC tags</p>
        </div>
        <Button onClick={() => setAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Register Tag
        </Button>
      </div>

      {/* Tags List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto" />
            <p className="text-gray-500 mt-4">No NFC tags registered</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">UID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Label</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Last Used</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tags.map((tag) => (
                  <tr key={tag._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                        {tag.uid}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {tag.label || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{tag.userId?.name}</p>
                        <p className="text-sm text-gray-500">{tag.userId?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={tag.isActive ? 'success' : 'danger'}>
                        {tag.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {tag.lastUsedAt 
                        ? new Date(tag.lastUsedAt).toLocaleDateString() 
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {tag.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeactivateModal({ open: true, tag })}
                          >
                            <PowerOff className="w-4 h-4 text-red-500" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivateTag(tag._id)}
                          >
                            <Power className="w-4 h-4 text-green-500" />
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
              Page {pagination.page} of {pagination.pages} ({pagination.total} tags)
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

      {/* Add Tag Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title="Register NFC Tag"
      >
        <div className="space-y-4">
          <Input
            label="NFC UID"
            value={addForm.uid}
            onChange={(e) => setAddForm({ ...addForm, uid: e.target.value.toUpperCase() })}
            placeholder="e.g., NFC001ABC"
          />
          <Select
            label="Assign to User"
            value={addForm.userId}
            onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })}
            options={[
              { value: '', label: 'Select a user...' },
              ...users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))
            ]}
          />
          <Input
            label="Label (Optional)"
            value={addForm.label}
            onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
            placeholder="e.g., Primary Card"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTag}>
              Register Tag
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Modal */}
      <Modal
        isOpen={deactivateModal.open}
        onClose={() => setDeactivateModal({ open: false, tag: null })}
        title="Deactivate NFC Tag"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to deactivate the NFC tag <strong>{deactivateModal.tag?.uid}</strong>?
          </p>
          <Input
            label="Reason for deactivation"
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
            placeholder="Enter reason..."
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => setDeactivateModal({ open: false, tag: null })}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeactivateTag}>
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminNfcTagsPage;
