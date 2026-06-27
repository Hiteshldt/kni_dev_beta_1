import * as Location from 'expo-location';

export type Coords = { lat: number; lng: number };

// Best-effort current position. Returns null if permission denied or it fails —
// the app stays usable (browse without proximity sorting, etc.).
export async function getCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
