'use client'; // Mark as client component

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (destination: string, body: any) => void;
  subscribe: (topic: string, callback: (message: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  url: string;
  authToken?: string;
}

export function WebSocketProvider({ children, url, authToken }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<Record<string, Set<(message: any) => void>>>({});

  // Connect to WebSocket
  useEffect(() => {
    // Only run this code in the browser
    if (typeof window === 'undefined') return;
    
    const getUserId = (): string => {
      return localStorage.getItem('userId') || '123'; // Default user ID for testing
    };
    
    // Convert websocket URL to http(s) for SockJS
    // This corrects the ws:// or wss:// to http:// or https://
    let sockJsUrl = url;
    if (url.startsWith('ws:')) {
      sockJsUrl = 'http:' + url.substring(3);
    } else if (url.startsWith('wss:')) {
      sockJsUrl = 'https:' + url.substring(4);
    }
    
    console.log(`Connecting to WebSocket via SockJS at ${sockJsUrl}`);
    
    // Create the STOMP client with SockJS
    const client = new Client({
      // We need to provide a function that returns a new SockJS instance
      webSocketFactory: () => new SockJS(sockJsUrl),
      connectHeaders: {
        userId: getUserId(),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      debug: function (str) {
        console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      setIsConnected(true);
      console.log('✅ WebSocket connected successfully');
      
      // Subscribe to any topics that were requested before connection was established
      Object.entries(subscriptionsRef.current).forEach(([topic, callbacks]) => {
        console.log(`🔄 Resubscribing to topic: ${topic}`);
        const subscription = client.subscribe(topic, (message) => {
          console.log(`📨 Message received on topic: ${topic}`, message);
          try {
            const parsedMessage = JSON.parse(message.body);
            callbacks.forEach(callback => {
              callback(parsedMessage);
            });
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        });
      });
    };

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    client.onWebSocketClose = () => {
      setIsConnected(false);
      console.log('WebSocket connection closed');
    };

    client.activate();
    clientRef.current = client;
    
    // Clean up on unmount
    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [url, authToken]);
  
  const sendMessage = (destination: string, body: any) => {
    if (!isConnected || !clientRef.current) {
      console.warn('WebSocket not connected, message not sent');
      return;
    }
    
    clientRef.current.publish({
      destination,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: {
        userId: localStorage.getItem('userId') || '123',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
    });
  };
  
  const subscribe = (topic: string, callback: (message: any) => void) => {
    console.log(`📝 Attempting to subscribe to: ${topic}`);
    
    // Initialize the set for this topic if it doesn't exist
    if (!subscriptionsRef.current[topic]) {
      subscriptionsRef.current[topic] = new Set();
    }
    
    // Add the callback to the set
    subscriptionsRef.current[topic].add(callback);
    
    // If already connected, subscribe immediately
    if (isConnected && clientRef.current && clientRef.current.connected) {
      console.log(`🔗 Already connected, subscribing to: ${topic}`);
      const subscription = clientRef.current.subscribe(topic, (message) => {
        console.log(`📨 Message received from subscription: ${topic}`, message);
        try {
          const parsedMessage = JSON.parse(message.body);
          callback(parsedMessage);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
    } else {
      console.log(`⏳ Not connected yet, will subscribe to ${topic} when connected`);
    }
    
    // Return unsubscribe function
    return () => {
      console.log(`❌ Unsubscribing from: ${topic}`);
      const topicSubscribers = subscriptionsRef.current[topic];
      if (topicSubscribers) {
        topicSubscribers.delete(callback);
        
        if (topicSubscribers.size === 0) {
          delete subscriptionsRef.current[topic];
        }
      }
    };
  };
  
  const contextValue: WebSocketContextType = {
    isConnected,
    sendMessage,
    subscribe,
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Custom hook to use the WebSocket context
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}