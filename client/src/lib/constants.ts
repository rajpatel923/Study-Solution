import {
  BookOpen,
  Bot,
  Frame,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  School,
  HomeIcon,
} from "lucide-react";

export const sideBarData = {
  user: {
    name: "user",
    email: "user@gmail.com",
    avatar: "/avatar/avatar.jpg",
  },
  teams: {
    name: "StudySync",
    logo: "/images/logo.png",
    plan: "pro",
  },
  navMain: [
    {
      title: "Study Tools",
      url: "/study-tools",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Summarizer",
          url: "/public/dashboard/create-summary",
        },
        {
          title: "Quiz Creator",
          url: "/public/dashboard/create-quiz",
        },
        {
          title: "Flashcards",
          url: "/public/dashboard/create-flashcards",
        },
        {
          title: "Study Planner",
          url: "/public/dashboard/create-study-plan",
        },
      ],
    },
    {
      title: "Analytics",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Tools1",
          url: "#",
        },
        {
          title: "Tools2",
          url: "#",
        },
        {
          title: "Tools3",
          url: "#",
        },
      ],
    },
    {
      title: "Library",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "docs",
          url: "/public/dashboard/save-documents",
        },
        {
          title: "summaries",
          url: "/public/dashboard/save-summaries",
        },
        {
          title: "flashcards",
          url: "/public/dashboard/save-flashcards",
        },
        {
          title: "quiz",
          url: "/public/dashboard/save-quiz",
        },
      ],
    },
    {
      title: "Groups",
      url: "#",
      icon: School,
      items: [
        {
          title: "home",
          url: "/public/dashboard/groups",
        },
        {
          title: "StudyGroup1",
          url: "/public/dashboard/groups/1",
        },
        {
          title: "StudyGroup2",
          url: "/public/dashboard/groups/2",
        },
        {
          title: "StudyGroup3",
          url: "/public/dashboard/groups/3",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Subjects",
      url: "/public/dashboard/subjects",
      icon: HomeIcon,
    },
    {
      name: "Math",
      url: "/public/dashboard/subjects/1",
      icon: Frame,
    },
    {
      name: "Physics",
      url: "/public/dashboard/subjects/2",
      icon: PieChart,
    },
    {
      name: "Geometry",
      url: "/public/dashboard/subjects/3",
      icon: Map,
    },
  ],
};
