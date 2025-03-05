"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#explore", label: "Explore" },
  { href: "#exam", label: "Exam" },
];

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed w-full top-0 left-0 bg-white shadow-md z-50">
      <nav className="container mx-auto flex items-center justify-between p-4">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold">
          Study Sync
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-6">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-blue-600">
              {label}
            </Link>
          ))}
        </div>

        {/* Search & Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="border rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              aria-label="Search"
            />
            <Search className="absolute right-3 top-2.5 text-gray-500" size={18} />
          </div>
          <Button variant="outline">Login</Button>
          <Button>Get Started</Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-md p-4 space-y-2">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="block">
              {label}
            </Link>
          ))}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="border rounded-lg px-3 py-1 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
              aria-label="Search"
            />
            <Search className="absolute right-3 top-2.5 text-gray-500" size={18} />
          </div>
          <Button className="w-full mt-2">Login</Button>
          <Button className="w-full mt-2">Get Started</Button>
        </div>
      )}
    </header>
  );
}
