import { LiveLocationOptions } from "./types";

class LiveLocation {
  private ws: WebSocket;
  private updateInterval: number;
  private wsUrl: string;
  private watchId: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private lastPosition: GeolocationPosition | null = null;
  private options: LiveLocationOptions;

  constructor(options: LiveLocationOptions) {
    this.wsUrl = options.wsUrl;
    this.updateInterval = options.updateInterval || 5000;
    this.options = options;
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket Connected");
      this.options.onOpen?.();
    };

    this.ws.onmessage = (message) => {
      console.log("WebSocket Message:", message.data);
      this.options.onMessage?.(message);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
      this.options.onError?.(error);
    };

    this.ws.onclose = () => {
      console.log("WebSocket Disconnected");
      this.options.onClose?.();
    };
  }

  startTracking() {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.lastPosition = position;
      },
      (error) => console.error("Error fetching location:", error),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    this.intervalId = setInterval(() => {
      if (this.lastPosition) {
        const locationData = this.lastPosition;
        this.ws.send(JSON.stringify(locationData));
      }
    }, this.updateInterval);
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  closeConnection() {
    this.ws.close();
  }
}

export default LiveLocation;
