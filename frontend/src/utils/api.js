import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = response.data.data.tokens;
        
        localStorage.setItem('accessToken', accessToken);
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// ===== Auth API =====
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/me'),
};

// ===== Certificates API =====
export const certificatesAPI = {
  getAll: (params) => api.get('/certificates', { params }),
  getOne: (id) => api.get(`/certificates/${id}`),
  create: (data) => api.post('/certificates', data),
  revoke: (id, data) => api.put(`/certificates/${id}/revoke`, data),
  export: (id) => api.get(`/certificates/${id}/export`),
  getStats: () => api.get('/certificates/stats'),
  verify: (token) => api.get(`/verify/${token}`),
};

// ===== Users API =====
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  assignRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  toggleStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }),
  delete: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats'),
};

// ===== Audit API =====
export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
  getSecurity: (params) => api.get('/audit/security', { params }),
};

// ===== System API =====
export const systemAPI = {
  health: () => api.get('/health', { baseURL: 'http://localhost:5000' }),
  rbacInfo: () => api.get('/rbac/info'),
};

export default api;
