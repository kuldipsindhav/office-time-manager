import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/password', { currentPassword, newPassword });
    return response.data;
  }
};

export const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUser: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  updateUser: async (userId, data) => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  }
};

export const dashboardService = {
  getDashboard: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  getWeekly: async (weekOffset = 0) => {
    const response = await api.get('/dashboard/weekly', { params: { weekOffset } });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getUserDashboard: async (userId) => {
    const response = await api.get(`/users/${userId}/dashboard`);
    return response.data;
  }
};

export const punchService = {
  punch: async (source = 'Manual', nfcUID = null) => {
    const response = await api.post('/punch', { source, nfcUID });
    return response.data;
  },

  punchNfc: async (nfcUID) => {
    const response = await api.post('/punch/nfc', { nfcUID });
    return response.data;
  },

  createManualPunch: async (data) => {
    const response = await api.post('/punch/manual', data);
    return response.data;
  },

  editPunch: async (punchId, data) => {
    const response = await api.put(`/punch/${punchId}`, data);
    return response.data;
  },

  deletePunch: async (punchId, reason) => {
    const response = await api.delete(`/punch/${punchId}`, { data: { reason } });
    return response.data;
  },

  getHistory: async (params = {}) => {
    const response = await api.get('/punch/history', { params });
    return response.data;
  },

  getUserHistory: async (userId, params = {}) => {
    const response = await api.get(`/punch/history/${userId}`, { params });
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/punch/status');
    return response.data;
  }
};

export const nfcService = {
  registerTag: async (data) => {
    const response = await api.post('/nfc/register', data);
    return response.data;
  },

  validateTag: async (uid) => {
    const response = await api.post('/nfc/validate', { uid });
    return response.data;
  },

  quickPunch: async (uid) => {
    const response = await api.post('/nfc/punch', { uid });
    return response.data;
  },

  punchWithNfc: async (uid) => {
    const response = await api.post('/nfc/punch', { uid });
    return response.data;
  },

  getMyTags: async () => {
    const response = await api.get('/nfc/my-tags');
    return response.data;
  },

  getAllTags: async (params = {}) => {
    const response = await api.get('/nfc/tags', { params });
    return response.data;
  },

  getUserTags: async (userId) => {
    const response = await api.get(`/nfc/user/${userId}`);
    return response.data;
  },

  deactivateTag: async (tagId, reason) => {
    const response = await api.put(`/nfc/${tagId}/deactivate`, { reason });
    return response.data;
  },

  reactivateTag: async (tagId) => {
    const response = await api.put(`/nfc/${tagId}/reactivate`);
    return response.data;
  }
};

export const adminService = {
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  }
};
