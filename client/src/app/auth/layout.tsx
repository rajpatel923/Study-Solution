"use client";

import { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col md:flex-row fixed w-full">
      {/* Left: Dark Form Section */}
      <div className="bg-[#1E1E1E] text-white w-full md:w-1/2 overflow-y-auto max-h-screen">
        <div className="flex justify-center items-center p-8 md:p-16">
          <div className="w-full h-full">
            {children}
          </div>
        </div>
      </div>
      {/* Right: Preview / Marketing Section */}
      <div className="hidden  md:flex w-1/2 bg-gradient-to-b from-[#2c3e50] to-[#3498db] items-center justify-center relative">
        <div className="text-white text-center">
          <h2 className="text-xl font-semibold mb-2">Knowts Quiz & Spaced Repetition</h2>
          <p className="max-w-sm mx-auto">
            Im going to Columbia now and Knowt helped me get there 
            <br /> – Victoria Burride Sermon, College freshman
          </p>
          <div className="mt-4">
            <Image
              src="/images/SS_groupimage.png"
              alt="Preview"
              className="mx-auto rounded-md shadow-md"
              width={400}
              height={400}
            />
          </div>
        </div>
      </div>
    </main>
  );
}