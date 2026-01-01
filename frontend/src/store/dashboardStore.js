import { create } from 'zustand';

export const useDashboardStore = create((set) => ({
  dashboard: null,
  loading: false,
  error: null,
  lastUpdated: null,

  setDashboard: (dashboard) => set({ 
    dashboard, 
    lastUpdated: new Date(),
    error: null 
  }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  reset: () => set({
    dashboard: null,
    loading: false,
    error: null,
    lastUpdated: null
  })
}));
