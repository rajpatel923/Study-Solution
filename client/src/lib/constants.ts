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
    name: "User",
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
          url: "/dashboard/create-summary",
        },
        {
          title: "Quiz Creator",
          url: "/dashboard/create-quiz",
        },
        {
          title: "Flashcards",
          url: "/dashboard/create-flashcards",
        },
        {
          title: "Study Planner",
          url: "/dashboard/create-study-plan",
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
          url: "/dashboard/save-documents",
        },
        {
          title: "summaries",
          url: "/dashboard/save-summaries",
        },
        {
          title: "flashcards",
          url: "/dashboard/save-flashcards",
        },
        {
          title: "quiz",
          url: "/dashboard/save-quiz",
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
          url: "/dashboard/groups",
        },
        {
          title: "StudyGroup1",
          url: "/dashboard/groups/1",
        },
        {
          title: "StudyGroup2",
          url: "/dashboard/groups/2",
        },
        {
          title: "StudyGroup3",
          url: "/dashboard/groups/3",
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
  DashBoard:[
    {
      name: "Dashboard",
      url: "/dashboard",
      icon: HomeIcon,
    },
  ]
};
