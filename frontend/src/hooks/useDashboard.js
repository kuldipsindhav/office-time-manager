import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardService } from '../services';
import { useDashboardStore } from '../store/dashboardStore';

export const useDashboard = (autoRefresh = true, intervalMs = 30000) => {
  const { dashboard, loading, error, setDashboard, setLoading, setError } = useDashboardStore();
  const intervalRef = useRef(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getDashboard();
      setDashboard(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  }, [setDashboard, setLoading, setError]);

  useEffect(() => {
    fetchDashboard();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchDashboard, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchDashboard, autoRefresh, intervalMs]);

  return {
    dashboard,
    loading,
    error,
    refresh: fetchDashboard
  };
};
