"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>("Processing authentication...");
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Check for error parameter
        const errorParam = searchParams.get("error");
        if (errorParam) {
          setError(`Authentication failed: ${errorParam}`);
          setTimeout(() => router.push("/auth"), 2000);
          return;
        }

        // Look for token in URL
        const token = searchParams.get("token");

        if (token) {
          // Token is already in URL, we can check authentication status
          setStatus("Authentication successful! Redirecting...");
          
          // Give a moment for authentication to register
          setTimeout(() => {
            if (isAuthenticated) {
              router.push("/dashboard");
            } else {
              // If auth state hasn't updated yet, check with the API
              fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/api/v1/auth/me`, {
                credentials: 'include',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
              .then(response => {
                if (response.ok) {
                  router.push("/dashboard");
                } else {
                  throw new Error("Invalid session");
                }
              })
              .catch(err => {
                setError("Failed to validate session. Please try logging in again.");
                setTimeout(() => router.push("/auth"), 2000);
              });
            }
          }, 1000);
        } else {
          // No token in URL, check if we're already authenticated
          if (isAuthenticated) {
            setStatus("Already authenticated. Redirecting...");
            setTimeout(() => router.push("/dashboard"), 1000);
          } else {
            // Try to check authentication status with backend
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/api/v1/auth/me`,
              { credentials: 'include' }
            );

            if (response.ok) {
              setStatus("Authentication successful! Redirecting...");
              setTimeout(() => router.push("/dashboard"), 1000);
            } else {
              setError("Authentication failed. Please try logging in again.");
              setTimeout(() => router.push("/auth"), 2000);
            }
          }
        }
      } catch (err) {
        console.error("OAuth callback error:", err);
        setError("An unexpected error occurred. Please try logging in again.");
        setTimeout(() => router.push("/auth"), 2000);
      }
    };

    processOAuthCallback();
  }, [searchParams, router, isAuthenticated]);

  return (
    <div className="min-h-screen bg-[#1E1E1E] flex flex-col items-center justify-center p-4">
      <div className="bg-[#292929] rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          {!error ? (
            <div className="w-16 h-16 border-t-4 border-b-4 border-[#00D1C0] rounded-full animate-spin mx-auto"></div>
          ) : (
            <div className="w-16 h-16 bg-red-500 rounded-full text-white flex items-center justify-center mx-auto">
              <span className="text-2xl">×</span>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          {error ? "Authentication Error" : "Authentication in Progress"}
        </h1>
        
        <p className="text-gray-300 mb-4">
          {error || status}
        </p>

        {error && (
          <button
            onClick={() => router.push("/auth")}
            className="mt-4 bg-[#00D1C0] text-white py-2 px-6 rounded-full hover:bg-opacity-90 transition-all"
          >
            Return to Login
          </button>
        )}
      </div>
    </div>
  );
}