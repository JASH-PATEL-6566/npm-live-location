import * as http from "http";
import * as https from "https";
import { readFileSync } from "fs";
import WebSocket from "ws";
import type {
  WebSocketConfig,
  WebSocketEventHandlers,
  User,
  WebSocketConnection,
  Message,
} from "../types";
import { parseMessage, createMessage } from "../utils/message-utils";

export class WebSocketServer {
  private server: WebSocket.Server;
  private httpServer: http.Server | https.Server;
  private connections: Map<string, WebSocketConnection> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private eventHandlers: WebSocketEventHandlers;
  private authenticationHandler?: (
    request: http.IncomingMessage
  ) => Promise<User | null>;
  private config: WebSocketConfig;

  constructor(
    config: WebSocketConfig,
    eventHandlers: WebSocketEventHandlers = {},
    authHandler?: (request: http.IncomingMessage) => Promise<User | null>
  ) {
    this.eventHandlers = eventHandlers;
    this.authenticationHandler = authHandler;
    this.config = config;

    // Create HTTP/HTTPS server
    if (config.ssl) {
      const sslOptions = {
        key: readFileSync(config.ssl.key),
        cert: readFileSync(config.ssl.cert),
      };
      this.httpServer = https.createServer(sslOptions);
    } else {
      this.httpServer = http.createServer();
    }

    // Create WebSocket server
    this.server = new WebSocket.Server({
      server: this.httpServer,
      path: config.path,
      maxPayload: 1024 * 1024, // 1MB max message size
    });

    // Set up event listeners
    this.setupEventListeners();

    // Start HTTP server
    this.httpServer.listen(config.port, () => {
      console.log(`WebSocket server listening on port ${config.port}`);
    });

    // Set up ping interval to keep connections alive and detect stale connections
    if (config.pingInterval) {
      this.pingInterval = setInterval(() => {
        this.pingConnections();
      }, config.pingInterval);
    }
  }

  private setupEventListeners() {
    this.server.on(
      "connection",
      async (ws: WebSocket, request: http.IncomingMessage) => {
        try {
          // Authenticate the connection if handler is provided
          let user: User;

          if (this.authenticationHandler) {
            const authenticatedUser = await this.authenticationHandler(request);
            if (!authenticatedUser) {
              ws.close(4001, "Authentication failed");
              return;
            }
            user = authenticatedUser;
          } else {
            // Default anonymous user if no authentication
            user = {
              id: `anon_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 9)}`,
              role: "SYSTEM",
            };
          }

          // Store the connection
          const connection: WebSocketConnection = {
            ws,
            user,
            lastActivity: Date.now(),
            subscriptions: new Set(),
          };

          this.connections.set(user.id, connection);

          // Set up message handler
          ws.on("message", (data: WebSocket.Data) => {
            connection.lastActivity = Date.now();

            try {
              const parsedMessage = parseMessage(data.toString());

              // Call the message handler if provided
              if (this.eventHandlers.onMessage) {
                this.eventHandlers.onMessage(data, ws, user);
              }

              // Call the original config handler if provided
              if (this.config.onMessage) {
                this.config.onMessage(data);
              }

              // Handle subscription messages internally
              if (parsedMessage.type === "SUBSCRIPTION") {
                this.handleSubscription(parsedMessage, connection);
              }
            } catch (error) {
              console.error("Error processing message:", error);
            }
          });

          // Set up close handler
          ws.on("close", (code: number, reason: string) => {
            this.connections.delete(user.id);

            if (this.eventHandlers.onClose) {
              this.eventHandlers.onClose(ws, code, reason, user);
            }
          });

          // Set up error handler
          ws.on("error", (error: Error) => {
            if (this.eventHandlers.onError) {
              this.eventHandlers.onError(ws, error, user);
            }

            // Call the original config handler if provided
            if (this.config.onError) {
              this.config.onError(error);
            }
          });

          // Call the connection handler if provided
          if (this.eventHandlers.onConnection) {
            this.eventHandlers.onConnection(ws, request, user);
          }

          // Call the original config handler if provided
          if (this.config.onConnection) {
            this.config.onConnection(ws);
          }

          // Send welcome message
          ws.send(
            JSON.stringify(
              createMessage({
                type: "SYSTEM",
                senderId: "system",
                senderRole: "SYSTEM",
                recipientId: user.id,
                payload: {
                  message: "Connected successfully",
                  userId: user.id,
                  role: user.role,
                },
              })
            )
          );
        } catch (error) {
          console.error("Error handling connection:", error);
          ws.close(1011, "Internal server error");
        }
      }
    );
  }

  private handleSubscription(
    message: Message,
    connection: WebSocketConnection
  ) {
    if (message.type !== "SUBSCRIPTION" || !message.payload) return;

    const { action, topics } = message.payload;

    if (!Array.isArray(topics)) return;

    if (action === "subscribe") {
      topics.forEach((topic) => connection.subscriptions.add(topic));
    } else if (action === "unsubscribe") {
      topics.forEach((topic) => connection.subscriptions.delete(topic));
    }
  }

  private pingConnections() {
    const now = Date.now();

    this.connections.forEach((connection, userId) => {
      const { ws, lastActivity } = connection;

      // Check if connection is stale (no activity for 2 minutes)
      if (now - lastActivity > 2 * 60 * 1000) {
        console.log(`Closing stale connection for user ${userId}`);
        ws.close(1000, "Connection timeout due to inactivity");
        this.connections.delete(userId);
        return;
      }

      // Send ping if connection is alive
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }

  // Send message to a specific user
  sendToUser(userId: string, message: string | object): boolean {
    const connection = this.connections.get(userId);

    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const messageStr =
        typeof message === "string" ? message : JSON.stringify(message);
      connection.ws.send(messageStr);
      return true;
    } catch (error) {
      console.error(`Error sending message to user ${userId}:`, error);
      return false;
    }
  }

  // Send message to users subscribed to a topic
  sendToTopic(topic: string, message: string | object): number {
    const messageStr =
      typeof message === "string" ? message : JSON.stringify(message);
    let sentCount = 0;

    this.connections.forEach((connection) => {
      if (
        connection.subscriptions.has(topic) &&
        connection.ws.readyState === WebSocket.OPEN
      ) {
        connection.ws.send(messageStr);
        sentCount++;
      }
    });

    return sentCount;
  }

  // Send message to all connected users
  broadcast(message: string | object): number {
    const messageStr =
      typeof message === "string" ? message : JSON.stringify(message);
    let sentCount = 0;

    this.connections.forEach((connection) => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(messageStr);
        sentCount++;
      }
    });

    return sentCount;
  }

  // Get all connected users
  getConnectedUsers(): User[] {
    return Array.from(this.connections.values()).map(
      (connection) => connection.user
    );
  }

  // Get connection count
  getConnectionCount(): number {
    return this.connections.size;
  }

  // Close the server
  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all connections
    this.connections.forEach((connection) => {
      connection.ws.close(1000, "Server shutting down");
    });

    // Close the server
    this.server.close();
    this.httpServer.close();

    console.log("WebSocket server closed");
  }
}
