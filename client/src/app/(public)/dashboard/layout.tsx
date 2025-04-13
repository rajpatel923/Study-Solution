// src/app/dashboard/layout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/common/loading';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { PlusCircle, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AppSidebar } from '@/components/common/dashboard/appSidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  

  // useEffect(() => {
  //   // Redirect to login if not authenticated and not loading
  //   if (!isLoading && !isAuthenticated) {
  //     router.push('/auth');
  //   }
  // }, [isAuthenticated, isLoading, router]);

  // // Show loading state while checking authentication
  // if (isLoading) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <Loader/>
  //     </div>
  //   );
  // }

  // // Don't render the dashboard if not authenticated
  // if (!isAuthenticated) {
  //   return null;
  // }

  return (
    <SidebarProvider className='h-screen w-screen overflow-hidden'>
      <div className='flex h-full w-full'>

      
      <AppSidebar/>
      <main className='flex flex-col w-full h-full overflow-hidden'>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 w-full z-10">
            <div className="flex items-center gap-2 px-4 ">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Projects</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="ml-auto flex items-center gap-2 px-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search projects..." className="pl-8" />
              </div>
              <Button size="lg">
                <PlusCircle className="mr-2 h-4 w-4" />
                Upload document
              </Button>
            </div>
          </header>
        {children}
      </main>
      </div>
    </SidebarProvider>
  );
}