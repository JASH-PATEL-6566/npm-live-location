import type { Message, UserRole } from "../types";

// Create a new message with default values
export function createMessage(params: Partial<Message>): Message {
  return {
    type: params.type || "SYSTEM",
    senderId: params.senderId || "system",
    senderRole: params.senderRole || "SYSTEM",
    recipientId: params.recipientId,
    recipientRole: params.recipientRole,
    orderId: params.orderId,
    payload: params.payload || {},
    timestamp: params.timestamp || new Date().toISOString(),
  };
}

// Parse a message from string
export function parseMessage(messageStr: string): Message {
  try {
    const parsed = JSON.parse(messageStr);

    // Validate required fields
    if (!parsed.type || !parsed.senderId || !parsed.senderRole) {
      throw new Error("Invalid message format: missing required fields");
    }

    return parsed as Message;
  } catch (error) {
    throw new Error(`Failed to parse message: ${error}`);
  }
}

// Create a location update message
export function createLocationUpdateMessage(
  senderId: string,
  senderRole: UserRole,
  coordinates: { latitude: number; longitude: number; [key: string]: any },
  orderId?: string,
  metadata?: Record<string, any>
): Message {
  return createMessage({
    type: "LOCATION_UPDATE",
    senderId,
    senderRole,
    orderId,
    payload: {
      coordinates,
      timestamp: new Date().toISOString(),
      metadata,
    },
  });
}

// Create an order assignment message
export function createOrderAssignmentMessage(
  orderId: string,
  customerId: string,
  driverId: string,
  details?: Record<string, any>
): Message {
  return createMessage({
    type: "ORDER_ASSIGNMENT",
    senderId: "system",
    senderRole: "SYSTEM",
    orderId,
    payload: {
      orderId,
      customerId,
      driverId,
      status: "ASSIGNED",
      timestamp: new Date().toISOString(),
      details,
    },
  });
}

// Create a subscription message
export function createSubscriptionMessage(
  userId: string,
  userRole: UserRole,
  action: "subscribe" | "unsubscribe",
  topics: string[]
): Message {
  return createMessage({
    type: "SUBSCRIPTION",
    senderId: userId,
    senderRole: userRole,
    payload: {
      action,
      topics,
    },
  });
}
