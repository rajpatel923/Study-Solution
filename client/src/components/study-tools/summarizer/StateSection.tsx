"use client";

import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!sectionRef.current || !statsRef.current) return;
    
    // Animate section entrance
    gsap.from(sectionRef.current, {
      opacity: 0,
      y: 30,
      duration: 0.8,
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 80%",
        toggleActions: "play none none none"
      }
    });
    
    // Animate stat counters
    const statElements = statsRef.current.querySelectorAll('.stat-value');
    
    statElements.forEach((element) => {
      const target = element as HTMLElement;
      
      gsap.from(target, {
        innerText: 0,
        duration: 2,
        snap: { innerText: 1 },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
        },
        onUpdate: () => {
          // Format with commas
          target.textContent = parseInt(target.innerText).toLocaleString() + "+";
        }
      });
    });
  }, []);
  
  return (
    <div ref={sectionRef} className="mt-16 py-8 border-t border-border">
      <div ref={statsRef} className="flex flex-wrap justify-center gap-8 md:gap-16">
        <div className="text-center">
          <div className="stat-value text-3xl md:text-4xl font-bold text-primary mb-2" data-value="3000000">3,000,000+</div>
          <p className="text-muted-foreground">students & teachers</p>
        </div>
        
        <div className="text-center">
          <div className="stat-value text-3xl md:text-4xl font-bold text-teal-400 mb-2" data-value="2000000">2,000,000+</div>
          <p className="text-muted-foreground">notes created</p>
        </div>
        
        <div className="text-center">
          <div className="stat-value text-3xl md:text-4xl font-bold text-purple-400 mb-2" data-value="320000000">320,000,000+</div>
          <p className="text-muted-foreground">flashcards created</p>
        </div>
      </div>
    </div>
  );
}