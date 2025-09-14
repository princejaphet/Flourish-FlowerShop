import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../Backend/firebaseConfig';

// Create the context
export const NotificationsContext = createContext();

// Create the provider component
export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Effect to listen for authentication changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  // Effect to fetch notifications from Firestore when userId is available
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [userId]);

  // Effect to calculate the unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(n => !n.isRead).length;
    setUnreadCount(count);
  }, [notifications]);

  // Function to mark a specific notification as read in Firestore
  const markAsRead = async (notificationId) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      const docRef = doc(db, 'orders', notificationId);
      try {
        await updateDoc(docRef, { isRead: true });
        // Local state will update automatically via the onSnapshot listener
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};