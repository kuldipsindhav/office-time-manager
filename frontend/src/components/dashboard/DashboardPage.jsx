import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  TrendingUp, 
  Target, 
  ArrowRight,
  RefreshCw,
  Wifi,
  Edit3,
  Trash2
} from 'lucide-react';
import { Card, ProgressBar, Badge, Button, LoadingSpinner, Modal, Input, Select } from '../ui';
import { useDashboard } from '../../hooks';
import { punchService } from '../../services';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
  const { dashboard, loading, refresh } = useDashboard(true, 30000);
  const [punching, setPunching] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, punch: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, punch: null });
  const [editForm, setEditForm] = useState({ punchTime: '', punchType: '', editReason: '' });
  const [deleteReason, setDeleteReason] = useState('');

  const handlePunch = async () => {
    try {
      setPunching(true);
      const response = await punchService.punch('Manual');
      toast.success(response.message);
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Punch failed');
    } finally {
      setPunching(false);
    }
  };

  const handleEditPunch = async () => {
    if (!editForm.editReason.trim()) {
      toast.error('Edit reason is required');
      return;
    }

    try {
      await punchService.editPunch(editModal.punch.id, {
        punchTime: new Date(editForm.punchTime).toISOString(),
        punchType: editForm.punchType,
        editReason: editForm.editReason
      });
      toast.success('Punch updated successfully');
      setEditModal({ open: false, punch: null });
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update punch');
    }
  };

  const handleDeletePunch = async () => {
    if (!deleteReason.trim()) {
      toast.error('Delete reason is required');
      return;
    }

    try {
      await punchService.deletePunch(deleteModal.punch.id, deleteReason);
      toast.success('Punch deleted successfully');
      setDeleteModal({ open: false, punch: null });
      setDeleteReason('');
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete punch');
    }
  };

  const openEditModal = (punch) => {
    const localTime = new Date(punch.time);
    const formattedTime = localTime.toISOString().slice(0, 16);
    setEditForm({ punchTime: formattedTime, punchType: punch.type, editReason: '' });
    setEditModal({ open: true, punch });
  };

  const openDeleteModal = (punch) => {
    setDeleteReason('');
    setDeleteModal({ open: true, punch });
  };

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">
            {dashboard?.currentTime?.local?.split(' ')[0]} • {dashboard?.currentTime?.timezone}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={refresh}
          className="self-start"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              dashboard?.status === 'WORKING' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Clock className={`w-8 h-8 ${
                dashboard?.status === 'WORKING' ? 'text-green-600' : 'text-gray-400'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`status-indicator ${
                  dashboard?.status === 'WORKING' ? 'status-working' : 'status-not-working'
                }`}></span>
                <span className="text-lg font-semibold text-gray-900">
                  {dashboard?.status === 'WORKING' ? 'Currently Working' : 'Not Working'}
                </span>
              </div>
              {dashboard?.lastPunch && (
                <p className="text-gray-500 mt-1">
                  Last punch: {dashboard.lastPunch.type} at {dashboard.lastPunch.timeLocal}
                  <Badge variant="info" className="ml-2">{dashboard.lastPunch.source}</Badge>
                </p>
              )}
            </div>
          </div>

          <Button
            variant={dashboard?.nextPunchType === 'IN' ? 'success' : 'danger'}
            size="lg"
            onClick={handlePunch}
            loading={punching}
            className="punch-button-pulse"
          >
            Punch {dashboard?.nextPunchType || 'IN'}
          </Button>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Worked */}
        <Card className="p-5" hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Worked</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dashboard?.todayStats?.totalWorkedFormatted || '0h 0m'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Remaining */}
        <Card className="p-5" hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dashboard?.todayStats?.remainingFormatted || '8h 0m'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        {/* Daily Target */}
        <Card className="p-5" hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Daily Target</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dashboard?.todayStats?.dailyTargetFormatted || '8h 0m'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        {/* Predicted Exit */}
        <Card className="p-5" hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Predicted Exit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dashboard?.predictedExit?.timeLocal || '--:--'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Today's Progress</h3>
          <Badge variant={dashboard?.todayStats?.isTargetMet ? 'success' : 'info'}>
            {dashboard?.todayStats?.progressPercent || 0}%
          </Badge>
        </div>
        <ProgressBar 
          value={dashboard?.todayStats?.progressPercent || 0} 
          max={100}
          className="h-3"
        />
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <span>{dashboard?.todayStats?.totalWorkedFormatted || '0h'}</span>
          <span>{dashboard?.todayStats?.dailyTargetFormatted || '8h'}</span>
        </div>
      </Card>

      {/* Today's Punches */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Today's Punches</h3>
        
        {dashboard?.todayPunches?.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No punches recorded today</p>
        ) : (
          <div className="space-y-3">
            {dashboard?.todayPunches?.map((punch, index) => (
              <div
                key={punch.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    punch.type === 'IN' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-sm font-bold ${
                      punch.type === 'IN' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {punch.type}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{punch.timeLocal}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="info">{punch.source}</Badge>
                      {punch.edited && (
                        <Badge variant="warning">Edited</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(punch)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteModal(punch)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, punch: null })}
        title="Edit Punch"
      >
        <div className="space-y-4">
          <Select
            label="Punch Type"
            value={editForm.punchType}
            onChange={(e) => setEditForm({ ...editForm, punchType: e.target.value })}
            options={[
              { value: 'IN', label: 'Punch IN' },
              { value: 'OUT', label: 'Punch OUT' }
            ]}
          />
          <Input
            label="Punch Time"
            type="datetime-local"
            value={editForm.punchTime}
            onChange={(e) => setEditForm({ ...editForm, punchTime: e.target.value })}
          />
          <Input
            label="Edit Reason"
            value={editForm.editReason}
            onChange={(e) => setEditForm({ ...editForm, editReason: e.target.value })}
            placeholder="Why are you editing this punch?"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setEditModal({ open: false, punch: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleEditPunch}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, punch: null })}
        title="Delete Punch"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-red-800">
              Are you sure you want to delete this punch?
            </p>
            <p className="text-sm text-red-600 mt-1">
              {deleteModal.punch?.type} at {deleteModal.punch?.timeLocal}
            </p>
          </div>
          <Input
            label="Delete Reason"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Why are you deleting this punch?"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setDeleteModal({ open: false, punch: null })}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeletePunch}>
              Delete Punch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardPage;
