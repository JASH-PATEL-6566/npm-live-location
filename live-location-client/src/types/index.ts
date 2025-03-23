// Define browser-compatible WebSocket event types
export type BrowserMessageEvent = MessageEvent
export type BrowserCloseEvent = CloseEvent
export type BrowserErrorEvent = Event

export type LiveLocationOptions = {
  wsUrl: string
  updateInterval?: number
  clientId?: string
  highAccuracy?: boolean
  maximumAge?: number
  timeout?: number
  maxReconnectAttempts?: number
  reconnectInterval?: number
  onOpen?: () => void
  onMessage?: (message: BrowserMessageEvent) => void
  onError?: (error: BrowserErrorEvent) => void
  onClose?: (event: BrowserCloseEvent) => void
  onLocationUpdate?: (position: GeolocationPosition) => void
  onLocationError?: (error: GeolocationPositionError | Error) => void
}

export interface LocationData {
  type: string
  clientId: string
  coords: {
    latitude: number
    longitude: number
    accuracy: number
    altitude: number | null
    altitudeAccuracy: number | null
    heading: number | null
    speed: number | null
  }
  timestamp: string
  deviceTimestamp: number
  [key: string]: any // Allow additional properties
}

export interface LocationMessage {
  type: string
  data: LocationData
  [key: string]: any
}

