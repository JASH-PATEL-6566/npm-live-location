import {
  Kafka,
  type Producer,
  CompressionTypes,
  type Message as KafkaMessage,
} from "kafkajs";
import type { KafkaProducerConfig } from "../types";

export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private config: KafkaProducerConfig;
  private isConnected = false;

  constructor(config: KafkaProducerConfig) {
    this.config = config;

    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl,
    });

    // Initialize producer
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: config.timeout || 30000,
    });
  }

  // Connect to Kafka
  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log("Kafka producer connected");

      if (this.config.onConnect) {
        this.config.onConnect();
      }
    } catch (error) {
      console.error("Failed to connect Kafka producer:", error);
      throw error;
    }
  }

  // Send a message to a topic
  async sendMessage(
    message: string | object,
    topic?: string,
    key?: string,
    partition?: number
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Kafka producer not connected");
    }

    const targetTopic = topic || this.config.defaultTopic;

    if (!targetTopic) {
      throw new Error("No topic specified and no default topic configured");
    }

    try {
      const messageValue =
        typeof message === "string" ? message : JSON.stringify(message);

      const kafkaMessage: KafkaMessage = {
        value: messageValue,
      };

      if (key) {
        kafkaMessage.key = key;
      }

      const record: any = {
        topic: targetTopic,
        messages: [kafkaMessage],
      };

      if (partition !== undefined) {
        record.partition = partition;
      }

      await this.producer.send({
        ...record,
        acks: this.config.acks || -1, // -1 = all replicas must acknowledge
        timeout: this.config.timeout || 30000,
        compression: this.getCompressionType(),
      });
    } catch (error) {
      console.error(
        `Error sending message to Kafka topic ${targetTopic}:`,
        error
      );
      throw error;
    }
  }

  // Send a batch of messages to a topic
  async sendBatch(
    messages: Array<{ value: string | object; key?: string }>,
    topic?: string
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Kafka producer not connected");
    }

    const targetTopic = topic || this.config.defaultTopic;

    if (!targetTopic) {
      throw new Error("No topic specified and no default topic configured");
    }

    try {
      const kafkaMessages = messages.map((msg) => ({
        key: msg.key,
        value:
          typeof msg.value === "string" ? msg.value : JSON.stringify(msg.value),
      }));

      await this.producer.send({
        topic: targetTopic,
        messages: kafkaMessages,
        acks: this.config.acks || -1,
        timeout: this.config.timeout || 30000,
        compression: this.getCompressionType(),
      });
    } catch (error) {
      console.error(
        `Error sending batch to Kafka topic ${targetTopic}:`,
        error
      );
      throw error;
    }
  }

  // Helper to get compression type
  private getCompressionType(): CompressionTypes {
    switch (this.config.compression) {
      case "gzip":
        return CompressionTypes.GZIP;
      case "snappy":
        return CompressionTypes.Snappy;
      case "lz4":
        return CompressionTypes.LZ4;
      case "zstd":
        return CompressionTypes.ZSTD;
      default:
        return CompressionTypes.None;
    }
  }

  // Disconnect from Kafka
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.producer.disconnect();
        this.isConnected = false;
        console.log("Kafka producer disconnected");

        if (this.config.onDisconnect) {
          this.config.onDisconnect();
        }
      } catch (error) {
        console.error("Error disconnecting Kafka producer:", error);
        throw error;
      }
    }
  }

  // Check if producer is connected
  isProducerConnected(): boolean {
    return this.isConnected;
  }
}
