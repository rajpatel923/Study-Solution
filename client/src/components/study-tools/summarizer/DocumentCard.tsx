"use client";

import React from "react";

interface Document {
  id: number;
  name: string;
  type: string;
  uploadedAt: string;
}

interface DocumentCardProps {
  document: Document;
}

export default function DocumentCard({ document }: DocumentCardProps) {
  const { name, type, uploadedAt } = document;

  return (
    <div className="border border-gray-200 p-4 rounded-md shadow-sm flex flex-col">
      <div className="flex-1">
        <h3 className="font-medium text-lg">{name}</h3>
        <p className="text-sm text-gray-500">{type}</p>
        <p className="text-xs text-gray-400">Uploaded on {uploadedAt}</p>
      </div>
      <div className="mt-4 flex gap-2 flex-wrap">
        <button className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200">
          Flashcard
        </button>
        <button className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded-md hover:bg-green-200">
          Summarize
        </button>
        <button className="px-3 py-1 text-sm bg-yellow-100 text-yellow-600 rounded-md hover:bg-yellow-200">
          Quiz
        </button>
      </div>
    </div>
  );
}
