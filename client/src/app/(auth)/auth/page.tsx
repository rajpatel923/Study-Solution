"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

import Input from "@/components/ui/customeInput";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import SocialAuthButtons from "@/components/common/auth/socialAuthButton";

// Login schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Signup schema
const signupSchema = z.object({
  birthday: z.string().nonempty("Please pick your date of birth."),
  accountType: z.string().nonempty("Please choose an account type."),
  name: z.string().nonempty("Name is required."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Use our auth context
  const { login, register: authRegister, isAuthenticated, isLoading, error } = useAuth();
  
  // Initialize both forms regardless of which one is displayed
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: signupErrors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });
  
  // Set auth error from context
  useEffect(() => {
    if (error) {
      setAuthError(error);
    }
  }, [error]);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const onLoginSubmit: SubmitHandler<LoginFormData> = async (data) => {
    setAuthError(null);
    
    try {
      const success = await login(data.username, data.password);
      
      if (success) {
        router.push("/dashboard");
      } else {
        setAuthError("Login failed. Please check your credentials and try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setAuthError("An unexpected error occurred. Please try again.");
    }
  };

  const onSignupSubmit: SubmitHandler<SignupFormData> = async (data) => {
    setAuthError(null);
    
    try {
      const success = await authRegister({
        username: data.username,
        email: data.email,
        password: data.password,
        name: data.name,
        birthday: data.birthday,
        accountType: data.accountType
      });
      
      if (success) {
        router.push("/dashboard");
      } else {
        setAuthError("Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setAuthError("An unexpected error occurred. Please try again.");
    }
  };

  // If redirecting, show minimal loading UI
  if (isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-white text-xl">Redirecting to dashboard...</div>
      </div>
    );
  }

  return (
    <>
      {/* Top Nav (Login / Signup) */}
      <div className="flex justify-between mb-6">
        <span className="flex space-x-4 items-center text-center text-white text-2xl font-bold">
          <Image src="/images/logo.png" alt="Logo" width={32} height={32} />
          <span className="text-yellow-200">StudySync</span>
        </span>
        <div className="flex space-x-4 bg-darkLight items-center p-1 rounded-full">
          <Button 
            onClick={() => setAuthMode("login")}
            className={`rounded-full ${authMode === "login" ? "text-white" : " border-0 bg-transparent shadow-none hover:text-white hover:bg-transparent "}`}
          >
            Log In
          </Button>
          <Button
            onClick={() => setAuthMode("signup")}
            className={`rounded-full ${authMode === "signup" ? "text-white" : "border-0 bg-transparent shadow-none hover:text-white hover:bg-transparent"}`}
          >
            Sign Up
          </Button>
        </div>
      </div>

      {/* Error message display */}
      {authError && (
        <div className="bg-red-500 text-white p-3 rounded-md mb-4 text-center max-w-lg mx-auto">
          {authError}
        </div>
      )}

      {/* Login Form */}
      {authMode === "login" && (
        <>
          {/* Heading */}
          <h1 className="text-4xl font-bold mb-6 text-center">Hi there!</h1>
          <p className="text-textGray mb-8 text-center">Welcome to StudySync. The best all-in-one Captain for studying.</p>

          {/* Social Auth Buttons */}
          <div className="max-w-lg w-full mx-auto">
            <SocialAuthButtons />
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-4 mx-auto w-full max-w-lg">
            <Input
              label="Username"
              registration={registerLogin("username")}
              error={loginErrors.username?.message}
              placeholder="Enter your username"
              disabled={isLoading}
            />

            <Input
              label="Password"
              type="password"
              registration={registerLogin("password")}
              error={loginErrors.password?.message}
              placeholder="Enter your password"
              disabled={isLoading}
              className=""
            />
            <div className="text-right">
                <a href="#" className="text-white hover:text-white text-xs">
                Forgot password? Reset it
                </a>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-4 bg-primaryCustome rounded-full hover:bg-primaryHover font-bold py-2"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-white">Dont have an account?</span>{" "}
            <button
              onClick={() => setAuthMode("signup")}
              className="text-yellow-300 hover:underline"
              disabled={isLoading}
            >
              Sign up
            </button>
          </div>
        </>
      )}

      {/* Signup Form */}
      {authMode === "signup" && (
        <>
          {/* Heading */}
          <h1 className="text-3xl font-bold mb-1 text-center">Join the StudySync side.</h1>
          <p className="text-gray-400 mb-8 text-center">Become part of the best all-in-one Caption for studying.</p>

          {/* Social Auth Buttons */}
          <div className="max-w-lg w-full mx-auto">
            <SocialAuthButtons />
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmitSignup(onSignupSubmit)} className="space-y-4 mx-auto w-full max-w-lg ">
            {/* Birthday */}
            <Input
              label="Birthday"
              type="date"
              registration={registerSignup("birthday")}
              error={signupErrors.birthday?.message}
              disabled={isLoading}
            />

            {/* Account Type */}
            <Select
              label="Account Type"
              registration={registerSignup("accountType")}
              error={signupErrors.accountType?.message}
              options={[
                { value: "", label: "Select an option" },
                { value: "student", label: "Student" },
                { value: "teacher", label: "Teacher" },
                { value: "other", label: "Other" },
              ]}
              disabled={isLoading}
            />

            {/* Name */}
            <Input
              label="What's your name?"
              registration={registerSignup("name")}
              error={signupErrors.name?.message}
              placeholder="Full name"
              disabled={isLoading}
            />

            {/* Username */}
            <Input
              label="Username"
              registration={registerSignup("username")}
              error={signupErrors.username?.message}
              placeholder="Create a username"
              disabled={isLoading}
            />

            {/* Email */}
            <Input
              label="Email"
              type="email"
              registration={registerSignup("email")}
              error={signupErrors.email?.message}
              placeholder="Enter your email"
              disabled={isLoading}
            />

            {/* Password */}
            <Input
              label="Password"
              type="password"
              registration={registerSignup("password")}
              error={signupErrors.password?.message}
              placeholder="Enter your password"
              disabled={isLoading}
            />

            <Button 
              type="submit" 
              className="w-full mt-4 bg-primaryCustome rounded-full hover:bg-primaryHover font-bold py-2"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-gray-400">Already have an account?</span>{" "}
            <button
              onClick={() => setAuthMode("login")}
              className="text-[#00D1C0] hover:underline"
              disabled={isLoading}
            >
              Sign in
            </button>
          </div>
        </>
      )}
    </>
  );
}