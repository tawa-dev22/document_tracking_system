import axios from 'axios';
import { getCookie } from '../utils/cookies';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true
});

let accessToken = localStorage.getItem('accessToken') || '';
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || '';
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}


api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retry && !original?.url?.includes('/auth/login') && !original?.url?.includes('/auth/refresh')) {
      original._retry = true;
      refreshPromise ||= api.post('/auth/refresh').then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      }).finally(() => {
        refreshPromise = null;
      });

      try {
        const token = await refreshPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        setAccessToken('');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
