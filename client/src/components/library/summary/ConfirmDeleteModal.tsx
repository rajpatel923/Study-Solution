"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  summaryTitle: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  summaryTitle
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Show the modal with animation
      document.body.style.overflow = "hidden"; // Prevent scrolling
      
      const tl = gsap.timeline();
      
      tl.set([modalRef.current, backdropRef.current], { 
        display: "flex" 
      });
      
      tl.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2
      });
      
      tl.fromTo(contentRef.current, {
        y: 20,
        opacity: 0
      }, {
        y: 0,
        opacity: 1,
        duration: 0.3,
        ease: "power2.out"
      });
    } else {
      // Hide the modal with animation
      const tl = gsap.timeline({
        onComplete: () => {
          if (modalRef.current && backdropRef.current) {
            modalRef.current.style.display = "none";
            backdropRef.current.style.display = "none";
            document.body.style.overflow = ""; // Restore scrolling
          }
        }
      });
      
      tl.to(contentRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.2,
        ease: "power2.in"
      });
      
      tl.to(backdropRef.current, {
        opacity: 0,
        duration: 0.2
      }, "-=0.1");
    }
  }, [isOpen]);
  
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);
  
  // Truncate title if too long
  const truncatedTitle = 
    summaryTitle.length > 40
      ? summaryTitle.substring(0, 40) + "..."
      : summaryTitle;
  
  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-50 items-center justify-center hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        ref={backdropRef}
        className="fixed inset-0 bg-black bg-opacity-50 opacity-0"
        onClick={onClose}
      ></div>
      
      {/* Modal content */}
      <div 
        ref={contentRef}
        className="bg-white rounded-lg shadow-xl z-10 max-w-md w-full mx-4 p-6 opacity-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Summary</h3>
          
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to delete <span className="font-medium text-gray-700">
                "{truncatedTitle}"</span>? 
            This action cannot be undone.
          </p>
          
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <button
              type="button"
              className="mt-3 sm:mt-0 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;