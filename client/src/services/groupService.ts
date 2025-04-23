"use client"; // Mark as client component

import axios from "axios";

// Configure base URL with the correct port and path prefix
const BASE_URL = "http://localhost:8085/api/v1";

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper function to get user ID from local storage
const getUserId = (): string => {
  if (typeof window !== "undefined") {
    const userId = localStorage.getItem("userId") || "";
    console.log("User ID from local storage:", userId);
    return userId || "1"; // Default user ID for demo purposes if none found
  }
  return "1"; // Default user ID for server-side rendering
};

// Add request interceptor to include userId in all requests
api.interceptors.request.use((config) => {
  config.headers.userId = getUserId();
  return config;
});

// Types
export interface Group {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  members: Member[];
  settings: {
    visibility: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
    allowMemberSharing: boolean;
  };
}

export interface Member {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

export interface SharedItem {
  id: string;
  itemId: string;
  itemType:
    | "DOCUMENT"
    | "FLASHCARD_SET"
    | "SUMMARY"
    | "IMAGE"
    | "VIDEO"
    | "OTHER";
  title: string;
  description?: string;
  size?: string;
  addedBy: string;
  addedAt: string;
  fileExtension?: string;
  accessType?: "VIEW" | "EDIT";
}

export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  sentAt: string;
  type: "TEXT" | "FILE" | "IMAGE" | "SHARE";
  attachmentUrl?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  avatarUrl?: string;
  settings: {
    visibility: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
    allowMemberSharing: boolean;
  };
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  avatarUrl?: string;
  settings?: {
    visibility?: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
    allowMemberSharing?: boolean;
  };
}

export interface ShareItemRequest {
  itemId: string;
  itemType:
    | "DOCUMENT"
    | "FLASHCARD_SET"
    | "SUMMARY"
    | "IMAGE"
    | "VIDEO"
    | "OTHER";
  title: string;
  description?: string;
  accessType: "VIEW" | "EDIT";
}

export interface SendMessageRequest {
  content: string;
  type: "TEXT" | "FILE" | "IMAGE" | "SHARE";
  attachmentUrl?: string;
}

// Group Management API
export const getMyGroups = async (): Promise<Group[]> => {
  try {
    const response = await api.get("/groups");
    return response.data;
  } catch (error) {
    console.error("Error fetching groups:", error);
    // Return empty array on error to prevent app crash
    return [];
  }
};

export const getGroupById = async (groupId: string): Promise<Group> => {
  try {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching group with ID ${groupId}:`, error);
    throw error;
  }
};

export const createGroup = async (
  groupData: CreateGroupRequest
): Promise<Group> => {
  try {
    const response = await api.post("/groups", groupData);
    return response.data;
  } catch (error) {
    console.error("Error creating group:", error);
    throw error;
  }
};

export const updateGroup = async (
  groupId: string,
  groupData: UpdateGroupRequest
): Promise<Group> => {
  try {
    const response = await api.put(`/groups/${groupId}`, groupData);
    return response.data;
  } catch (error) {
    console.error(`Error updating group with ID ${groupId}:`, error);
    throw error;
  }
};

export const deleteGroup = async (groupId: string): Promise<void> => {
  try {
    await api.delete(`/groups/${groupId}`);
  } catch (error) {
    console.error(`Error deleting group with ID ${groupId}:`, error);
    throw error;
  }
};

export const addMember = async (
  groupId: string,
  userId: string,
  role: "ADMIN" | "MEMBER" = "MEMBER"
): Promise<Group> => {
  try {
    const response = await api.post(`/groups/${groupId}/members`, null, {
      params: { userId, role },
    });
    return response.data;
  } catch (error) {
    console.error(`Error adding member to group ${groupId}:`, error);
    throw error;
  }
};

export const removeMember = async (
  groupId: string,
  userId: string
): Promise<Group> => {
  try {
    const response = await api.delete(`/groups/${groupId}/members/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error removing member from group ${groupId}:`, error);
    throw error;
  }
};

export const updateMemberRole = async (
  groupId: string,
  userId: string,
  role: "ADMIN" | "MEMBER"
): Promise<Group> => {
  try {
    const response = await api.put(
      `/groups/${groupId}/members/${userId}/role`,
      {
        role,
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating member role in group ${groupId}:`, error);
    throw error;
  }
};

// Shared Item API
export const getGroupItems = async (groupId: string): Promise<SharedItem[]> => {
  try {
    const response = await api.get(`/groups/${groupId}/items`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching items for group ${groupId}:`, error);
    return [];
  }
};

export const getSharedItemById = async (
  groupId: string,
  itemId: string
): Promise<SharedItem> => {
  try {
    const response = await api.get(`/groups/${groupId}/items/${itemId}`);
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching shared item ${itemId} from group ${groupId}:`,
      error
    );
    throw error;
  }
};

export const shareItem = async (
  groupId: string,
  itemData: ShareItemRequest
): Promise<SharedItem> => {
  try {
    const response = await api.post(`/groups/${groupId}/items`, itemData);
    return response.data;
  } catch (error) {
    console.error(`Error sharing item in group ${groupId}:`, error);
    throw error;
  }
};

export const removeSharedItem = async (
  groupId: string,
  itemId: string
): Promise<void> => {
  try {
    await api.delete(`/groups/${groupId}/items/${itemId}`);
  } catch (error) {
    console.error(
      `Error removing shared item ${itemId} from group ${groupId}:`,
      error
    );
    throw error;
  }
};

// Message API
export const getGroupMessages = async (
  groupId: string,
  page = 0,
  size = 20
): Promise<{
  content: Message[];
  totalPages: number;
  totalElements: number;
}> => {
  try {
    const response = await api.get(`/groups/${groupId}/messages`, {
      params: { page, size },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching messages for group ${groupId}:`, error);
    return {
      content: [],
      totalPages: 0,
      totalElements: 0,
    };
  }
};

export const sendMessage = async (
  groupId: string,
  messageData: SendMessageRequest
): Promise<Message> => {
  try {
    const response = await api.post(`/groups/${groupId}/messages`, messageData);
    return response.data;
  } catch (error) {
    console.error(`Error sending message to group ${groupId}:`, error);
    throw error;
  }
};

export const deleteMessage = async (
  groupId: string,
  messageId: string
): Promise<void> => {
  try {
    await api.delete(`/groups/${groupId}/messages/${messageId}`);
  } catch (error) {
    console.error(
      `Error deleting message ${messageId} from group ${groupId}:`,
      error
    );
    throw error;
  }
};

// WebSocket Management
interface WebSocketConnection {
  disconnect: () => void;
  sendMessage: (message: any) => void;
}

// WebSocket implementation using SockJS and StompJS
export const setupWebSocketConnection = (
  groupId: string,
  onMessageReceived: (message: any) => void
): WebSocketConnection => {
  if (typeof window === "undefined") {
    return {
      disconnect: () => {},
      sendMessage: () => {},
    };
  }

  // Dynamically import SockJS and StompJS
  const setupSocket = async () => {
    const SockJS = (await import("@stomp/stompjs")).Client;

    let client = new SockJS({
      brokerURL: "ws://localhost:8085/ws",
      connectHeaders: {
        userId: getUserId(),
      },
      debug: function (str) {
        console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = function () {
      // Subscribe to group channel
      client.subscribe(`/topic/group.${groupId}`, function (message) {
        const receivedMessage = JSON.parse(message.body);
        onMessageReceived(receivedMessage);
      });
    };

    client.onStompError = function (frame) {
      console.error("Broker reported error: " + frame.headers["message"]);
      console.error("Additional details: " + frame.body);
    };

    client.activate();

    return {
      disconnect: () => {
        if (client && client.connected) {
          client.deactivate();
        }
      },
      sendMessage: (chatMessage) => {
        if (client && client.connected) {
          client.publish({
            destination: `/app/chat.sendMessage/${groupId}`,
            headers: { userId: getUserId() },
            body: JSON.stringify(chatMessage),
          });
        } else {
          console.error("WebSocket not connected");
        }
      },
    };
  };

  // Initialize connection
  const connection: any = {
    disconnect: () => {},
    sendMessage: () => console.error("WebSocket not yet initialized"),
  };

  setupSocket().then((ws) => {
    connection.disconnect = ws.disconnect;
    connection.sendMessage = ws.sendMessage;
  });

  return connection;
};
