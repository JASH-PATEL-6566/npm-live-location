import type {
  LiveLocationOptions,
  LocationData,
  BrowserCloseEvent,
  BrowserErrorEvent,
  BrowserMessageEvent,
} from "./types"

class LiveLocation {
  private ws!: WebSocket
  private updateInterval: number
  private wsUrl: string
  private watchId: number | null = null
  private intervalId: NodeJS.Timeout | null = null
  private lastPosition: GeolocationPosition | null = null
  private options: LiveLocationOptions
  private reconnectAttempts = 0
  private maxReconnectAttempts: number
  private reconnectInterval: number
  private clientId: string
  private isConnected = false
  private isTracking = false

  constructor(options: LiveLocationOptions) {
    this.wsUrl = options.wsUrl
    this.updateInterval = options.updateInterval || 5000
    this.options = options
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5
    this.reconnectInterval = options.reconnectInterval || 3000
    this.clientId = options.clientId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.initWebSocket()
  }

  private initWebSocket() {
    this.ws = new WebSocket(this.wsUrl)

    this.ws.onopen = () => {
      console.log("WebSocket Connected")
      this.isConnected = true
      this.reconnectAttempts = 0

      // Send client identification message
      this.ws.send(
        JSON.stringify({
          type: "IDENTIFY",
          clientId: this.clientId,
          clientType: "LOCATION_PROVIDER",
          timestamp: new Date().toISOString(),
        }),
      )

      this.options.onOpen?.()

      // If tracking was active before reconnection, restart it
      if (this.isTracking) {
        this.startTracking()
      }
    }

    this.ws.onmessage = (message: BrowserMessageEvent) => {
      console.log("WebSocket Message:", message.data)
      this.options.onMessage?.(message)
    }

    this.ws.onerror = (error: BrowserErrorEvent) => {
      console.error("WebSocket Error:", error)
      this.options.onError?.(error)
    }

    this.ws.onclose = (event: BrowserCloseEvent) => {
      console.log(`WebSocket Disconnected: ${event.code} ${event.reason}`)
      this.isConnected = false

      // Attempt to reconnect if not closed intentionally
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

        setTimeout(() => {
          this.initWebSocket()
        }, this.reconnectInterval)
      } else {
        console.error("Maximum reconnection attempts reached")
      }

      this.options.onClose?.(event)
    }
  }

  startTracking() {
    if (!navigator.geolocation) {
      const error = new Error("Geolocation is not supported by this browser.")
      console.error(error.message)
      this.options.onLocationError?.(error)
      return
    }

    this.isTracking = true

    // Clear any existing tracking
    this.stopTracking(false)

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.lastPosition = position
        this.options.onLocationUpdate?.(position)
      },
      (error) => {
        console.error("Error fetching location:", error)
        this.options.onLocationError?.(error)
      },
      {
        enableHighAccuracy: this.options.highAccuracy !== false,
        maximumAge: this.options.maximumAge || 0,
        timeout: this.options.timeout || 5000,
      },
    )

    // Set up interval to send location data
    this.intervalId = setInterval(() => {
      if (this.lastPosition && this.isConnected) {
        const locationData: LocationData = {
          type: "LOCATION_UPDATE",
          clientId: this.clientId,
          coords: {
            latitude: this.lastPosition.coords.latitude,
            longitude: this.lastPosition.coords.longitude,
            accuracy: this.lastPosition.coords.accuracy,
            altitude: this.lastPosition.coords.altitude,
            altitudeAccuracy: this.lastPosition.coords.altitudeAccuracy,
            heading: this.lastPosition.coords.heading,
            speed: this.lastPosition.coords.speed,
          },
          timestamp: new Date().toISOString(),
          deviceTimestamp: this.lastPosition.timestamp,
        }

        this.ws.send(JSON.stringify(locationData))
      }
    }, this.updateInterval)

    return this
  }

  stopTracking(resetIsTracking = true) {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }

    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    if (resetIsTracking) {
      this.isTracking = false
    }

    return this
  }

  // Send a custom message through the WebSocket
  sendMessage(message: any) {
    if (!this.isConnected) {
      console.warn("Cannot send message: WebSocket is not connected")
      return false
    }

    try {
      const messageStr = typeof message === "string" ? message : JSON.stringify(message)
      this.ws.send(messageStr)
      return true
    } catch (error) {
      console.error("Error sending message:", error)
      return false
    }
  }

  // Get the last known position
  getLastPosition() {
    return this.lastPosition
  }

  // Check if currently tracking
  isTrackingActive() {
    return this.isTracking
  }

  // Check if WebSocket is connected
  isSocketConnected() {
    return this.isConnected
  }

  // Close the WebSocket connection
  closeConnection() {
    this.stopTracking()
    this.ws.close(1000, "Client closed connection")
    return this
  }
}

export default LiveLocation

