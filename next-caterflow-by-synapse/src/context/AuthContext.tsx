// src/context/AuthContext.tsx
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'siteManager' | 'stockController' | 'dispatchStaff' | 'auditor';
  associatedSite?: {
    _id: string;
    name: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSiteManager: boolean;
  isStockController: boolean;
  isDispatchStaff: boolean;
  isAuditor: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const authToken = Cookies.get('auth_token');
        if (authToken) {
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          });
          const userData = await response.json();

          if (response.ok) {
            setUser(userData);
          } else {
            // Token is invalid or expired, clear the cookie
            Cookies.remove('auth_token');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setUser(null);
      } finally {
        setIsAuthReady(true);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        // The cookie is set by the API route, no need to set it here
        router.push('/');
        return true;
      } else {
        console.error('Login failed:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    Cookies.remove('auth_token');
    Cookies.remove('user_role'); // Add this line
    setUser(null);
    router.push('/login');
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isSiteManager = user?.role === 'siteManager';
  const isStockController = user?.role === 'stockController';
  const isDispatchStaff = user?.role === 'dispatchStaff';
  const isAuditor = user?.role === 'auditor';

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated,
      isAdmin,
      isSiteManager,
      isStockController,
      isDispatchStaff,
      isAuditor,
      isAuthReady
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};