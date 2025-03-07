"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Search } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#explore", label: "Explore" },
  { href: "#exam", label: "Exams" },
];

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed w-full top-0 left-0 bg-dark z-50">
      <nav className="container mx-auto flex items-center justify-between px-navPaddingX py-navPaddingY">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image src="/images/logo.png" alt="Logo" width={48} height={48} />
        </Link>

        {/* Combined Nav Links and Search */}
        <div className="hidden md:flex items-center space-x-8">
          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-white text-lg font-medium hover:text-primaryCustome"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center bg-darkAccent rounded-md w-[400px] px-3 py-2">
            <Search className="text-textGray" size={18} />
            <input
              type="text"
              placeholder="Search for anything"
              className="bg-transparent text-white placeholder-textGray px-2 w-full focus:outline-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <Button variant="outline" className="rounded-md border-borderColor bg-transparent text-white px-buttonPaddingX py-buttonPaddingY font-normal ">
            Login
          </Button>
          <Button className="rounded-md bg-primaryCustome hover:bg-primaryHover text-white px-buttonPaddingX py-buttonPaddingY font-semibold">
            Get Started
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-dark p-4 space-y-4">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="block text-white text-lg">
              {label}
            </Link>
          ))}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-4 py-2 bg-darkAccent text-white rounded-md placeholder-textGray focus:ring-2 focus:ring-primaryCustome"
              aria-label="Search"
            />
          </div>
          <Button variant="outline" className="w-full mt-2 rounded-md border-borderColor text-white font-normal">
            Login
          </Button>
          <Button className="w-full mt-2 rounded-md bg-primaryCustome hover:bg-primaryHover text-white font-normal">
            Get Started
          </Button>
        </div>
      )}
    </header>
  );
}
