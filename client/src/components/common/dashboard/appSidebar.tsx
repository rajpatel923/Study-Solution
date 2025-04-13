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



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const data = sideBarData

  const {user} = useAuth()

  data.user.name = user?.username? user.username : "user"

  data.user.email = user? user.email : "user"
  

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <TeamSwitcher team={data.teams} />
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