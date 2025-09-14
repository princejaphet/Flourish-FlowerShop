// firebaseConfig.js (for React Native app)

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';


const localFirebaseConfig = {
  apiKey: "AIzaSyDTZKJpdPKCunl7dFpjEUPXY-eboXkPrhk", 
  authDomain: "flourish-adf09.firebaseapp.com",
  projectId: "flourish-adf09", 
  storageBucket: "flourish-adf09.firebasestorage.app",
  messagingSenderId: "853529980918",
  appId: "1:853529980918:web:abacb3f82df5a3681121d7",
  measurementId: "G-0CEWS807Q0"
};


const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : localFirebaseConfig;


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();


export const appId = typeof __app_id !== 'undefined' ? __app_id : 'flourish-flowers-app';

export const auth = getAuth(app);
export const db = getFirestore(app); 



/**
 * Adds or updates a user's display name within the specific artifact document.
 * This function creates a document for the user inside a 'users' subcollection
 * at the path: /artifacts/{appId}/users/{userId}
 *
 * @param {string} userId - The unique ID of the user (e.g., from Firebase Auth).
 * @param {string} userName - The display name of the user.
 */
export const addUserNameToArtifact = async (userId, userName) => {
  // Ensure we have the necessary information before proceeding
  if (!userId || !userName) {
    console.error("Error: User ID and User Name are required to save data.");
    return;
  }

  try {
    
    const userDocRef = doc(db, 'artifacts', appId, 'users', userId);

   
    await setDoc(userDocRef, {
      name: userName,
      updatedAt: new Date()
    }, { merge: true });

    console.log(`Successfully saved user '${userName}' (ID: ${userId}) to artifact '${appId}'`);

  } catch (error) {
    
    console.error("Error writing user data to artifact collection: ", error);
  }
};

