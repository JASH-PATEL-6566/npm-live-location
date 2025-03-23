import type { IncomingMessage } from "http";
import type WebSocket from "ws";
import type { SASLOptions } from "kafkajs";

// User types
export type UserRole = "DRIVER" | "CUSTOMER" | "ADMIN" | "SYSTEM";

export interface User {
  id: string;
  role: UserRole;
  metadata?: Record<string, any>;
}

// WebSocket types
export interface WebSocketConfig {
  port: number;
  path?: string;
  ssl?: {
    key: string;
    cert: string;
  };
  pingInterval?: number;
  maxConnections?: number;
  // Use WebSocket.Data to match the actual type received in message events
  onConnection?: (ws: WebSocket) => void;
  onMessage?: (message: WebSocket.Data) => void;
  onError?: (error: Error) => void;
}

export interface WebSocketConnection {
  ws: WebSocket;
  user: User;
  lastActivity: number;
  subscriptions: Set<string>;
}

// Extended event handlers with more parameters
export interface WebSocketEventHandlers {
  onConnection?: (ws: WebSocket, request: IncomingMessage, user: User) => void;
  onMessage?: (message: WebSocket.Data, ws: WebSocket, user: User) => void;
  onClose?: (ws: WebSocket, code: number, reason: string, user: User) => void;
  onError?: (ws: WebSocket, error: Error, user: User) => void;
}

// Kafka types
export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  ssl?: boolean;
  // Use the KafkaJS SASLOptions type
  sasl?: SASLOptions;
}

export interface KafkaTopicConfig {
  topic: string;
  numPartitions?: number;
  replicationFactor?: number;
}

// Update the KafkaProducerConfig interface to include topic and partitionId
export interface KafkaProducerConfig extends KafkaConfig {
  defaultTopic?: string;
  topic?: string;
  partitionId?: number;
  acks?: number;
  timeout?: number;
  compression?: "none" | "gzip" | "snappy" | "lz4" | "zstd";
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface KafkaConsumerConfig extends KafkaConfig {
  groupId: string;
  topics: string[];
  fromBeginning?: boolean;
  autoCommit?: boolean;
  maxWaitTimeInMs?: number;
  maxBytesPerPartition?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSubscribe?: () => void;
}

// Location data types
export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface LocationData {
  userId: string;
  userRole: UserRole;
  orderId?: string;
  coordinates: Coordinates;
  timestamp: string;
  deviceTimestamp?: number;
  metadata?: Record<string, any>;
}

// Message types
export type MessageType =
  | "LOCATION_UPDATE"
  | "ORDER_ASSIGNMENT"
  | "SUBSCRIPTION"
  | "AUTHENTICATION"
  | "SYSTEM";

export interface Message {
  type: MessageType;
  senderId: string;
  senderRole: UserRole;
  recipientId?: string;
  recipientRole?: UserRole;
  orderId?: string;
  payload: any;
  timestamp: string;
}

// Order mapping types
export interface OrderMapping {
  orderId: string;
  customerId: string;
  driverId: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

// Service configuration
export interface LiveLocationServiceConfig {
  websocket: WebSocketConfig;
  kafka?: KafkaProducerConfig;
  enableKafka?: boolean;
  authentication?: {
    enabled: boolean;
    verifyToken: (token: string) => Promise<User | null>;
  };
  storage?: {
    type: "memory" | "redis" | "database";
    config?: any;
  };
  logging?: {
    level: "debug" | "info" | "warn" | "error";
    format?: "json" | "text";
  };
}
