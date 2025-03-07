import React from "react";

const Footer: React.FC = () => {
  return (
    <footer
      className="bg-gray-800 text-white py-8 px-4 text-center bottom-0 w-full"
      aria-label="Footer"
    >
      <div className="container mx-auto flex justify-around max-w-5xl gap-x-8">
        {/** Section: Get StudySolution */}
        <div className="flex flex-col items-start space-y-2">
          <h4 className="font-bold text-xl">Get StudySolution</h4>
          <a href="#" className="text-gray-400 hover:text-white">Sign Up</a>
          <a href="#" className="text-gray-400 hover:text-white">Login</a>
        </div>

        {/** Section: Study Tools */}
        <div className="flex flex-col items-start space-y-2">
          <h4 className="font-bold text-xl">Study Tools</h4>
          <a href="#" className="text-gray-400 hover:text-white">Flashcards</a>
          <a href="#" className="text-gray-400 hover:text-white">Practice Quizzes</a>
          <a href="#" className="text-gray-400 hover:text-white">Study Planner</a>
        </div>

        {/** Section: Exams */}
        <div className="flex flex-col items-start space-y-2">
          <h4 className="font-bold text-xl">Exams</h4>
          <a href="#" className="text-gray-400 hover:text-white">SAT</a>
          <a href="#" className="text-gray-400 hover:text-white">ACT</a>
          <a href="#" className="text-gray-400 hover:text-white">GRE</a>
        </div>

        {/** Section: Resources */}
        <div className="flex flex-col items-start space-y-2">
          <h4 className="font-bold text-xl">Resources</h4>
          <a href="#" className="text-gray-400 hover:text-white">Articles</a>
          <a href="#" className="text-gray-400 hover:text-white">Guides</a>
          <a href="#" className="text-gray-400 hover:text-white">Tutorials</a>
        </div>

        {/** Section: Subjects */}
        <div className="flex flex-col items-start space-y-2">
          <h4 className="font-bold text-xl">Subjects</h4>
          <a href="#" className="text-gray-400 hover:text-white">Science</a>
          <a href="#" className="text-gray-400 hover:text-white">Social Studies</a>
          <a href="#" className="text-gray-400 hover:text-white">Math</a>
          <a href="#" className="text-gray-400 hover:text-white">English</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
