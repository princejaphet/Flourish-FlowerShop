// Backend/firebaseHelpers.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Creates a new notification document in Firestore.
 */
export const createNotification = async (userId, title, message, options = {}) => {
  if (!userId) {
    console.error("Attempted to create a notification without a userId.");
    return;
  }

  try {
    const notificationsCollectionRef = collection(db, 'notifications');
    await addDoc(notificationsCollectionRef, {
      userId,
      title,
      message,
      timestamp: serverTimestamp(),
      isRead: false,
      type: options.type || 'general',
      icon: options.icon || 'bell-outline',
      iconColor: options.iconColor || '#D81B60',
      linkTo: options.linkTo || null,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};