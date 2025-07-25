'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Spotlight } from '@/components/ui/spotlight';
import { BorderBeam } from '@/components/ui/border-beam';
import { CardHoverEffect } from '@/components/ui/pulse-card';
import {
  Globe,
  Users,
  Heart,
  Lightbulb,
  Sparkles,
  Rocket,
  Target,
} from 'lucide-react';

interface AboutUsProps {
  title?: string;
  subtitle?: string;
  mission?: string;
  vision?: string;
  values?: Array<{
    title: string;
    description: string;
    icon: keyof typeof iconComponents;
  }>;
  className?: string;
}

const iconComponents = {
  Users: Users,
  Heart: Heart,
  Lightbulb: Lightbulb,
  Globe: Globe,
  Sparkles: Sparkles,
  Rocket: Rocket,
  Target: Target,
};

const defaultValues: AboutUsProps['values'] = [
  {
    title: 'Student Centricity',
    description:
        'Our tools are to make learning easier and more engaging for students of all backgrounds.',
    icon: 'Lightbulb',
  },
  {
    title: 'Efficiency',
    description:
        'We automate the tedious parts of studying, so students can focus on comprehension and retention.',
    icon: 'Users',
  },
  {
    title: 'Innovation',
    description:
        'We continuously integrate the lastest AI technologies to support new formats and adapt to diverse learning styles.',
    icon: 'Sparkles',
  },
  {
    title: 'Accessibility',
    description:
        "Study Sync works across devices and supports different content sources to make learning inclusive.",
    icon: 'Globe',
  },
];

export default function AboutUs1() {
  const aboutData = {
    title: 'About Us',
    subtitle:
        'Creating a streamline studying process for modern students with AI-powered tools and resources.',
    mission:
        'Our mission is to empower students to achieve their academic goals by providing innovative, AI-driven tools that simplify the learning process and enhance productivity.',
    vision:
        'We believe students should spend less time on mundane tasks and more time on what truly matters: learning, growing, and achieving their goals.',
    values: defaultValues,
    className: 'relative overflow-hidden py-20',
  };

  const missionRef = useRef(null);
  const valuesRef = useRef(null);

  const missionInView = useInView(missionRef, { once: true, amount: 0.3 });
  const valuesInView = useInView(valuesRef, { once: true, amount: 0.3 });

  return (
      <section className="relative w-full overflow-hidden pt-20">
        <Spotlight
            gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(336, 100%, 50%, 0.08) 0, hsla(341, 100%, 55%, 0.04) 50%, hsla(336, 100%, 45%, 0) 80%)"
            gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(333, 100%, 85%, 0.08) 0, hsla(335, 100%, 55%, 0.04) 80%, transparent 100%)"
            gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(332, 100%, 85%, 0.06) 0, hsla(327, 100%, 85%, 0.06) 80%, transparent 100%)"
        />

        <div className="relative z-10 container mx-auto px-4 md:px-6">
          {/* Header Section */}
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="mx-auto mb-16 max-w-2xl text-center"
          >
            <h1 className="from-foreground/80 via-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              {aboutData.title}
            </h1>
            <p className="text-muted-foreground mt-6 text-xl">
              {aboutData.subtitle}
            </p>
          </motion.div>

          {/* Mission & Vision Section */}
          <div ref={missionRef} className="relative mx-auto mb-24 max-w-7xl">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={
                  missionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }
                }
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                className="relative z-10 grid gap-12 md:grid-cols-2"
            >
              <motion.div
                  whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                  className="group border-border/40 relative block overflow-hidden rounded-2xl border bg-gradient-to-br p-10 backdrop-blur-3xl"
              >
                <BorderBeam
                    duration={8}
                    size={300}
                    className="via-primary/40 from-transparent to-transparent"
                />

                <div className="from-primary/20 to-primary/5 mb-6 inline-flex aspect-square h-16 w-16 flex-1 items-center justify-center rounded-2xl bg-gradient-to-br backdrop-blur-sm">
                  <Rocket className="text-primary h-8 w-8" />
                </div>

                <div className="space-y-4">
                  <h2 className="from-primary/90 to-primary/70 mb-4 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent">
                    Our Mission
                  </h2>

                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {aboutData.mission}
                  </p>
                </div>
              </motion.div>

              <motion.div
                  whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                  className="group border-border/40 relative block overflow-hidden rounded-2xl border bg-gradient-to-br p-10 backdrop-blur-3xl"
              >
                <BorderBeam
                    duration={8}
                    size={300}
                    className="from-transparent via-blue-500/40 to-transparent"
                    reverse
                />
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 backdrop-blur-sm">
                  <Target className="h-8 w-8 text-blue-500" />
                </div>

                <h2 className="mb-4 bg-gradient-to-r from-blue-500/90 to-blue-500/70 bg-clip-text text-3xl font-bold text-transparent">
                  Our Vision
                </h2>

                <p className="text-muted-foreground text-lg leading-relaxed">
                  {aboutData.vision}
                </p>
              </motion.div>
            </motion.div>
          </div>

          <div ref={valuesRef} className="mb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={
                  valuesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                }
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="mb-12 text-center"
            >
              <h2 className="from-foreground/80 via-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                Our Core Values
              </h2>
              <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
                We are committed to upholding these core values in everything we do, ensuring that our tools and resources reflect our dedication to excellence and innovation.
              </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {aboutData.values?.map((value, index) => {
                const IconComponent = iconComponents[value.icon];

                return (
                    <motion.div
                        key={value.title}
                        initial={{ opacity: 0, y: 30 }}
                        animate={
                          valuesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
                        }
                        transition={{
                          duration: 0.6,
                          delay: index * 0.1 + 0.2,
                          ease: 'easeOut',
                        }}
                        whileHover={{ y: -5, scale: 1.02 }}
                    >
                      <CardHoverEffect
                          icon={<IconComponent className="h-6 w-6" />}
                          title={value.title}
                          description={value.description}
                          variant={
                            index === 0
                                ? 'purple'
                                : index === 1
                                    ? 'blue'
                                    : index === 2
                                        ? 'amber'
                                        : 'rose'
                          }
                          glowEffect={true}
                          size="lg"
                      />
                    </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
  );
}
