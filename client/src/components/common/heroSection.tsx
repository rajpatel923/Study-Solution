import { Button } from "@/components/ui/button";
import Image from "next/image"; // Import Image component for optimized images

export default function HeroSection() {
  return (
    <section className="bg-dark py-24 text-center"> {/* Updated background color and padding */}
      <div className="container mx-auto px-6">
        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-4"> {/* Increased font size, bold, white text, margin bottom */}
          #1 Free Quizlet Alternative
        </h1>

        {/* Subheading */}
        <p className="mt-2 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto"> {/* Adjusted text color, slightly larger font on md screens, reduced mt */}
          Paste your Quizlet link below to bring it over in seconds! Study it with
          free learn mode, match game or other study modes.
        </p>

        {/* Search Bar */}
        <div className="flex justify-center mt-8 space-x-2"> {/* Increased margin top and added space between input and button */}
          <input
            type="text"
            placeholder="Just paste your Quizlet link here to bring it over"
            className="w-full max-w-lg px-6 py-3 rounded-full bg-darkAccent text-white placeholder-gray-400 focus:outline-none" // Updated input styles
          />
          <Button className="px-8 py-6 rounded-full bg-primaryCustome hover:bg-primaryHover text-white font-bold text-lg"> {/* Updated button styles, red background */}
            Import from Quizlet
          </Button>
        </div>

        {/* Mascot Image */}
        <div className="flex justify-center mt-12"> {/* Increased margin top for image spacing */}
          <Image
            src="/catstudy.png" // Changed image source to match example - **Replace with your image path**
            alt="Mascot"
            width={500} // Adjusted width for better responsiveness
            height={350} // Adjusted height, maintain aspect ratio or adjust as needed
            className="max-w-full h-auto" // Responsive image class
          />
        </div>

        {/* Statistics Section */}
        <div className="flex flex-wrap justify-around gap-8 mt-10 text-white">
          <div className="text-center">
            <p className="text-4xl font-bold">15%</p>
            <p className="text-gray-300">Average Study Time Reduction</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">98%</p>
            <p className="text-gray-300">Users Recommend Study Sync</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">500K+</p>
            <p className="text-gray-300">Daily Active Users</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">#1</p>
            <p className="text-gray-300">Rated Study Platform in 2024</p>
          </div>
        </div>
      </div>
    </section>
  );
}