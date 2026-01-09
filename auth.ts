
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

/**
 * Firebase project configuration.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCunMpNMuP3ZssF8JCuaOlLx1mwmruYH38",
  authDomain: "women-road-safety-75def.firebaseapp.com",
  projectId: "women-road-safety-75def",
  storageBucket: "women-road-safety-75def.firebasestorage.app",
  messagingSenderId: "37640155546",
  appId: "1:37640155546:web:7353288657358f01190a23",
  measurementId: "G-Y9PWKJZ4K1"
};

// Initialize Firebase App instance as a singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize and export Auth
export const auth = getAuth(app);

// Initialize and export Analytics if in a browser environment
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app };
