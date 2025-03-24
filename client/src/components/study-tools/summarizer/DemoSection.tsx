"use client";

import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DemoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    
    // Simple fade-in animation for the whole section
    gsap.fromTo(sectionRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
    );
    
    // If card and steps refs exist, animate them with a slight delay
    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.6, delay: 0.2, ease: "power2.out" }
      );
    }
    
    if (stepsRef.current) {
      const steps = stepsRef.current.querySelectorAll('.step-item');
      gsap.fromTo(steps,
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, stagger: 0.15, duration: 0.5, delay: 0.3, ease: "power2.out" }
      );
    }
  }, []);
  
  return (
    <div ref={sectionRef} className="py-12 mt-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-purple-600">How It Works</h2>
        <p className="text-gray-500">
          Transform any document into structured notes and flashcards in seconds
        </p>
      </div>
      
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Demo Card */}
        <div ref={cardRef} className="w-full lg:w-1/2 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-3 bg-gray-100 border-b">
            <div className="flex space-x-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <p className="text-sm text-gray-500">PDF to Notes Conversion</p>
          </div>
          
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-3 p-2 bg-gray-100 rounded-md">
                  <FileText className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="font-medium">Research Paper.pdf</h3>
                  <p className="text-sm text-gray-500">32 pages • 3.5 MB</p>
                </div>
              </div>
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs">
                Processed
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-2">Key Summary</h4>
                <p className="text-gray-600 text-sm">
                  This research paper investigates the effects of climate change on
                  marine ecosystems, specifically focusing on coral reef degradation in
                  the Pacific Ocean. The authors found that rising ocean temperatures
                  have led to a 45% reduction in coral coverage over the past decade.
                </p>
              </div>
              
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-2">Main Points</h4>
                <ul className="text-sm text-gray-600 space-y-2 pl-5 list-disc">
                  <li>Ocean temperatures have increased by 1.2°C since 1970</li>
                  <li>Coral bleaching events are occurring with 5x more frequency</li>
                  <li>Marine biodiversity has decreased by 30% in affected areas</li>
                  <li>Economic impact on local communities estimated at $4.3B annually</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Generated Flashcards (12)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-md p-3 bg-gray-50">
                  <p className="text-sm text-indigo-600 mb-1">Question</p>
                  <p className="text-sm">What is the primary cause of coral bleaching?</p>
                </div>
                <div className="border rounded-md p-3 bg-gray-50">
                  <p className="text-sm text-green-600 mb-1">Answer</p>
                  <p className="text-sm">Rising ocean temperatures that stress coral polyps.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Steps */}
        <div ref={stepsRef} className="w-full lg:w-1/2 space-y-6 pt-4">
          <div className="step-item flex items-start">
            <div className="flex-shrink-0 bg-purple-600 text-white h-8 w-8 rounded-full flex items-center justify-center mr-4">
              1
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Upload Your Document</h3>
              <p className="text-gray-600">
                Simply drag and drop your PDF, presentation, or paste a video URL. 
                We support a wide range of formats to fit your study materials.
              </p>
            </div>
          </div>
          
          <div className="step-item flex items-start">
            <div className="flex-shrink-0 bg-purple-600 text-white h-8 w-8 rounded-full flex items-center justify-center mr-4">
              2
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">AI Processing</h3>
              <p className="text-gray-600">
                Our advanced AI analyzes your content, identifies key concepts, important facts, 
                and extracts the most relevant information from your documents.
              </p>
            </div>
          </div>
          
          <div className="step-item flex items-start">
            <div className="flex-shrink-0 bg-purple-600 text-white h-8 w-8 rounded-full flex items-center justify-center mr-4">
              3
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Get Your Results</h3>
              <p className="text-gray-600">
                Within seconds, receive structured notes, concise summaries, and 
                ready-to-use flashcards that help you learn and retain information effectively.
              </p>
            </div>
          </div>
          
          <Button size="lg" className="mt-6 bg-gray-800 hover:bg-gray-700">
            <Upload className="mr-2 h-4 w-4" />
            Try It Now
          </Button>
        </div>
      </div>
    </div>
  );
}