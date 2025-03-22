# Live Location Service & Client

This repository contains two main components:

1. **[`live-location-client`](live-location-client/)**: A client-side library that helps send live location data from the user's device to a WebSocket server.
2. **[`live-location-service`](live-location-service/)**: A backend service to produce and consume location data using Kafka, and handle WebSocket communication for location updates.

Both components work together to provide real-time location tracking and communication, allowing you to send location data from users to your backend service.

## Repository Structure

```
live-location/
│── live-location-client/      # Frontend package for sending location updates via WebSocket
│   ├── src/
│   ├── package.json
│   ├── README.md
│── live-location-service/     # Backend service to handle Kafka messages and WebSocket connections
│   ├── src/
│   ├── package.json
│   ├── README.md
│── README.md                  # This file
```

## Components

### 1. `live-location-client`

The `live-location-client` is a simple frontend library to send real-time location data to a WebSocket server.

- It collects the user's GPS coordinates and sends them to the specified WebSocket server at regular intervals.
- It is configurable, allowing you to set a custom WebSocket server URL and update interval.
- It supports handling connection events, errors, and location update events.

**Key Features:**

- Send live location updates via WebSocket.
- Handle connection and error events.
- Set custom update intervals.

#### Installation

To install the client package in your project:

```bash
npm install live-location-client
```

For more details on usage, please refer to the [live-location-client README](live-location-client/README.md).

---

### 2. `live-location-service`

The `live-location-service` is a backend service that:

- Connects to a WebSocket server to receive location data.
- Produces and consumes messages using Kafka to handle location updates in a distributed system.

**Key Features:**

- WebSocket server to receive location updates.
- Kafka producer and consumer to process incoming location data.

#### Installation

To install the service package in your backend project:

```bash
npm install live-location-service
```

For more details on usage and deployment, please refer to the [live-location-service README](live-location-service/README.md).

---

## Usage

### How the System Works

1. **Client Side**:
   - The `live-location-client` is included in the frontend project, where it connects to a WebSocket server and sends real-time location updates at regular intervals (default: every 5 seconds).
2. **Backend Side**:
   - The `live-location-service` contains a WebSocket server that listens for incoming location data.
   - It processes the incoming data by sending it to Kafka, and can consume messages to further process or store the location information.

### Example Workflow

1. The frontend (using `live-location-client`) sends real-time location data every 5 seconds.
2. The backend (using `live-location-service`) listens to the WebSocket server, consumes the data, and processes it via Kafka.

---

## Configuration

- **WebSocket Server URL**: Both the client and service are configurable with the WebSocket server URL. Make sure to configure the WebSocket server properly.
- **Kafka**: The `live-location-service` connects to Kafka for message production and consumption. Set up Kafka appropriately.

---

## Deployment

1. **Client**: Once you're ready to use the client package, include it in your frontend project by following the instructions in the `live-location-client` README.
2. **Service**: For the backend service, install the `live-location-service` in your server-side project and configure it with the appropriate Kafka and WebSocket settings.

---

## License

This repository is licensed under the MIT License.

---

## Contributing

Feel free to open issues or pull requests for bug fixes, features, or improvements for both the client and service.

---

## Contact

For any questions or suggestions, feel free to reach out to [pateljash1511@gmail.com](mailto:pateljash1511@gmail.com).

### Key Sections:

- **Repository Structure**: Provides an overview of the folder structure, including both the `live-location-client` and `live-location-service` directories.
- **Components**: Describes the functionality of both the client and service, pointing to their individual README files for more details.
- **Usage**: Explains how the client and service work together in the system.
- **Configuration**: Notes that both the client and service are configurable (e.g., WebSocket URL, Kafka setup).
- **Deployment**: Provides guidance on deploying the client and service in their respective environments.
