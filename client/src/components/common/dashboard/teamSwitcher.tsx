// components/team-switcher.tsx
"use client"
import * as React from "react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Image from "next/image"

export function TeamSwitcher({
  team,
}: {
  team: {
    name: string
    logo: string
    plan: string
  }
}) {
  
  return (
    <SidebarMenu>
      <SidebarMenuItem> 
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
                <Image src={team.logo} className="w-12 h-12" width={28} height={28} alt="logo"/>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {team.name}
                </span>
                <span className="truncate text-xs">{team.plan}</span>
              </div>
            </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}