"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";

import Input from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Select from "@/components/ui/select";
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
  
  // Get the view based on URL query parameter if needed
  // This allows direct links to login or signup
  // useEffect(() => {
  //   const searchParams = new URLSearchParams(window.location.search);
  //   const view = searchParams.get('view');
  //   if (view === 'signup') setAuthMode('signup');
  //   if (view === 'login') setAuthMode('login');
  // }, []);

  // Login form
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Signup form
  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: signupErrors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onLoginSubmit: SubmitHandler<LoginFormData> = async (data) => {
    try {
        const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8091";
        
        const response = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include", // 👈 Send cookies (if using sessions/authentication)
        });
    
        if (!response.ok) {
          const errorData = await response.json();
          alert(errorData.message || "Login failed");
          return;
        }
    
        router.push("/");
      } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred. Please try again.");
      }
  };

  const onSignupSubmit: SubmitHandler<SignupFormData> = async (data) => {
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        alert("Sign up failed");
        return;
      }
      router.push("/dashboard");
    } catch {
      alert("An error occurred. Please try again.");
    }
  };

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
            {/* <Input
              label="Email"
              type="email"
              registration={registerLogin("email")}
              error={loginErrors.email?.message}
              placeholder="Enter your email"
            /> */}
            <Input
              label="Username"
              registration={registerLogin("username")}
              error={signupErrors.username?.message}
              placeholder="Enter your username"
            />

            <Input
              label="Password"
              type="password"
              registration={registerLogin("password")}
              error={loginErrors.password?.message}
              placeholder="Enter your password"
              className=""
            />
            <div className="text-right">
                <a href="#" className="text-white hover:text-white text-xs">
                Forgot password? Reset it
                </a>
            </div>

            <Button type="submit" className="w-full mt-4 bg-primaryCustome rounded-full hover:bg-primaryHover font-bold py-2">
              Login
            </Button>
          </form>

          

          <div className="mt-4 text-center">
            <span className="text-white">Dont have an account?</span>{" "}
            <button
              onClick={() => setAuthMode("signup")}
              className="text-yellow-300 hover:underline"
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
            />

            {/* Name */}
            <Input
              label="What's your name?"
              registration={registerSignup("name")}
              error={signupErrors.name?.message}
              placeholder="Full name"
            />

            {/* Username */}
            <Input
              label="Username"
              registration={registerSignup("username")}
              error={signupErrors.username?.message}
              placeholder="Create a username"
            />

            {/* Email */}
            <Input
              label="Email"
              type="email"
              registration={registerSignup("email")}
              error={signupErrors.email?.message}
              placeholder="Enter your email"
            />

            {/* Password */}
            <Input
              label="Password"
              type="password"
              registration={registerSignup("password")}
              error={signupErrors.password?.message}
              placeholder="Enter your password"
            />

            <Button type="submit" className="w-full mt-4 bg-primaryCustome rounded-full hover:bg-primaryHover font-bold py-2">
              Sign Up
            </Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-gray-400">Already have an account?</span>{" "}
            <button
              onClick={() => setAuthMode("login")}
              className="text-[#00D1C0] hover:underline "
            >
              Sign in
            </button>
          </div>
        </>
      )}
    </>
  );
}