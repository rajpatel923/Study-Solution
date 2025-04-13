"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { AiFillGithub } from "react-icons/ai";
import { useAuth } from "@/context/AuthContext";

// Define the provider configuration in one place
const authProviders = [
  {
    id: "google",
    name: "Google",
    icon: FcGoogle,
    className: "text-white",
  },
  {
    id: "apple",
    name: "Apple",
    icon: FaApple,
    className: "text-white",
  },
  {
    id: "github",
    name: "Github",
    icon: AiFillGithub,
    className: "text-white",
  }
];

export default function SocialAuthButtons() {
  const { socialLogin, isLoading } = useAuth();

  const handleSocialLogin = (provider: string) => {
    if (!isLoading) {
      socialLogin(provider);
    }
  };

  return (
    <div className="space-y-3 w-full mb-6">
      {authProviders.map((provider) => {
        const Icon = provider.icon;
        return (
          <Button
            key={provider.id}
            onClick={() => handleSocialLogin(provider.id)}
            variant="outline"
            disabled={isLoading}
            className={`w-full rounded-full py-6 bg-transparent border-textGray border-2 transition-all duration-200 font-medium hover:bg-opacity-10 hover:bg-white ${provider.className}`}
          >
            <div className="flex items-center justify-center">
              <Icon className="mr-3 text-xl" />
              <span>Continue with {provider.name}</span>
            </div>
          </Button>
        );
      })}
      
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[#1E1E1E] text-gray-400">or</span>
        </div>
      </div>
    </div>
  );
}