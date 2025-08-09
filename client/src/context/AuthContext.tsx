"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from "axios";
import {generateAccessTokenFromRefreshToken, getProfile} from "@/services/authService";

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  oAuthProvider: string | null;
  enabled: boolean;
  oAuthProviderId: string;
}

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


export interface RegisterData {
  username: string;
  email: string;
  password: string;
  name: string;
  birthday?: string;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8091';

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await getProfile()
        setUser(response.data);
        setIsAuthenticated(true);
      } catch{
        await tryRefreshToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);


  const tryRefreshToken = async () =>{
    try{
      const resp = await generateAccessTokenFromRefreshToken();
      console.log(resp.data);
      const res = await getProfile()
      console.log(res);
      setUser(res.data);
      setIsAuthenticated(true);
    }catch(err){
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      router.push('/');
    }
  }

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check login response status
      const response = await axios.post(
          `${API_URL}/api/v1/auth/login`,
          { username, password },
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            },
          }
      );

      // Verify login was successful
      if (response.status !== 200) {
        setError('Login failed');
        setIsLoading(false);
        return false;
      }

      // Fetch user profile
      const profileResponse = await axios.get(`${API_URL}/api/v1/auth/me`, {
        withCredentials: true,
      });

      if (profileResponse.status === 200) {
        setUser(profileResponse.data);
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      } else {
        setError('Failed to fetch profile info');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || 'Login failed';
        setError(errorMessage);
      } else {
        setError('An unexpected error occurred');
      }
      setIsLoading(false);
      return false;
    }
  };


  // Register function
  const register = async (userData: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {

      const response = await axios.post(`${API_URL}/api/v1/auth/register`, {
        withCredentials: true,
        headers:{
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (response.status !== 200) {
        const errorData = await response.data;
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

      await axios.post(`${API_URL}/api/v1/auth/logout`,{}, {
        withCredentials: true,
      })


      // Clear auth state regardless of response
      setUser(null);
      setIsAuthenticated(false);
      
      // Redirect to login pagepos
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