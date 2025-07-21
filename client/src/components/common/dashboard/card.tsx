"use client";
import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

const DashBoardCard = () => {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const card = cardRef.current;

        card?.addEventListener('mouseover', () => {
            gsap.to(card, {
                scale: 1.05,
                border: '1px solid black',
                duration: 0.05,
                ease: 'power2.out'
            });
        });

        card?.addEventListener('mouseleave', () => {
            gsap.to(card, {
                scale: 1,
                border: '1px solid white',
                duration: 0.05,
                ease: 'power2.out'
            });
        });

    }, []);

    return (
        <div
            ref={cardRef}
            className="box-border w-[190px] h-[254px] bg-[rgba(217,217,217,0.58)]
                       border border-white shadow-[12px_17px_51px_rgba(0,0,0,0.22)]
                       backdrop-blur-[6px] rounded-[17px] text-center cursor-pointer
                       flex items-center justify-center select-none font-bold
                       text-black"
        >
            Click me
        </div>
    );
};

export default DashBoardCard;