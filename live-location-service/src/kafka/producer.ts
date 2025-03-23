import { Kafka } from "kafkajs";
import type { KafkaProducerConfig } from "../types";

class KafkaProducer {
  private kafka: Kafka;
  private producer: any;
  private topic: string | undefined;
  private partitionId?: number;
  private onConnect?: () => void;
  protected onDisconnect?: () => void;

  constructor(config: KafkaProducerConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
    });
    this.producer = this.kafka.producer();
    this.topic = config.topic;
    this.partitionId = config.partitionId;
    this.onDisconnect = config.onDisconnect;
    this.onConnect = config.onConnect;
  }

  // Send message to Kafka topic with optional partitioning
  async sendMessage(message: string) {
    try {
      const messagePayload = {
        value: message,
      };

      if (this.partitionId !== undefined) {
        // If partitionId is provided, send the message to the specific partition
        await this.producer.send({
          topic: this.topic,
          messages: [
            {
              value: message,
              partition: this.partitionId,
            },
          ],
        });
      } else {
        // Send message without partition specification (round-robin)
        await this.producer.send({
          topic: this.topic,
          messages: [messagePayload],
        });
      }
    } catch (error) {
      console.error("Error sending message to Kafka:", error);
    }
  }

  async connect() {
    if (this.onConnect) {
      this.onConnect();
    }
    await this.producer.connect();
  }

  async disconnect() {
    if (this.onDisconnect) {
      this.onDisconnect();
    }
    await this.producer.disconnect();
  }
}

export { KafkaProducer };
