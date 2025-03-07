import React from "react";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const features = [
  { name: "Unlimited FREE Learn mode", studysync: true, quizlet: false },
  { name: "Unlimited FREE Practice tests", studysync: true, quizlet: false },
  { name: "Attach images to flashcards for FREE", studysync: true, quizlet: false },
  { name: "Attach images to term side", studysync: true, quizlet: false },
  { name: "FREE Flashcard Formatting", studysync: true, quizlet: false },
  { name: "Spaced Repetition Mode", studysync: true, quizlet: false },
  { name: "Make your own flashcards", studysync: true, quizlet: true },
];

const ComparingSection = () => {
  return (
    <section className="bg-darkAccent text-white py-16 px-6 ">
      <div className="container text-center max-w-4xl mx-auto">
        {/* Section Title */}
        <h2 className="text-4xl font-bold text-white inline-block">
          Comparing StudySync vs Quizlet
        </h2>

        {/* Feature Comparison Table */}
        <div className="flex justify-center mt-10">
          <div className="bg-dark rounded-lg shadow-lg p-6 w-full max-w-4xl">
            <table className="w-full border-collapse rounded-lg overflow-hidden text-center">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-4 font-semibold text-gray-300 text-left">Features</th>
                  <th className="p-4 font-semibold text-gray-300">StudySync</th>
                  <th className="p-4 font-semibold text-gray-300">Quizlet</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="p-4 text-left text-gray-400">{feature.name}</td>
                    <th className="p-4 flex justify-center">
                      {feature.studysync ? <FaCheckCircle className="text-green-400 text-3xl " /> : <FaTimesCircle className="text-red-500 text-3xl" />}
                    </th>
                    <th className="p-4">
                      {feature.quizlet ? <FaCheckCircle className="text-green-400 text-3xl" /> : <FaTimesCircle className="text-red-500 text-3xl" />}
                    </th>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Marketing Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 mt-16">
          <div className="bg-dark rounded-lg p-6 text-center shadow-lg ">
            <Image src="/images/brainIcon.png" alt="Brain Icon" width={100} height={100} className="mx-auto" />
            <h3 className="text-2xl font-semibold mt-4">Free Learn Mode</h3>
            <p className="text-gray-400 mt-2">Keep studying the way that works best for you – for free.</p>
            <Button className="mt-4 bg-primary hover:bg-primaryHover text-white px-6 py-2 rounded-lg border border-gray-600">
              Try Learn Mode →
            </Button>
          </div>

          <div className="bg-dark rounded-lg p-6 text-center shadow-lg ">
            <Image src="/images/import.png" alt="Quizlet Import Icon" width={100} height={100} className="mx-auto" />
            <h3 className="text-2xl font-semibold mt-4">The only free Quizlet alternative you’ll need</h3>
            <p className="text-gray-400 mt-2">Import Quizlet sets into StudySync and start studying instantly.</p>
            <Button className="mt-4 bg-primary hover:bg-primaryHover text-white px-6 py-2 rounded-lg border border-gray-600">
              Import a Set from Quizlet →
            </Button>
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="mt-16 bg-dark rounded-lg p-6 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-center">
            <Image src="/catstudy.png" alt="Mascot" width={180} height={180} />
            <div className="text-left md:ml-6">
              <h3 className="text-3xl font-bold">
                One site to take notes, study flashcards & more.
              </h3>
              <p className="text-gray-400 mt-2">
                Get the functionality of Quizlet, Notion, Google Docs, and Firewable in a single app.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparingSection;
