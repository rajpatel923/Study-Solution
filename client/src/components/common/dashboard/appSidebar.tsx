"use client"
import * as React from "react"

import { NavMain } from "@/components/common/dashboard/navMain"
import { NavProjects } from "@/components/common/dashboard/navProjects"
import { NavUser } from "@/components/common/dashboard/navUser"
import { TeamSwitcher } from "@/components/common/dashboard/teamSwitcher"
import  {sideBarData}  from "@/lib/constants" 

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"
import {Button} from "@/components/ui/button";
import Link from "next/link";
import {HomeIcon} from "lucide-react";



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const data = sideBarData

  const {user} = useAuth()

  data.user.name = user?.username? user.username : "user"

  data.user.email = user? user.email : "user"

  data.teams.plan = user?.plan? user.plan : "Free"
  

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <TeamSwitcher team={data.teams} />
          <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <HomeIcon/>
              <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-start gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                  <Link href="/dashboard">Dashboard</Link>
              </Button>
          </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}