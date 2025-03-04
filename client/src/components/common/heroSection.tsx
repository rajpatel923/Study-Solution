import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="bg-white py-20 text-center">
      <div className="container mx-auto px-6">
        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight">
          Enhance Your Learning With Study Sync
        </h1>

        {/* Subheading */}
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Simply paste your Quizlet link below to bring it over in seconds! Study it with
          free learn mode, match game, or other study modes.
        </p>

        {/* Search Bar */}
        <div className="flex justify-center mt-6">
          <input
            type="text"
            placeholder="Just paste your Quizlet link here to bring it over"
            className="w-full max-w-lg px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-800"
          />
          <Button className="ml-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white">
            Import from Quizlet
          </Button>
        </div>

        {/* Mascot Image (Optional) */}
        <div className="flex justify-center mt-6">
          <img src="/catstudy.png" alt="Mascot" className="w-400" />
        </div>
      </div>
    </section>
  );
}
