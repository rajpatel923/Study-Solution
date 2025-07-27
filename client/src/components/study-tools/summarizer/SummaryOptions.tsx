"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import UploadWorkflow from "./UploadWorkflow";
import {PiFilePdf} from "react-icons/pi";
import pdfSvg from "#/images/svgs/pdf-svgrepo-com.svg";
import pptSvg from "#/images/svgs/powerpoint-svgrepo-com.svg";
import videoSvg from "#/images/svgs/youtube-color-svgrepo-com.svg";
import lectureSvg from "#/images/svgs/note-svgrepo-com.svg";
import webpageSvg from "#/images/svgs/internet-svgrepo-com.svg";
import Image from "next/image";

const TABS = [
  { id: "pdf", label: "PDF", title: "PDF to Notes Conversion", icon: pdfSvg },
  { id: "ppt", label: "PPT", title: "PPT to Quick Summary", icon: pptSvg },
  { id: "video", label: "Video", title: "Video to Quick Summary", icon: videoSvg },
  { id: "lecture", label: "Lecture Note", title: "Lecture Note to Quick Summary", icon: lectureSvg },
  { id: "webpage", label: "webpage", title: "Webpage to Quick Summary", icon: webpageSvg },
];

export default function SummaryOptions() {
  const [activeTab, setActiveTab] = useState("pdf");

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };


  const getCardTitle = () => {
    const tab = TABS.find(tab => tab.id === activeTab);
    return tab ? tab.title : "AI Document Summarizer";
  };

  const getTabIcon = () => {
    const tab = TABS.find(tab => tab.id === activeTab);
    return tab ? tab.icon : <PiFilePdf></PiFilePdf>;
  }

  return (
      <div className="w-full flex flex-col">
        <div className="flex items-center justify-center gap-2 md:gap-4 mb-6 flex-wrap">
          {TABS.map((tab) => (
              <Button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`rounded-full bg-transparent border border-transparent px-8 py-6 text-lg font-medium transition-all duration-300 ease-in-out whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                          ? "bg-yellow-400 text-black hover:bg-yellow-500 shadow-md"
                          : "text-black hover:text-white hover:border-white"
                  }`}
              >
                {tab.label}
              </Button>
          ))}
        </div>

        <Card className="border-0 bg-transparent shadow-none max-w-6xl mx-auto">
          <CardContent className="p-6">
            <div className="rounded-2xl p-8 mb-6 bg-amber-200 shadow-lg border border-gray-100">
              <div className="flex items-start gap-6">
                <Image
                    src={getTabIcon()}
                    alt="Tab Icon"
                    height={100}
                    width={100}
                    className="rounded-lg shadow-md bg-gray-50 p-2"
                />

                <div className="flex-1">
                  <h2 className="text-3xl font-extrabold mb-3 text-gray-700 tracking-tight">
                    {getCardTitle()}
                  </h2>
                  <p className="text-lg leading-relaxed">
                    Upload any PDF & Kai will make notes & flashcards instantly.
                    <span className="block mt-1">
                      In &lt; 30 seconds, Kai will read your PDF and tell you all the important stuff in it.
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <UploadWorkflow />
          </CardContent>
        </Card>
      </div>
  );
}