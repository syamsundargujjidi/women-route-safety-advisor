
export interface Coordinate {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

export interface RouteInfo {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  safetyScore: number;
  index: number;
  pois: POI[];
}

export interface POI {
  id: string;
  lat: number;
  lng: number;
  type: 'police' | 'street_light' | 'crowded_place' | 'hospital';
  name?: string;
}

export interface HistoryItem {
  id: string;
  source: string;
  destination: string;
  safetyScore: number;
  timestamp: number;
}

export interface SOSAlert {
  id: string;
  lat: number;
  lng: number;
  timestamp: number;
  status: 'active' | 'resolved';
}

export interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
}

export interface UserProfile {
  name: string;
  userPhone: string;
  emergencyNumber: string;
  isPermissionGranted: boolean;
  hasOnboarded: boolean;
}
