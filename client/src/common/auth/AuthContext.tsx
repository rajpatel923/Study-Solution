'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id?: string;
  username: string;
  email?: string;
  name?: string;
  accountType?: string;
  birthday?: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  name: string;
  birthday: string;
  accountType: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8091";

  useEffect(() => {
    // Check if user is authenticated on initial load
    const checkAuthStatus = async () => {
      try {
        // Try to get the current user from the token
        const response = await fetch(`${API_URL}/api/v1/auth/me`, {
          credentials: 'include', // Include cookies
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // If getting user data fails, try to refresh token
          const refreshed = await refreshTokens();
          
          if (!refreshed) {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Important to include cookies
      });

      if (response.ok) {
        // Get user data from the me endpoint
        const meResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
          credentials: 'include',
        });
        
        if (meResponse.ok) {
          const userData = await meResponse.json();
          setUser(userData);
          setIsAuthenticated(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (response.ok) {
        // After successful registration, get user data
        const meResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
          credentials: 'include',
        });
        
        if (meResponse.ok) {
          const userData = await meResponse.json();
          setUser(userData);
          setIsAuthenticated(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const refreshTokens = async (): Promise<boolean> => {
    try {
      // Refresh tokens - this will use the httpOnly refresh token cookie
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // If refresh successful, get user data
        const meResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
          credentials: 'include',
        });
        
        if (meResponse.ok) {
          const userData = await meResponse.json();
          setUser(userData);
          setIsAuthenticated(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user data regardless of API response
      setUser(null);
      setIsAuthenticated(false);
      // Redirect to home/login page
      router.push('/');
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    refreshTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};