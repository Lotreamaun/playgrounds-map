const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function distanceHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

export function sortByDistance<T extends { latitude: number; longitude: number }>(
  items: T[],
  latitude: number,
  longitude: number,
): T[] {
  return [...items].sort(
    (a, b) =>
      distanceHaversine(latitude, longitude, a.latitude, a.longitude) -
      distanceHaversine(latitude, longitude, b.latitude, b.longitude),
  )
}
