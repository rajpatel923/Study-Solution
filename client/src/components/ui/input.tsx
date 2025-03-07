"use client";
import { FC } from "react";
import { UseFormRegisterReturn } from "react-hook-form";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  registration?: UseFormRegisterReturn;
  error?: string;
}

const Input: FC<InputProps> = ({ label, registration, error, ...props }) => {
  return (
    <div className="flex flex-col space-y-1">
      {label && <label className="text-gray-300 font-medium">{label}</label>}
      <input
        {...registration}
        {...props}
        className="w-full px-4 py-2 rounded-md border border-gray-700 bg-[#2A2A2A] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D1C0]"
      />
      {error && <span className="text-red-400 text-sm">{error}</span>}
    </div>
  );
};

export default Input;
