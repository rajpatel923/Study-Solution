"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { gsap } from 'gsap';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Search documents...'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (searchRef.current) {
      gsap.fromTo(
        searchRef.current,
        { width: '60%', opacity: 0 },
        { width: '100%', opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
    if (searchRef.current) {
      gsap.to(
        searchRef.current,
        { boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.2)', duration: 0.3 }
      );
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (searchRef.current) {
      gsap.to(
        searchRef.current,
        { boxShadow: '0 0 0 0px rgba(99, 102, 241, 0)', duration: 0.3 }
      );
    }
  };

  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div 
      ref={searchRef}
      className={`relative bg-white rounded-lg border ${
        isFocused ? 'border-indigo-300' : 'border-gray-200'
      } transition-all`}
    >
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={18} className="text-gray-400" />
      </div>
      <input
        ref={inputRef}
        type="text"
        className="w-full pl-10 pr-10 py-2 rounded-lg focus:outline-none text-gray-700"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {value && (
        <button
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          onClick={handleClear}
        >
          <X size={16} className="text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
