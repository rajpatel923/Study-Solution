import { BookOpen, SquareTerminal, HomeIcon } from "lucide-react";

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
      ],
    },
  ],
  projects: [],
  DashBoard: [
    {
      name: "Dashboard",
      url: "/dashboard",
      icon: HomeIcon,
    },
  ],
};
