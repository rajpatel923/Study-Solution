"use client";
import { FC } from "react";
import { UseFormRegisterReturn } from "react-hook-form";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  registration?: UseFormRegisterReturn;
  error?: string;
  options: { value: string; label: string }[];
}

const Select: FC<SelectProps> = ({ label, registration, error, options, ...props }) => {
  return (
    <div className="flex flex-col space-y-1">
      {label && <label className="text-gray-300 font-medium">{label}</label>}
      <select
        {...registration}
        {...props}
        className="w-full px-4 py-2 rounded-md border border-gray-700 bg-[#2A2A2A] text-white focus:outline-none focus:ring-2 focus:ring-[#00D1C0]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-red-400 text-sm">{error}</span>}
    </div>
  );
};

export default Select;
