import {
  Code,
  Book,
  BookCheck,
  WalletCards,
  FilePenLine, PersonStandingIcon
} from 'lucide-react';


const features = [
  {
    icon: <Code className="h-6 w-6" />,
    title: 'Summary Generation',
    desc: 'Upload a PDF, paste a web article, drop a YT link or Powerpoint file, and get a concise summary in seconds.',
  },
  {
    icon: <BookCheck className="h-6 w-6" />,
    title: 'Quiz Creation',
    desc: 'Generate quizzes with options for multiple choice, fill-in-the-blank, and true/false questions.',
  },
  {
    icon: <WalletCards className="h-6 w-6" />,
    title: 'Flashcards',
    desc: 'Create flashcards from your choice of source to enhance memory retention and study efficiency.',
  },
  {
    icon: <FilePenLine className="h-6 w-6" />,
    title: 'Customize Output',
    desc: 'Include a prompt to customize the output to suit your specific needs and preferences.',
  },
  {
    icon: <Book className="h-6 w-6" />,
    title: 'Document Manger',
    desc: 'Organize and manage your documents with ease, keeping everything in one place for quick access.',
  },
  {
    icon: <PersonStandingIcon className="h-6 w-6" />,
    title: 'Personalized',
    desc: 'Tailor the AI to your unique study habits and preferences for a more effective learning experience.',
  },
];
export default function Feature1() {
  return (
      <section className="relative py-14">
        <div className="mx-auto max-w-screen-xl px-4 md:px-8">
          <div className="relative mx-auto max-w-2xl sm:text-center">
            <div className="relative z-10">
              <h3 className="font-geist mt-4 text-3xl font-normal tracking-tighter sm:text-4xl md:text-5xl">
                Let’s Help You Study Smarter, Not Harder
              </h3>
            </div>
            <div
                className="absolute inset-0 mx-auto h-44 max-w-xs blur-[118px]"
                style={{
                  background:
                      'linear-gradient(152.92deg, rgba(192, 15, 102, 0.2) 4.54%, rgba(192, 11, 109, 0.26) 34.2%, rgba(192, 15, 102, 0.1) 77.55%)',
                }}
            ></div>
          </div>
          <hr className="bg-foreground/30 mx-auto mt-5 h-px w-1/2" />
          <div className="relative mt-12">
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((item, idx) => (
                  <li
                      key={idx}
                      className="transform-gpu space-y-3 rounded-xl border bg-transparent p-4 [box-shadow:0_-20px_80px_-20px_#ff7aa42f_inset]"
                  >
                    <div className="text-primary w-fit transform-gpu rounded-full border p-4 [box-shadow:0_-20px_80px_-20px_#ff7aa43f_inset] dark:[box-shadow:0_-20px_80px_-20px_#ff7aa40f_inset]">
                      {item.icon}
                    </div>
                    <h4 className="font-geist text-lg font-bold tracking-tighter">
                      {item.title}
                    </h4>
                    <p className="text-gray-500">{item.desc}</p>
                  </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
  );
}
