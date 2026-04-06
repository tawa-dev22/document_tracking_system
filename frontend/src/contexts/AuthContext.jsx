import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAccessToken } from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationSummary, setNotificationSummary] = useState({ unreadCount: 0, types: [] });

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => console.warn('Sound playback blocked by browser policy.'));
    } catch (e) {
      console.error('Failed to play notification sound', e);
    }
  };

  const loadMe = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        try {
          const refreshed = await api.post('/auth/refresh');
          setAccessToken(refreshed.data.accessToken);
        } catch {
          setLoading(false);
          return;
        }
      }

      const [meRes, summaryRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/notifications/summary').catch(() => ({ data: { data: { unreadCount: 0, types: [] } } }))
      ]);

      setUser(meRes.data.user);
      setNotificationSummary(summaryRes.data.data);
      if (window.Notification && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      const accessToken = localStorage.getItem('accessToken');
      const socket = connectSocket(accessToken);
      
      socket?.on('notification:new', (payload) => {
        setNotificationSummary((prev) => ({ ...prev, unreadCount: prev.unreadCount + 1 }));
        playNotificationSound();
        if (Notification.permission === 'granted') {
          new Notification(payload.title || 'New Notification', { body: payload.message });
        }
      });

      socket?.on('notification:summary', (payload) => {
        setNotificationSummary((prev) => ({ ...prev, ...payload }));
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    return () => disconnectSocket();
  }, []);

  const login = async (payload) => {
    const res = await api.post('/auth/login', payload);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const socket = connectSocket(res.data.accessToken);
    socket?.on('notification:new', (p) => {
      setNotificationSummary((prev) => ({ ...prev, unreadCount: prev.unreadCount + 1 }));
      playNotificationSound();
      if (Notification.permission === 'granted') {
        new Notification(p.title || 'New Notification', { body: p.message });
      }
    });
    socket?.on('notification:summary', (summary) => setNotificationSummary((prev) => ({ ...prev, ...summary })));
    const summaryRes = await api.get('/notifications/summary').catch(() => ({ data: { data: { unreadCount: 0, types: [] } } }));
    setNotificationSummary(summaryRes.data.data);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore logout errors
    }
    setAccessToken('');
    disconnectSocket();
    setUser(null);
    setNotificationSummary({ unreadCount: 0, types: [] });
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      login,
      logout,
      loading,
      notificationSummary,
      setNotificationSummary,
      socket: getSocket()
    }),
    [user, loading, notificationSummary]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
