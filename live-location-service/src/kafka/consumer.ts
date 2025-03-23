import { Kafka, type Consumer, type EachMessagePayload } from "kafkajs";
import type { KafkaConsumerConfig } from "../types";

class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private topics: string[]; // Changed from single topic to array of topics
  private groupId: string;
  private onDisconnect?: () => void;
  private onConnect?: () => void;
  private onSubscribe?: () => void;
  private messageHandler?: (message: any) => void;

  constructor(config: KafkaConsumerConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl,
    });
    this.consumer = this.kafka.consumer({ groupId: config.groupId });
    this.topics = config.topics; // Use the topics array from config
    this.groupId = config.groupId;
    this.onDisconnect = config.onDisconnect;
    this.onConnect = config.onConnect;
    this.onSubscribe = config.onSubscribe;
  }

  async connect() {
    try {
      await this.consumer.connect();
      console.log(`Kafka consumer connected (group: ${this.groupId})`);
      if (this.onConnect) {
        this.onConnect();
      }
    } catch (error) {
      console.error("Failed to connect Kafka consumer:", error);
      throw error;
    }
  }

  // Subscribe to Kafka topics
  async subscribe() {
    try {
      // Subscribe to each topic in the array
      for (const topic of this.topics) {
        await this.consumer.subscribe({
          topic, // Now correctly passing a single string
          fromBeginning: false,
        });
        console.log(`Subscribed to topic: ${topic}`);
      }

      if (this.onSubscribe) {
        this.onSubscribe();
      }
    } catch (error) {
      console.error(
        `Failed to subscribe to topics: ${this.topics.join(", ")}`,
        error
      );
      throw error;
    }
  }

  // Set a custom message handler
  setMessageHandler(handler: (message: any) => void) {
    this.messageHandler = handler;
  }

  // Run the consumer to process incoming messages
  async consumeMessages() {
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
              const parsedMessage = JSON.parse(value);
              this.messageHandler(parsedMessage);
            } catch (e) {
              console.error("Error parsing message:", e);
              // Still call handler with raw message if parsing fails
              this.messageHandler(value);
            }
          }
          // No return statement - void return type
        },
      });
      console.log(`Consumer started for topics: ${this.topics.join(", ")}`);
    } catch (error) {
      console.error("Error running consumer:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.consumer.disconnect();
      console.log("Kafka consumer disconnected");
      if (this.onDisconnect) {
        this.onDisconnect();
      }
    } catch (error) {
      console.error("Error disconnecting consumer:", error);
      throw error;
    }
  }
}

export { KafkaConsumer };
