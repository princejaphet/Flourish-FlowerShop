import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { db } from '/src/firebase.js'; // Corrected import path
import { ShoppingBag, MessageCircle, Star } from 'lucide-react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    // Initialize state from localStorage, which keeps notifications persistent across refreshes.
    const [notifications, setNotifications] = useState(() => {
        try {
            const savedNotifications = localStorage.getItem('notifications');
            if (savedNotifications) {
                const parsed = JSON.parse(savedNotifications);
                // Re-hydrate Date objects from ISO strings and ensure isNew flag is correctly set.
                return parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp), isNew: n.isNew !== false }));
            }
        } catch (error) {
            console.error("Failed to parse notifications from localStorage", error);
        }
        return [];
    });
    
    const [userId, setUserId] = useState(null);
    const [mountTimestamp] = useState(new Date());

    // Persist notifications to localStorage whenever the list changes.
    useEffect(() => {
        try {
            localStorage.setItem('notifications', JSON.stringify(notifications));
        } catch (error) {
            console.error("Failed to save notifications to localStorage", error);
        }
    }, [notifications]);

    // Effect for Firebase authentication.
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                signInAnonymously(auth).catch(console.error);
            }
        });
        return () => unsubscribe();
    }, []);

    // Effect for listening to real-time updates from Firestore.
    useEffect(() => {
        if (!userId) return;

        const listeners = [];

        // Function to add a new notification to the state, marked as 'new'.
        const handleNewNotification = (notification) => {
            setNotifications(prev => {
                // Prevent adding duplicate notifications.
                if (prev.some(n => n.id === notification.id)) {
                    return prev;
                }
                return [{ ...notification, isNew: true }, ...prev].slice(0, 20); // Keep the last 20 notifications.
            });
        };

        // 1. New Orders Listener
        const ordersQuery = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
        const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const order = { id: change.doc.id, ...change.doc.data() };
                const orderTimestamp = order.timestamp?.toDate();
                if (change.type === 'added' && orderTimestamp > mountTimestamp) {
                    handleNewNotification({
                        id: `order-${order.id}`,
                        type: 'new_order',
                        message: `New order #${order.id.substring(0, 6)} from ${order.customerName || 'a customer'}.`,
                        timestamp: new Date(),
                    });
                }
            });
        });
        listeners.push(unsubscribeOrders);
        
        // 2. New Messages Listener
        const chatsQuery = query(collection(db, `artifacts/flourish-flowers-app/public/data/chats`), orderBy('timestamp', 'desc'));
        const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const chat = { id: change.doc.id, ...change.doc.data() };
                const messageTimestamp = chat.timestamp?.toDate();
                if ((change.type === 'added' || change.type === 'modified') && !chat.isRead && messageTimestamp > mountTimestamp && chat.lastMessage) {
                     handleNewNotification({
                        id: `chat-${chat.id}-${messageTimestamp?.getTime()}`,
                        type: 'new_message',
                        message: `New message from ${chat.userName || 'a customer'}.`,
                        timestamp: new Date(),
                    });
                }
            });
        });
        listeners.push(unsubscribeChats);
        
        // 3. New Feedback Listener
        const feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
        const unsubscribeFeedback = onSnapshot(feedbackQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const feedback = { id: change.doc.id, ...change.doc.data() };
                const feedbackTimestamp = feedback.createdAt?.toDate();
                if (change.type === 'added' && feedbackTimestamp > mountTimestamp) {
                    handleNewNotification({
                        id: `feedback-${feedback.id}`,
                        type: 'new_feedback',
                        message: `New ${feedback.rating}-star review from ${feedback.customerName}.`,
                        timestamp: new Date(),
                    });
                }
            });
        });
        listeners.push(unsubscribeFeedback);


        return () => {
            listeners.forEach(unsub => unsub());
        };
    }, [userId, mountTimestamp]);
    
    // Removes a single notification from the list.
    const removeNotification = (notificationId) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    // Clears all notifications from the list and localStorage.
    const clearAllNotifications = () => {
        setNotifications([]);
        localStorage.removeItem('notifications');
    };

    // This function is called when the user views the notifications.
    // It sets the 'isNew' flag to false for all notifications, which makes the badge disappear.
    const markAllAsRead = () => {
        setNotifications(prevNotifications => {
            // Check if there are any unread notifications to avoid unnecessary updates.
            const hasUnread = prevNotifications.some(n => n.isNew);
            if (hasUnread) {
                // Return a new array with the 'isNew' flag updated.
                return prevNotifications.map(n => 
                    n.isNew ? { ...n, isNew: false } : n
                );
            }
            // If everything is already read, return the same state to prevent a re-render.
            return prevNotifications;
        });
    };

    // The context value provided to the rest of the app.
    const value = useMemo(() => ({
        notifications,
        unreadCount: notifications.filter(n => n.isNew).length, // The badge count is based on the 'isNew' flag.
        removeNotification,
        clearAllNotifications,
        markAllAsRead,
    }), [notifications]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

