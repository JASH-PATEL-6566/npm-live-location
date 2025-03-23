import type { Coordinates } from "../types"

// Calculate distance between two coordinates in kilometers using the Haversine formula
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude)
  const dLon = toRadians(coord2.longitude - coord1.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

// Convert degrees to radians
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Calculate bearing between two coordinates in degrees
export function calculateBearing(coord1: Coordinates, coord2: Coordinates): number {
  const startLat = toRadians(coord1.latitude)
  const startLng = toRadians(coord1.longitude)
  const destLat = toRadians(coord2.latitude)
  const destLng = toRadians(coord2.longitude)

  const y = Math.sin(destLng - startLng) * Math.cos(destLat)
  const x =
    Math.cos(startLat) * Math.sin(destLat) - Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng)

  let bearing = Math.atan2(y, x)
  bearing = toDegrees(bearing)
  bearing = (bearing + 360) % 360

  return bearing
}

// Convert radians to degrees
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

// Estimate time of arrival based on current position, destination, and speed
export function estimateTimeOfArrival(
  currentPosition: Coordinates,
  destination: Coordinates,
  speedKmh: number,
): number {
  if (!speedKmh || speedKmh <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const distanceKm = calculateDistance(currentPosition, destination)
  const timeHours = distanceKm / speedKmh

  return timeHours * 60 * 60 * 1000 // Convert to milliseconds
}

// Check if a coordinate is within a radius of another coordinate
export function isWithinRadius(center: Coordinates, point: Coordinates, radiusKm: number): boolean {
  const distance = calculateDistance(center, point)
  return distance <= radiusKm
}

// Format coordinates for display
export function formatCoordinates(coordinates: Coordinates): string {
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
}

