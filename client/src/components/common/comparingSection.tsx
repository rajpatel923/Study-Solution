import React from "react";

const ComparingSection = () => {
  const features = [
    { name: "Group Studying", studysync: true, quizlet: false },
    { name: "Adaptive Learning", studysync: true, quizlet: false },
    { name: "Analytics Dashboard", studysync: true, quizlet: false },
    { name: "AI and Summarization Processing", studysync: true, quizlet: false },
    { name: "Make your own flashcards", studysync: true, quizlet: true },
  ];

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg shadow-md flex justify-center">
      <table className="w-auto border-collapse bg-gray-800 rounded-lg text-center">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="p-3 font-semibold text-gray-300">Features</th>
            <th className="p-3 font-semibold text-gray-300">StudySync</th>
            <th className="p-3 font-semibold text-gray-300">Quizlet</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr key={index} className="border-b border-gray-700">
              <td className="p-3 text-left text-gray-400">{feature.name}</td>
              <td className="p-3 text-center">
                <div className="flex justify-center items-center text-white">{feature.studysync ? "✅" : "❌"}</div>
              </td>
              <td className="p-3 text-center">
                <div className="flex justify-center items-center text-white">{feature.quizlet ? "✅" : "❌"}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/*
cd client
npm i
npm run dev
*/

export default ComparingSection;