"use client";

import React, { useRef, useEffect } from "react";

// 1. Floating Geometric Shapes - Professional/Corporate
export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setCanvasDimensions();
    window.addEventListener("resize", setCanvasDimensions);

    const blobs: Blob[] = [];

    class Blob {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 300 + 200;
        this.speedX = (Math.random() - 0.5) * 0.1;
        this.speedY = (Math.random() - 0.5) * 0.1;

        // Very subtle colors that work with white background
        const colors = [
          "rgba(73,148,255,0.3)", // Very light blue
          "rgba(199,255,79,0.3)", // Very light green
          "rgba(255,110,110,0.3)", // Very light red
          "rgba(250, 245, 255, 0.3)", // Very light purple
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width + this.size/2) this.x = -this.size/2;
        if (this.x < -this.size/2) this.x = canvas.width + this.size/2;
        if (this.y > canvas.height + this.size/2) this.y = -this.size/2;
        if (this.y < -this.size/2) this.y = canvas.height + this.size/2;
      }

      draw() {
        if (!ctx) return;
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size/2
        );

        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.5)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create blobs
    for (let i = 0; i < 4; i++) {
      blobs.push(new Blob());
    }

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      blobs.forEach(blob => {
        blob.update();
        blob.draw();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", setCanvasDimensions);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10" />;
}