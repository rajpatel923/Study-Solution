"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Define user interface
export interface User {
  id: string | number;
  username: string;
  email: string;
  name?: string;
  roles?: string[];
  accountType?: string;
  oAuthProvider?: string | null;
  avatarUrl?: string | null;
}

// Define auth context interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  socialLogin: (provider: string) => void;
  clearError: () => void;
}

// Define registration data interface
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  name: string;
  birthday?: string;
  accountType?: string;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // API URL
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

  // Initialize authentication state on load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // Clear any stale data
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [API_URL]);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Login failed');
        setIsLoading(false);
        return false;
      }

      const userData = await response.json();
      
      // Call /me endpoint to get full user profile
      const profileResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUser(profileData);
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      } else {
        // Use token response data as fallback
        setUser({
          id: userData.id || 'unknown',
          username: username,
          email: userData.email || 'unknown',
        });
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
      return false;
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Registration failed');
        setIsLoading(false);
        return false;
      }

      // Registration successful, now login
      return await login(userData.username, userData.password);
    } catch (err) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
      return false;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setIsLoading(true);

    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      // Clear auth state regardless of response
      setUser(null);
      setIsAuthenticated(false);
      
      // Redirect to login page
      router.push('/auth');
    } catch (err) {
      console.error('Logout error:', err);
      // Clear auth state anyway
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Social login function
  const socialLogin = (provider: string) => {
    // The backend will handle the OAuth flow
    window.location.href = `${API_URL}/api/v1/auth/oauth2/authorize/${provider.toLowerCase()}`;
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Provide auth context
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        socialLogin,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}