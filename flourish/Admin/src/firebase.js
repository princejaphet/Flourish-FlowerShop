// firebase.js (for React Vite Admin Web App - likely in your project root or src folder)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  // IMPORTANT: This 'apiKey' MUST be your REAL API key for the WEB APP from Firebase Console.
  // Do NOT leave it as a placeholder.
  apiKey: "AIzaSyDTZKJpdPKCunl7dFpjEUPXY-eboXkPrhk", // <<< REPLACE THIS with your actual WEB APP API key!
  authDomain: "flourish-adf09.firebaseapp.com",
  projectId: "flourish-adf09", // This MUST MATCH the project ID from your mobile app's config
  storageBucket: "flourish-adf09.appspot.com", // Corrected storage bucket domain
  messagingSenderId: "853529980918",
  appId: "1:853529980918:web:b1d9c4f828a1c3d1e1f1a1", // Example web app ID
  measurementId: "G-XXXXXXXXXX" // Optional: for Google Analytics
};

// Initialize Firebase (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app); // Export Firestore instance
export { app };

