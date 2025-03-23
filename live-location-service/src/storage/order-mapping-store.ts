import type { OrderMapping } from "../types";

// Interface for storage providers
export interface OrderMappingStorage {
  getOrderMapping(orderId: string): Promise<OrderMapping | null>;
  getOrdersByCustomer(customerId: string): Promise<OrderMapping[]>;
  getOrdersByDriver(driverId: string): Promise<OrderMapping[]>;
  saveOrderMapping(mapping: OrderMapping): Promise<void>;
  updateOrderStatus(
    orderId: string,
    status: OrderMapping["status"]
  ): Promise<void>;
  deleteOrderMapping(orderId: string): Promise<boolean>;
}

// In-memory implementation
export class InMemoryOrderMappingStore implements OrderMappingStorage {
  private mappings: Map<string, OrderMapping> = new Map();

  async getOrderMapping(orderId: string): Promise<OrderMapping | null> {
    return this.mappings.get(orderId) || null;
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderMapping[]> {
    return Array.from(this.mappings.values()).filter(
      (mapping) => mapping.customerId === customerId
    );
  }

  async getOrdersByDriver(driverId: string): Promise<OrderMapping[]> {
    return Array.from(this.mappings.values()).filter(
      (mapping) => mapping.driverId === driverId
    );
  }

  async saveOrderMapping(mapping: OrderMapping): Promise<void> {
    this.mappings.set(mapping.orderId, {
      ...mapping,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderMapping["status"]
  ): Promise<void> {
    const mapping = this.mappings.get(orderId);

    if (!mapping) {
      throw new Error(`Order mapping not found for order ID: ${orderId}`);
    }

    this.mappings.set(orderId, {
      ...mapping,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteOrderMapping(orderId: string): Promise<boolean> {
    return this.mappings.delete(orderId);
  }
}

// Factory function to create the appropriate storage implementation
export function createOrderMappingStore(
  type: "memory" | "redis" | "database",
  config?: any
): OrderMappingStorage {
  switch (type) {
    case "memory":
      return new InMemoryOrderMappingStore();
    // Additional implementations can be added here
    default:
      return new InMemoryOrderMappingStore();
  }
}
