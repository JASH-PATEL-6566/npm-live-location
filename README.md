### From source

```shellscript
# Clone the repository
git clone https://github.com/your-username/npm-live-location.git
cd npm-live-location

# Install dependencies for both packages
npm install

# Build both packages
npm run build
```

## Usage Examples

### Client-side (Browser)

```javascript
import LiveLocation from 'live-location-client';

// Initialize the client
const locationTracker = new LiveLocation({
  wsUrl: 'wss://your-location-service.com/ws',
  updateInterval: 5000, // Send location updates every 5 seconds
  clientId: 'driver-123', // Unique identifier for this client
  
  // Event handlers
  onOpen: () => console.log('Connected to location service'),
  onMessage: (message) => console.log('Received message:', message.data),
  onLocationUpdate: (position) => {
    console.log('New position:', position.coords);
    // Update your UI with the new position
  },
  onLocationError: (error) => console.error('Location error:', error)
});

// Start tracking and sending location updates
locationTracker.startTracking();

// To stop tracking when needed
// locationTracker.stopTracking();

// To close the connection when done
// locationTracker.closeConnection();
```

### Server-side (Node.js)

```javascript
import { LiveLocationService } from 'live-location-service';

// Configure the service
const locationService = new LiveLocationService({
  websocket: {
    port: 8080,
    path: '/ws'
  },
  
  // Optional Kafka configuration
  enableKafka: true,
  kafka: {
    clientId: 'location-service',
    brokers: ['kafka:9092']
  },
  
  // Optional authentication
  authentication: {
    enabled: true,
    verifyToken: async (token) => {
      // Implement your token verification logic
      // Return a user object or null if invalid
      return { id: 'user-123', role: 'DRIVER' };
    }
  }
});

// Start the service
await locationService.start();

// Assign a driver to an order
await locationService.assignDriverToOrder(
  'order-123',
  'customer-456',
  'driver-789'
);

// Update order status
await locationService.updateOrderStatus(
  'order-123',
  'IN_PROGRESS',
  'driver-789'
);

// When shutting down
await locationService.stop();
```

## Complete Integration Example

Here's how to integrate both packages in a real-world application:

### Server-side (Node.js)

```javascript
import express from 'express';
import { LiveLocationService } from 'live-location-service';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(express.json());

// Initialize the location service
const locationService = new LiveLocationService({
  websocket: {
    port: 8080,
    path: '/ws'
  },
  authentication: {
    enabled: true,
    verifyToken: async (token) => {
      try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        return {
          id: decoded.userId,
          role: decoded.role
        };
      } catch (error) {
        console.error('Token verification failed:', error);
        return null;
      }
    }
  }
});

// Start the service
locationService.start()
  .then(() => {
    console.log('Location service started');
  })
  .catch(err => {
    console.error('Failed to start location service:', err);
    process.exit(1);
  });

// API endpoint to assign a driver to an order
app.post('/api/orders/:orderId/assign', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerId, driverId } = req.body;
    
    await locationService.assignDriverToOrder(orderId, customerId, driverId);
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await locationService.stop();
  process.exit(0);
});
```

### Client-side (Browser)

```javascript
import LiveLocation from 'live-location-client';

// Get authentication token from your auth system
const authToken = getAuthToken();
const userId = getUserId();
const orderId = getOrderId();

// Initialize the location client
const locationClient = new LiveLocation({
  wsUrl: `wss://your-domain.com/ws?token=${authToken}`,
  updateInterval: 10000, // 10 seconds
  clientId: userId,
  
  onOpen: () => {
    console.log('Connected to location service');
    
    // Send identification message
    locationClient.sendMessage({
      type: 'IDENTIFY',
      userId,
      role: 'DRIVER',
      orderId
    });
  },
  
  onMessage: (message) => {
    const data = JSON.parse(message.data);
    
    // Handle different message types
    switch (data.type) {
      case 'ORDER_ASSIGNMENT':
        showAssignmentNotification(data.payload);
        break;
      
      case 'SYSTEM':
        showSystemMessage(data.payload);
        break;
    }
  },
  
  onLocationUpdate: (position) => {
    // Update UI with current position
    updateMapPosition(position.coords);
    
    // Send location update with custom metadata
    locationClient.sendMessage({
      type: 'LOCATION_UPDATE',
      senderId: userId,
      senderRole: 'DRIVER',
      orderId,
      payload: {
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        },
        metadata: {
          batteryLevel: getBatteryLevel(),
          isMoving: isVehicleMoving()
        }
      }
    });
  }
});

// Start tracking when the delivery begins
function startDelivery() {
  locationClient.startTracking();
}

// Stop tracking when the delivery is complete
function completeDelivery() {
  locationClient.stopTracking();
}
```

## System Flow

The following diagram illustrates how the client and service packages interact in a typical location tracking scenario:

```plaintext
┌─────────────┐                ┌─────────────────┐                ┌─────────────┐
│  Driver App │                │ Location Service │                │ Customer App│
│             │                │                 │                │             │
└──────┬──────┘                └────────┬────────┘                └──────┬──────┘
       │                                │                                │
       │ Connect WebSocket              │                                │
       │────────────────────────────────>                                │
       │                                │                                │
       │                                │         Connect WebSocket      │
       │                                │<───────────────────────────────│
       │                                │                                │
       │ Start Location Tracking        │                                │
       │────────────────────────────────>                                │
       │                                │                                │
       │ Send Location Updates          │                                │
       │────────────────────────────────>                                │
       │                                │                                │
       │                                │    Forward Location Updates    │
       │                                │────────────────────────────────>
       │                                │                                │
       │                                │                                │
       │                                │                                │
       │                                ▼                                │
       │                         ┌─────────────┐                         │
       │                         │    Kafka    │                         │
       │                         │             │                         │
       │                         └─────────────┘                         │
       │                                                                 │
       │                                                                 │
```

## API Reference

### live-location-client

#### Constructor Options

| Option | Type | Required | Default | Description
|-----|-----|-----|-----|-----
| wsUrl | string | Yes | - | WebSocket server URL
| updateInterval | number | No | 5000 | Interval (ms) between location updates
| clientId | string | No | auto-generated | Unique identifier for this client
| highAccuracy | boolean | No | true | Use high accuracy for geolocation
| maximumAge | number | No | 0 | Maximum age (ms) of cached position
| timeout | number | No | 5000 | Timeout (ms) for position requests
| maxReconnectAttempts | number | No | 5 | Maximum reconnection attempts
| reconnectInterval | number | No | 3000 | Interval (ms) between reconnection attempts
| onOpen | function | No | - | Called when connection is established
| onMessage | function | No | - | Called when a message is received
| onError | function | No | - | Called when a WebSocket error occurs
| onClose | function | No | - | Called when connection is closed
| onLocationUpdate | function | No | - | Called when location is updated
| onLocationError | function | No | - | Called when location error occurs


#### Methods

| Method | Parameters | Return | Description
|-----|-----|-----|-----
| startTracking | - | LiveLocation | Starts tracking and sending location updates
| stopTracking | - | LiveLocation | Stops tracking and sending location updates
| sendMessage | message: any | boolean | Sends a custom message through WebSocket
| getLastPosition | - | GeolocationPosition | null | Returns the last known position
| isTrackingActive | - | boolean | Returns whether tracking is active
| isSocketConnected | - | boolean | Returns whether WebSocket is connected
| closeConnection | - | LiveLocation | Closes the WebSocket connection


### live-location-service

#### Constructor Options

| Option | Type | Required | Description
|-----|-----|-----|-----
| websocket | WebSocketConfig | Yes | WebSocket server configuration
| kafka | KafkaProducerConfig | No | Kafka configuration
| enableKafka | boolean | No | Enable Kafka integration
| authentication | AuthConfig | No | Authentication configuration
| storage | StorageConfig | No | Storage configuration
| logging | LoggingConfig | No | Logging configuration


#### Methods

| Method | Parameters | Return | Description
|-----|-----|-----|-----
| start | - | Promise<void> | Starts the service
| stop | - | Promise<void> | Stops the service
| assignDriverToOrder | orderId: string, customerId: string, driverId: string, details?: object | Promise<void> | Assigns a driver to an order
| updateOrderStatus | orderId: string, status: string, updatedBy: string | Promise<void> | Updates an order's status
| sendToUser | userId: string, message: string | object | boolean | Sends a message to a specific user
| sendToTopic | topic: string, message: string | object | number | Sends a message to users subscribed to a topic
| broadcast | message: string | object | number | Broadcasts a message to all connected users
| getConnectedUsers | - | User[] | Returns all connected users
| getConnectionCount | - | number | Returns the number of connected users
| isServiceRunning | - | boolean | Returns whether the service is running


## Development

### Project Structure

```plaintext
npm-live-location/
├── packages/
│   ├── live-location-client/
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── live-location-service/
│       ├── src/
│       ├── tsconfig.json
│       └── package.json
│
├── package.json
└── README.md
```

### Building the Packages

```shellscript
# Build all packages
npm run build

# Build specific package
npm run build --workspace=live-location-client
npm run build --workspace=live-location-service
```

### Running Tests

```shellscript
# Run all tests
npm test

# Test specific package
npm test --workspace=live-location-client
npm test --workspace=live-location-service
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

```plaintext

I've created a comprehensive README.md for your monorepo that covers both packages. This README provides:

1. An overview of both packages and their features
2. Installation instructions
3. Usage examples for both client and server
4. A complete integration example showing how they work together
5. A system flow diagram
6. Detailed API references for both packages
7. Development instructions for the monorepo structure

This documentation should give users a clear understanding of how to use both packages together in a real-world application. Let me know if you'd like any changes or additions to the README!
```
