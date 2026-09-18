import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthSession, AdminProfile, UserRole } from '../types.js';
import { getSavedAuthSession, saveAuthSession, clearAuthSession } from '../utils/authUtils.js';

interface AuthContextType {
  session: AuthSession | null;
  adminProfile: AdminProfile | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isTreasurer: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: UserRole;
  token: string | null;
  login: (identifier: string, pass: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  firstTimeSetup: (data: {
    name: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword?: string;
    messName: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AdminProfile>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPass: string, newPass: string, confirmPass?: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (identifier: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; initialAdminProfile?: AdminProfile }> = ({
  children,
  initialAdminProfile,
}) => {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const saved = getSavedAuthSession();
    if (saved) return saved;
    // Default initial session as Admin Rahim for smooth testing
    return {
      token: 'tok_default_admin',
      userId: 'm1',
      role: 'admin',
      name: 'Rahim Uddin (Admin)',
      phone: '01711234567',
      email: 'rahim.mess@gmail.com',
      avatarColor: 'bg-emerald-600',
      loginTime: new Date().toISOString(),
    };
  });

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(initialAdminProfile || {
    id: 'admin_m1',
    name: 'Rahim Uddin',
    phone: '01711234567',
    email: 'rahim.mess@gmail.com',
    messName: 'শান্তিনগর মেস (Shantinagar Mess)',
    role: 'admin',
    status: 'active',
    createdDate: '2026-01-01',
    lastLogin: '2026-09-18T08:00:00.000Z',
  });

  const fetchAuthMe = useCallback(async (tokenStr?: string) => {
    try {
      const activeToken = tokenStr || session?.token;
      const res = await fetch('/api/auth/me', {
        headers: {
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          'x-user-id': session?.userId || 'm1',
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.adminProfile) {
          setAdminProfile(json.adminProfile);
        }
      }
    } catch (e) {
      // Offline fallback
    }
  }, [session?.token, session?.userId]);

  useEffect(() => {
    fetchAuthMe();
  }, [fetchAuthMe]);

  const login = async (identifier: string, pass: string, remember: boolean = true) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass, rememberMe: remember }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'লগইন ব্যর্থ হয়েছে' };
      }

      const newSession: AuthSession = data.user;
      newSession.token = data.token;
      setSession(newSession);
      if (remember) {
        saveAuthSession(newSession);
      }
      if (data.adminProfile) {
        setAdminProfile(data.adminProfile);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'সার্ভার সংযোগে সমস্যা হয়েছে: ' + err.message };
    }
  };

  const firstTimeSetup = async (setupData: {
    name: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword?: string;
    messName: string;
  }) => {
    try {
      const res = await fetch('/api/auth/first-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'এডমিন সেটআপ ব্যর্থ হয়েছে' };
      }
      const newSession: AuthSession = data.user;
      newSession.token = data.token;
      setSession(newSession);
      saveAuthSession(newSession);
      if (data.adminProfile) {
        setAdminProfile(data.adminProfile);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      if (session?.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.token}`,
            'x-user-id': session.userId,
          },
        });
      }
    } catch {}
    clearAuthSession();
    // Revert to member guest state or keep session null
    setSession({
      token: 'guest_' + Date.now(),
      userId: 'm3',
      role: 'member',
      name: 'Hasan Mahmud',
      phone: '+8801913456789',
      avatarColor: 'bg-indigo-600',
      loginTime: new Date().toISOString(),
    });
  };

  const updateProfile = async (data: Partial<AdminProfile>) => {
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
          'x-user-id': session?.userId || 'm1',
        },
        body: JSON.stringify(data),
      });
      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        return { success: false, error: resJson.error || 'প্রোফাইল আপডেট ব্যর্থ হয়েছে' };
      }
      if (resJson.adminProfile) {
        setAdminProfile(resJson.adminProfile);
        // Also update current session display name
        if (session && session.role === 'admin') {
          const updatedSession = { ...session, name: resJson.adminProfile.name, phone: resJson.adminProfile.phone };
          setSession(updatedSession);
          saveAuthSession(updatedSession);
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword?: string) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
          'x-user-id': session?.userId || 'm1',
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const forgotPassword = async (identifier: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const json = await res.json();
      return { success: true, message: json.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const isAdmin = session?.role === 'admin';
  const isTreasurer = session?.role === 'treasurer';
  const isLoggedIn = !!session?.token;

  return (
    <AuthContext.Provider
      value={{
        session,
        adminProfile,
        isLoggedIn,
        isAdmin,
        isTreasurer,
        currentUserId: session?.userId || 'm1',
        currentUserName: session?.name || 'Mess Member',
        currentUserRole: session?.role || 'member',
        token: session?.token || null,
        login,
        firstTimeSetup,
        logout,
        updateProfile,
        changePassword,
        forgotPassword,
        refreshAuth: fetchAuthMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
