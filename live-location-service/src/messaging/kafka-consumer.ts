import { Kafka, type Consumer, type EachMessagePayload } from "kafkajs";
import type { KafkaConsumerConfig } from "../types";

export class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private config: KafkaConsumerConfig;
  private isConnected = false;
  private messageHandler?: (
    topic: string,
    message: any,
    partition: number,
    offset: string
  ) => void;

  constructor(config: KafkaConsumerConfig) {
    this.config = config;

    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl,
    });

    // Initialize consumer
    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      maxWaitTimeInMs: config.maxWaitTimeInMs || 5000,
      maxBytes: config.maxBytesPerPartition || 1048576, // 1MB default
    });
  }

  // Connect to Kafka and subscribe to topics
  async connect(): Promise<void> {
    try {
      await this.consumer.connect();

      // Subscribe to all configured topics
      for (const topic of this.config.topics) {
        await this.consumer.subscribe({
          topic,
          fromBeginning: this.config.fromBeginning || false,
        });
      }

      this.isConnected = true;
      console.log(
        `Kafka consumer connected and subscribed to topics: ${this.config.topics.join(
          ", "
        )}`
      );

      if (this.config.onConnect) {
        this.config.onConnect();
      }

      if (this.config.onSubscribe) {
        this.config.onSubscribe();
      }
    } catch (error) {
      console.error("Failed to connect Kafka consumer:", error);
      throw error;
    }
  }

  // Set message handler
  setMessageHandler(
    handler: (
      topic: string,
      message: any,
      partition: number,
      offset: string
    ) => void
  ): void {
    this.messageHandler = handler;
  }

  // Start consuming messages
  async startConsuming(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Kafka consumer not connected");
    }

    try {
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, partition, message } = payload;
          const value = message.value?.toString();

          console.log(
            `Received message from topic ${topic} [partition: ${partition}]`
          );

          if (value && this.messageHandler) {
            try {
              const parsedValue = JSON.parse(value);
              this.messageHandler(
                topic,
                parsedValue,
                partition,
                message.offset
              );
            } catch (error) {
              // Still call handler with raw message if parsing fails
              this.messageHandler(topic, value, partition, message.offset);
            }
          }

          // No return value - void return type
        },
        autoCommit: this.config.autoCommit !== false,
      });

      console.log("Kafka consumer started");
    } catch (error) {
      console.error("Error starting Kafka consumer:", error);
      throw error;
    }
  }

  // Pause consumption for specific topics
  async pauseTopics(topics: string[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Kafka consumer not connected");
    }

    try {
      await this.consumer.pause(topics.map((topic) => ({ topic })));
      console.log(`Paused consumption for topics: ${topics.join(", ")}`);
    } catch (error) {
      console.error("Error pausing topics:", error);
      throw error;
    }
  }

  // Resume consumption for specific topics
  async resumeTopics(topics: string[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Kafka consumer not connected");
    }

    try {
      await this.consumer.resume(topics.map((topic) => ({ topic })));
      console.log(`Resumed consumption for topics: ${topics.join(", ")}`);
    } catch (error) {
      console.error("Error resuming topics:", error);
      throw error;
    }
  }

  // Disconnect from Kafka
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.consumer.disconnect();
        this.isConnected = false;
        console.log("Kafka consumer disconnected");

        if (this.config.onDisconnect) {
          this.config.onDisconnect();
        }
      } catch (error) {
        console.error("Error disconnecting Kafka consumer:", error);
        throw error;
      }
    }
  }

  // Check if consumer is connected
  isConsumerConnected(): boolean {
    return this.isConnected;
  }

  // Get subscribed topics
  getSubscribedTopics(): string[] {
    return [...this.config.topics];
  }
}
