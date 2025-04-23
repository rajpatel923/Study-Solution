'use client'; // Mark as client component

import { ReactNode } from 'react';
import Sidebar from '@/components/groups/GroupSlideBar';
import Header from '@/components/groups/GroupHeader';
import { WebSocketProvider } from '@/components/groups/WebSocketProvider';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // In a real app, you would get these values from your configuration
  const websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8085/ws';
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') || '' : '';
  
  return (
    <WebSocketProvider url={websocketUrl} authToken={authToken}>
      <div className="h-screen flex">
        {/* Left sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </WebSocketProvider>
  );
}