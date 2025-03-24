"use client";

import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";

export default function KaiMascot() {
  const mascotRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    const mascot = mascotRef.current;
    if (!mascot) return;
    
    // Initial entrance animation
    gsap.from(mascot, {
      y: 20,
      opacity: 0,
      duration: 0.5,
      ease: "back.out(1.2)",
    });
    
    // Floating animation
    gsap.to(mascot, {
      y: -5,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    
    // Random blinking
    const blink = () => {
      const eyes = mascot.querySelectorAll('.kai-eye');
      gsap.to(eyes, {
        scaleY: 0.1,
        duration: 0.1,
        onComplete: () => {
          gsap.to(eyes, {
            scaleY: 1,
            duration: 0.1
          });
        }
      });
      
      // Schedule next blink
      gsap.delayedCall(Math.random() * 3 + 2, blink);
    };
    
    // Start blinking after a short delay
    gsap.delayedCall(1, blink);
    
    // Occasional tail wiggle
    const wiggleTail = () => {
      const tail = mascot.querySelector('.kai-tail');
      if (tail) {
        gsap.to(tail, {
          rotation: 15,
          transformOrigin: "top",
          duration: 0.3,
          yoyo: true,
          repeat: 3,
          ease: "power1.inOut"
        });
      }
      
      // Schedule next wiggle
      gsap.delayedCall(Math.random() * 5 + 3, wiggleTail);
    };
    
    // Start tail wiggle
    wiggleTail();
    
    return () => {
      // Clean up animations
      gsap.killTweensOf(mascot);
    };
  }, []);
  
  return (
    <svg
      ref={mascotRef}
      width="100"
      height="120"
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="translate-y-6"
    >
      {/* Tail */}
      <path
        className="kai-tail"
        d="M30 80C20 85 15 95 25 100C35 105 40 95 30 80Z"
        fill="#F6E05E"
        stroke="#2D3748"
        strokeWidth="2"
      />
      
      {/* Body */}
      <ellipse
        cx="50"
        cy="70"
        rx="30"
        ry="35"
        fill="#4FD1C5"
        stroke="#2D3748"
        strokeWidth="2"
      />
      
      {/* Belly */}
      <ellipse
        cx="50"
        cy="75"
        rx="20"
        ry="25"
        fill="#F6E05E"
        stroke="#2D3748"
        strokeWidth="1"
      />
      
      {/* Wings */}
      <path
        d="M75 60C85 55 90 65 85 70C80 75 70 70 75 60Z"
        fill="#F6E05E"
        stroke="#2D3748"
        strokeWidth="2"
      />
      <path
        d="M25 60C15 55 10 65 15 70C20 75 30 70 25 60Z"
        fill="#F6E05E"
        stroke="#2D3748"
        strokeWidth="2"
      />
      
      {/* Eyes */}
      <ellipse className="kai-eye" cx="40" cy="55" rx="5" ry="7" fill="white" />
      <ellipse className="kai-eye" cx="60" cy="55" rx="5" ry="7" fill="white" />
      <circle cx="40" cy="53" r="2" fill="#2D3748" />
      <circle cx="60" cy="53" r="2" fill="#2D3748" />
      
      {/* Mouth */}
      <path
        d="M40 70C45 75 55 75 60 70"
        stroke="#2D3748"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Teeth */}
      <path
        d="M46 70L44 75M54 70L56 75"
        stroke="#2D3748"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}