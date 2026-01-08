
export const DEFAULT_CENTER: [number, number] = [16.5062, 80.6480]; // Vijayawada, India
export const ZOOM_LEVEL = 13;

export const ROUTE_COLORS = [
  '#6366f1', // Indigo (Primary)
  '#10b981', // Emerald (Safe Alt)
  '#f59e0b', // Amber (Standard Alt)
];

export const POI_COLORS = {
  police: '#ef4444', // Red
  street_light: '#eab308', // Yellow
  crowded_place: '#3b82f6', // Blue
  hospital: '#ec4899', // Pink (Medical)
};

/**
 * Firebase project configuration.
 * Ensure your Firestore Security Rules are set to allow reads/writes for the 'route_history' and 'sos_alerts' collections.
 * 
 * Example Rules for Development:
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /{document=**} {
 *       allow read, write: if true;
 *     }
 *   }
 * }
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCunMpNMuP3ZssF8JCuaOlLx1mwmruYH38",
  authDomain: "women-road-safety-75def.firebaseapp.com",
  projectId: "women-road-safety-75def",
  storageBucket: "women-road-safety-75def.firebasestorage.app",
  messagingSenderId: "37640155546",
  appId: "1:37640155546:web:7353288657358f01190a23",
  measurementId: "G-Y9PWKJZ4K1"
};
