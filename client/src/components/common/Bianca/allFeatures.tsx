import FeatureCard from "./FeatureCard";

const features = [
  { title: "Smart Notes", description: "AI-powered notes from any text." },
  { title: "Flashcards", description: "Auto-generate flashcards for revision." },
  { title: "Study Groups", description: "Collaborate and learn with peers." },
  { title: "Quiz Generator", description: "Turn your notes into quizzes." },
  { title: "PDF Reader", description: "Annotate and highlight PDFs." },
];

const AllFeatures = () => {
  return (
    <section className="py-12 bg-gray-100 font-quicksand">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-gray-800 font-poppins">
          All the Tools You Need
        </h2>
        <p className="text-gray-600 mt-2 font-poppins">
          Everything you need to study smarter, in one place.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-6">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </section>
  );
};

export default AllFeatures;
