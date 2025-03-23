import { WebSocketServer } from "./websocket/server";
import { KafkaProducer } from "./messaging/kafka-producer";
import { KafkaConsumer } from "./messaging/kafka-consumer";
import type {
  LiveLocationServiceConfig,
  Message,
  User,
  LocationData,
  OrderMapping,
  WebSocketEventHandlers,
} from "./types";
import {
  createMessage,
  createLocationUpdateMessage,
  createOrderAssignmentMessage,
} from "./utils/message-utils";
import type { IncomingMessage } from "http";
import {
  createOrderMappingStore,
  type OrderMappingStorage,
} from "./storage/order-mapping-store";
import type WebSocket from "ws";

export class LiveLocationService {
  private wsServer: WebSocketServer;
  private kafkaProducer?: KafkaProducer;
  private kafkaConsumer?: KafkaConsumer;
  private orderMappingStore: OrderMappingStorage;
  private config: LiveLocationServiceConfig;
  private isRunning = false;

  constructor(config: LiveLocationServiceConfig) {
    this.config = config;

    // Initialize order mapping storage
    this.orderMappingStore = createOrderMappingStore(
      config.storage?.type || "memory",
      config.storage?.config
    );

    // Create event handlers with proper adapter methods
    const eventHandlers: WebSocketEventHandlers = {
      onConnection: this.handleConnection.bind(this),
      onMessage: this.handleMessage.bind(this),
      onClose: this.handleClose.bind(this),
      onError: this.handleError.bind(this),
    };

    // Initialize WebSocket server with authentication if enabled
    this.wsServer = new WebSocketServer(
      config.websocket,
      eventHandlers,
      config.authentication?.enabled
        ? this.authenticateRequest.bind(this)
        : undefined
    );

    // Initialize Kafka producer if enabled
    if (config.enableKafka && config.kafka) {
      this.kafkaProducer = new KafkaProducer(config.kafka);
    }
  }

  // Start the service
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Connect to Kafka if enabled
      if (this.kafkaProducer) {
        await this.kafkaProducer.connect();

        // Initialize Kafka consumer for location updates if needed
        // This would typically be in a separate service, but included here for completeness
        if (this.config.enableKafka && this.config.kafka) {
          this.kafkaConsumer = new KafkaConsumer({
            ...this.config.kafka,
            groupId: `${this.config.kafka.clientId}-consumer`,
            topics: ["location-updates"],
          });

          this.kafkaConsumer.setMessageHandler(
            this.handleKafkaMessage.bind(this)
          );
          await this.kafkaConsumer.connect();
          await this.kafkaConsumer.startConsuming();
        }
      }

      this.isRunning = true;
      console.log("Live Location Service started successfully");
    } catch (error) {
      console.error("Failed to start Live Location Service:", error);
      await this.stop();
      throw error;
    }
  }

  // Stop the service
  async stop(): Promise<void> {
    try {
      if (this.kafkaConsumer) {
        await this.kafkaConsumer.disconnect();
      }

      if (this.kafkaProducer) {
        await this.kafkaProducer.disconnect();
      }

      this.wsServer.close();
      this.isRunning = false;
      console.log("Live Location Service stopped");
    } catch (error) {
      console.error("Error stopping Live Location Service:", error);
      throw error;
    }
  }

  // Assign a driver to an order
  async assignDriverToOrder(
    orderId: string,
    customerId: string,
    driverId: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      // Create order mapping
      const orderMapping: OrderMapping = {
        orderId,
        customerId,
        driverId,
        status: "ASSIGNED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to storage
      await this.orderMappingStore.saveOrderMapping(orderMapping);

      // Create assignment message
      const assignmentMessage = createOrderAssignmentMessage(
        orderId,
        customerId,
        driverId,
        details
      );

      // Send to both customer and driver
      this.wsServer.sendToUser(customerId, assignmentMessage);
      this.wsServer.sendToUser(driverId, assignmentMessage);

      // Send to Kafka if enabled
      if (this.kafkaProducer) {
        await this.kafkaProducer.sendMessage(
          assignmentMessage,
          "order-assignments",
          orderId
        );
      }

      console.log(
        `Driver ${driverId} assigned to order ${orderId} for customer ${customerId}`
      );
    } catch (error) {
      console.error("Error assigning driver to order:", error);
      throw error;
    }
  }

  // Update order status
  async updateOrderStatus(
    orderId: string,
    status: OrderMapping["status"],
    updatedBy: string
  ): Promise<void> {
    try {
      await this.orderMappingStore.updateOrderStatus(orderId, status);

      const orderMapping = await this.orderMappingStore.getOrderMapping(
        orderId
      );

      if (!orderMapping) {
        throw new Error(`Order mapping not found for order ID: ${orderId}`);
      }

      // Create status update message
      const statusMessage = createMessage({
        type: "SYSTEM",
        senderId: updatedBy,
        senderRole: "SYSTEM",
        orderId,
        payload: {
          status,
          timestamp: new Date().toISOString(),
        },
      });

      // Notify customer and driver
      this.wsServer.sendToUser(orderMapping.customerId, statusMessage);
      this.wsServer.sendToUser(orderMapping.driverId, statusMessage);

      console.log(
        `Order ${orderId} status updated to ${status} by ${updatedBy}`
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }

  // WebSocket event handlers
  private async handleConnection(
    ws: WebSocket,
    request: IncomingMessage,
    user: User
  ): Promise<void> {
    console.log(`User connected: ${user.id} (${user.role})`);

    // If user is a customer, subscribe them to their orders
    if (user.role === "CUSTOMER") {
      const customerOrders = await this.orderMappingStore.getOrdersByCustomer(
        user.id
      );

      for (const order of customerOrders) {
        // Subscribe to order-specific updates
        const orderTopic = `order:${order.orderId}`;
        const driverTopic = `driver:${order.driverId}`;

        // Send subscription message
        const subscriptionMessage = createMessage({
          type: "SUBSCRIPTION",
          senderId: "system",
          senderRole: "SYSTEM",
          recipientId: user.id,
          payload: {
            action: "subscribe",
            topics: [orderTopic, driverTopic],
          },
        });

        this.wsServer.sendToUser(user.id, subscriptionMessage);
      }
    }

    // If user is a driver, subscribe them to their assigned orders
    if (user.role === "DRIVER") {
      const driverOrders = await this.orderMappingStore.getOrdersByDriver(
        user.id
      );

      for (const order of driverOrders) {
        // Subscribe to order-specific updates
        const orderTopic = `order:${order.orderId}`;

        // Send subscription message
        const subscriptionMessage = createMessage({
          type: "SUBSCRIPTION",
          senderId: "system",
          senderRole: "SYSTEM",
          recipientId: user.id,
          payload: {
            action: "subscribe",
            topics: [orderTopic],
          },
        });

        this.wsServer.sendToUser(user.id, subscriptionMessage);
      }
    }
  }

  private async handleMessage(
    message: WebSocket.Data,
    ws: WebSocket,
    user: User
  ): Promise<void> {
    try {
      const messageStr = message.toString();
      const parsedMessage = JSON.parse(messageStr) as Message;

      // Handle location updates
      if (parsedMessage.type === "LOCATION_UPDATE") {
        await this.handleLocationUpdate(parsedMessage, user);
      }

      // Handle other message types as needed
      // ...
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  }

  private handleClose(
    ws: WebSocket,
    code: number,
    reason: string,
    user: User
  ): void {
    console.log(
      `User disconnected: ${user.id} (${user.role}), code: ${code}, reason: ${reason}`
    );
  }

  private handleError(ws: WebSocket, error: Error, user: User): void {
    console.error(`WebSocket error for user ${user.id}:`, error);
  }

  // Handle location updates from WebSocket
  private async handleLocationUpdate(
    message: Message,
    user: User
  ): Promise<void> {
    if (user.role !== "DRIVER") {
      console.warn(`Received location update from non-driver user: ${user.id}`);
      return;
    }

    const { orderId, payload } = message;

    if (!orderId || !payload || !payload.coordinates) {
      console.warn("Invalid location update message:", message);
      return;
    }

    try {
      // Get the order mapping
      const orderMapping = await this.orderMappingStore.getOrderMapping(
        orderId
      );

      if (!orderMapping) {
        console.warn(`No order mapping found for order ID: ${orderId}`);
        return;
      }

      // Verify the driver is assigned to this order
      if (orderMapping.driverId !== user.id) {
        console.warn(`Driver ${user.id} not authorized for order ${orderId}`);
        return;
      }

      // Create location data
      const locationData: LocationData = {
        userId: user.id,
        userRole: user.role,
        orderId,
        coordinates: payload.coordinates,
        timestamp: new Date().toISOString(),
        deviceTimestamp: payload.timestamp || Date.now(),
        metadata: payload.metadata,
      };

      // Send to Kafka if enabled
      if (this.kafkaProducer) {
        await this.kafkaProducer.sendMessage(
          locationData,
          "location-updates",
          orderId
        );
      }

      // Forward to the customer
      const locationMessage = createLocationUpdateMessage(
        user.id,
        user.role,
        payload.coordinates,
        orderId,
        payload.metadata
      );

      this.wsServer.sendToUser(orderMapping.customerId, locationMessage);

      console.log(
        `Location update from driver ${user.id} for order ${orderId} forwarded to customer ${orderMapping.customerId}`
      );
    } catch (error) {
      console.error("Error handling location update:", error);
    }
  }

  // Handle messages from Kafka
  private async handleKafkaMessage(
    topic: string,
    message: any,
    partition: number,
    offset: string
  ): Promise<void> {
    if (topic === "location-updates") {
      try {
        const locationData = message as LocationData;

        if (!locationData.orderId || !locationData.userId) {
          console.warn("Invalid location data from Kafka:", locationData);
          return;
        }

        // Get the order mapping
        const orderMapping = await this.orderMappingStore.getOrderMapping(
          locationData.orderId
        );

        if (!orderMapping) {
          console.warn(
            `No order mapping found for order ID: ${locationData.orderId}`
          );
          return;
        }

        // Create location message
        const locationMessage = createLocationUpdateMessage(
          locationData.userId,
          locationData.userRole,
          locationData.coordinates,
          locationData.orderId,
          locationData.metadata
        );

        // Forward to the customer
        this.wsServer.sendToUser(orderMapping.customerId, locationMessage);
      } catch (error) {
        console.error("Error handling Kafka location update:", error);
      }
    }
  }

  // Authentication handler
  private async authenticateRequest(
    request: IncomingMessage
  ): Promise<User | null> {
    if (
      !this.config.authentication?.enabled ||
      !this.config.authentication.verifyToken
    ) {
      // If authentication is disabled, create an anonymous user
      return {
        id: `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: "SYSTEM",
      };
    }

    try {
      // Get token from request
      const token = this.extractTokenFromRequest(request);

      if (!token) {
        console.warn("No authentication token provided");
        return null;
      }

      // Verify token
      const user = await this.config.authentication.verifyToken(token);
      return user;
    } catch (error) {
      console.error("Authentication error:", error);
      return null;
    }
  }

  // Extract token from request
  private extractTokenFromRequest(request: IncomingMessage): string | null {
    // Extract from query string
    const url = new URL(
      request.url || "",
      `http://${request.headers.host || "localhost"}`
    );
    const tokenFromQuery = url.searchParams.get("token");

    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    // Extract from Authorization header
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    return null;
  }

  // Public API methods

  // Send a message to a specific user
  sendToUser(userId: string, message: string | object): boolean {
    return this.wsServer.sendToUser(userId, message);
  }

  // Send a message to all users subscribed to a topic
  sendToTopic(topic: string, message: string | object): number {
    return this.wsServer.sendToTopic(topic, message);
  }

  // Broadcast a message to all connected users
  broadcast(message: string | object): number {
    return this.wsServer.broadcast(message);
  }

  // Get all connected users
  getConnectedUsers(): User[] {
    return this.wsServer.getConnectedUsers();
  }

  // Get connection count
  getConnectionCount(): number {
    return this.wsServer.getConnectionCount();
  }

  // Check if the service is running
  isServiceRunning(): boolean {
    return this.isRunning;
  }
}
