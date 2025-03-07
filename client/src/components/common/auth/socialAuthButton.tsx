"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { BsFillPeopleFill } from "react-icons/bs";
import { SiClevercloud } from "react-icons/si";

// Define the provider configuration in one place
const authProviders = [
  {
    id: "google",
    name: "Google",
    icon: FcGoogle,
    className: "text-white"
  },
  {
    id: "clever",
    name: "Clever",
    icon: SiClevercloud,
    className: "text-white"
  },
  {
    id: "classlink",
    name: "ClassLink",
    icon: BsFillPeopleFill,
    className: "text-white"
  },
  {
    id: "apple",
    name: "Apple",
    icon: FaApple,
    className: "text-white"
  }
];

export default function SocialAuthButtons() {
  const handleSocialLogin = (provider: string) => {
    // Mock or implement your social login logic
    alert(`Continue with ${provider}`);
  };

  return (
    <div className="space-y-3 w-full mb-6 ">
      
      {authProviders.map((provider) => {
        const Icon = provider.icon;
        return (
          <Button
            key={provider.id}
            onClick={() => handleSocialLogin(provider.name)}
            variant="outline"
            className={` w-full rounded-full py-6 bg-transparent border-textGray border-2 transition-all duration-200 font-medium ${provider.className}`}
          >
            <div className="flex items-center justify-center">
              <Icon  className="mr-3 text-xl " />
              <span>{provider.name}</span>
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