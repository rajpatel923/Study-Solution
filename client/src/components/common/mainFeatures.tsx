import React from "react";
import Image from "next/image";

const MainFeatures = () => {
  return (
    <div className="bg-gray-900 text-white min-h-screen p-6 flex flex-col items-center">
      {/* Hero Section */}
      <div className="text-center max-w-2xl">
        <h1 className="text-3xl font-bold">Become an academic weapon {">"} :)</h1>
        <p className="text-gray-400 mt-2">
          We're all about helping you learn efficiently and quicker.
        </p>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 max-w-4xl text-center">
        {/* Study Group Feature */}
        <div className="bg-black p-6 rounded-lg shadow-lg flex flex-col items-center">
          <h2 className="text-xl font-semibold">Study Group</h2>
          <p className="text-gray-400 mt-2">
            Join a group study session and chat with your peers to enhance your learning experience.
          </p>
          <Image
            src="/images/SS_groupimage.png"
            alt="Study Group"
            width={400}
            height={250}
            className="mt-4 rounded-lg"
          />
        </div>

        {/* AI Quiz Feature */}
        <div className="bg-black p-6 rounded-lg shadow-lg flex flex-col items-center">
          <h2 className="text-xl font-semibold">AI Quiz Generator</h2>
          <p className="text-gray-300 mt-2">
            Generate quizzes instantly based on your study material.
          </p>
          <Image
            src="/images/SS_quizimage.png"
            alt="AI Quiz"
            width={400}
            height={250}
            className="mt-4 rounded-lg"
          />
        </div>

        {/* AI Flashcards (PDF Uploader) Feature */}
        <div className="bg-black p-6 rounded-lg shadow-lg flex flex-col items-center">
          <h2 className="text-xl font-semibold">AI Flashcards</h2>
          <p className="text-gray-400 mt-2">
            Upload a PDF and AI will create flashcards for you to study efficiently.
          </p>
          <Image
            src="/images/SS_pdfuploaderimage.png"
            alt="AI Flashcards"
            width={400}
            height={250}
            className="mt-4 rounded-lg"
          />
        </div>

        {/* New Feature Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
          <h2 className="text-xl font-semibold">Performance Tracking</h2>
          <p className="text-gray-300 mt-2">
            AI-powered notes summarization to help you grasp key concepts quickly.
          </p>
          <Image
            src="/images/SS_performance.png"
            alt="Smart Notes"
            width={400}
            height={250}
            className="mt-4 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default MainFeatures;
