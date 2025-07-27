// src/app/dashboard/layout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { PlusCircle, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AppSidebar } from '@/components/common/dashboard/appSidebar';
import AnimatedBackground from "@/components/study-tools/summarizer/AnimatedBackground";
import Footer from "@/components/common/footer";
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Button } from "@/components/ui/button"
import {ModeToggle} from "@/components/ui/modeToggle";


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  
  if(user){
    localStorage.setItem('userId', String(user.id));
  }
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
      <>
        {/*<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>*/}
        <SidebarProvider className='h-screen w-screen overflow-hidden'>
          <div className='flex h-full w-full'>
            <AppSidebar/>
            <main className='flex flex-col w-full h-full overflow-y-scroll'>
              <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 w-full z-10">
                  <div className="flex items-center gap-2 px-4 ">
                    <SidebarTrigger className="-ml-1" />
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
                    <ModeToggle/>
                    {/*//todo: create three card hover button, token use limit, fire strick */}
                  </div>
                </header>
              <AnimatedBackground />
              {children}
              <Footer />
            </main>
          </div>
        </SidebarProvider>
        {/*</ThemeProvider>*/}
      </>
  );
}