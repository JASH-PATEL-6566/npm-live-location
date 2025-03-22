# Live Location Client

The `live-location-client` is a simple and configurable library for sending real-time live location data from the user's device to a server via WebSocket. This package is intended for frontend usage in web applications, enabling the client to send live GPS coordinates to a backend.

## Installation

To install the package, run:

```bash
npm install live-location-client
```


## Usage

### 1. Importing the Client

First, import the `LiveLocationClient` class in your JavaScript or TypeScript code:

```javascript
import LiveLocationClient from "live-location-client";
```

### 2. Initialize the Client

Create an instance of the `LiveLocationClient` by providing your WebSocket server URL. You can also set the update interval for sending location data.

```javascript
const locationClient = new LiveLocationClient({
  websocketUrl: "ws://your-websocket-url",
  updateInterval: 5000, // Default: 5000ms (5 seconds)
});
```

### 3. Handling Events

You can configure handlers for different WebSocket events. For example, you can listen for a successful connection, handle errors, and log location updates.

#### Events:

- **onConnect**: Fired when the WebSocket connection is successfully established.
- **onError**: Fired when there is an error with the WebSocket connection.
- **onLocationUpdate**: Fired when the location data is successfully sent to the server.

Example of event handling:

```javascript
locationClient.onConnect(() => {
  console.log("Successfully connected to the WebSocket server.");
});

locationClient.onError((error) => {
  console.error("Error occurred:", error);
});

locationClient.onLocationUpdate((locationData) => {
  console.log("Location sent:", locationData);
});
```

### 4. Start Sending Location

Once the client is initialized and event handlers are set up, you can start sending live location data. The client will automatically fetch the user's GPS coordinates and send them at the specified interval.

```javascript
locationClient.start();
```

### 5. Stop Sending Location

You can stop sending location updates by calling the `stop` method:

```javascript
locationClient.stop();
```

### 6. Customizing the Client

You can also configure other settings such as the `updateInterval` (in milliseconds), and WebSocket URL. The client will use the default settings unless specified otherwise.

Example of custom settings:

```javascript
const locationClient = new LiveLocationClient({
  websocketUrl: "ws://your-custom-websocket-url",
  updateInterval: 10000, // Send location every 10 seconds
});
```

## Example Usage

Here is a full example of how to integrate and use `live-location-client` in a web application:

```javascript
import LiveLocationClient from "live-location-client";

// Initialize the client with the WebSocket URL and update interval
const locationClient = new LiveLocationClient({
  websocketUrl: "ws://your-websocket-url", // Replace with your WebSocket server URL
  updateInterval: 5000, // Send location every 5 seconds
});

// Setup event listeners
locationClient.onConnect(() => {
  console.log("Successfully connected to the WebSocket server.");
});

locationClient.onError((error) => {
  console.error("Error occurred:", error);
});

locationClient.onLocationUpdate((locationData) => {
  console.log("Location data sent:", locationData);
});

// Start sending live location
locationClient.start();

// If you want to stop sending the location after some time, you can use stop():
setTimeout(() => {
  locationClient.stop();
  console.log("Stopped sending location updates.");
}, 30000); // Stop after 30 seconds
```

### Explanation:

- The `locationClient.start()` method starts sending the user's live location every 5 seconds (or whatever interval you set).
- The `locationClient.stop()` method can be called to stop sending location updates.
- The WebSocket connection sends the location data as a JSON object with latitude, longitude, and timestamp.
- Event handlers (`onConnect`, `onError`, `onLocationUpdate`) allow you to handle the connection status, errors, and successful data sends.

## Configuration Options

- `websocketUrl`: **Required** — The URL of the WebSocket server to send location updates to.
- `updateInterval`: **Optional** — The time interval (in milliseconds) at which location data will be sent to the server. Default is `5000ms` (5 seconds).

## Example Project

For a full example of how to integrate the `live-location-client` into a web project, visit the [example project repo](https://github.com/your-username/live-location-example).

## License

This package is licensed under the MIT License.

## Contributing

Feel free to open issues or pull requests for bug fixes, features, or improvements.

## Contact

For any questions, you can reach out to [pateljash1511@gmail.com](mailto:pateljash1511@gmail.com).



### Key Additions:

- **Example Usage**: Provides a full example to show how to use the package in a web application.
- **Code Walkthrough**: Each part of the code example is explained in simple terms to make it easy for users to understand the flow.

Make sure to replace `ws://your-websocket-url` with your actual WebSocket URL and update any placeholders as per your specific project needs.