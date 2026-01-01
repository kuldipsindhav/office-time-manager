import React, { useState, useEffect } from 'react';
import { Clock, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, Badge, Input, LoadingSpinner } from '../ui';
import { punchService } from '../../services';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export const HistoryPage = () => {
  const { user } = useAuthStore();
  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      const response = await punchService.getHistory({
        page,
        limit: 20,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      });
      setPunches(response.data.punches);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load punch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFilter = () => {
    fetchHistory(1);
  };

  const handleClearFilters = () => {
    setFilters({ startDate: '', endDate: '' });
    setTimeout(() => fetchHistory(1), 0);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchHistory(newPage);
    }
  };

  // Group punches by date
  const groupedPunches = punches.reduce((groups, punch) => {
    const date = punch.timeLocal.split(' ')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(punch);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Punch History</h1>
        <p className="text-gray-500">View and filter your attendance records</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <Input
            label="Start Date"
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="flex-1"
          />
          <Input
            label="End Date"
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button onClick={handleFilter}>
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="secondary" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* History List */}
      <Card className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : punches.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-300 mx-auto" />
            <p className="text-gray-500 mt-4">No punch records found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPunches).map(([date, dayPunches]) => (
              <div key={date}>
                <h3 className="font-semibold text-gray-900 mb-3 sticky top-0 bg-white py-2">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <div className="space-y-2">
                  {dayPunches.map((punch) => (
                    <div
                      key={punch.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          punch.type === 'IN' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <span className={`font-bold ${
                            punch.type === 'IN' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {punch.type}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {punch.timeLocal.split(' ').slice(1).join(' ')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="info">{punch.source}</Badge>
                            {punch.edited && (
                              <Badge variant="warning">
                                Edited {punch.editedBy && `by ${punch.editedBy}`}
                              </Badge>
                            )}
                          </div>
                          {punch.editReason && (
                            <p className="text-sm text-gray-500 mt-1">
                              Reason: {punch.editReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-gray-500">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} records)
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
    </div>
  );
};

export default HistoryPage;
