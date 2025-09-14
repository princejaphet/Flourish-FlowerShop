// screens/NotificationsScreen.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../Backend/firebaseConfig';
import ThemeContext from '../context/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const NotificationsScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const colors = getThemeColors(isDarkMode);
  const styles = getStyles(colors);
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Effect for handling user authentication state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setNotifications([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Effect for fetching notifications from Firestore
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const ordersRef = collection(db, 'orders');
    
    const q = query(ordersRef, 
      where('userId', '==', userId), 
      where('status', 'in', ['Pending', 'Confirmed', 'Processing', 'Ready', 'Out for Delivery', 'Shipped', 'Delivered', 'Cancelled', 'Refunded']),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const generatedNotifications = snapshot.docs.map(doc => {
        const order = { id: doc.id, ...doc.data() };
        const { title, body } = generateNotificationMessage(order);
        
        return {
          id: order.id,
          title: title,
          message: body,
          timestamp: order.timestamp,
          isRead: order.isRead || false,
          icon: getStatusIcon(order.status),
          status: order.status,
          statusColor: getStatusColor(order.status),
          order: order,
        };
      });
      setNotifications(generatedNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [userId]);
  
  // --- NEW --- Function to remove a single notification
  const handleRemoveNotification = (notificationId) => {
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== notificationId)
    );
  };

  // --- NEW --- Function to clear all notifications with a confirmation dialog
  const handleClearAll = () => {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to remove all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear All", onPress: () => setNotifications([]), style: "destructive" }
      ]
    );
  };

  const generateNotificationMessage = (order) => {
    const firstItemName = order.items && order.items.length > 0 ? order.items[0].name : 'your order';
    const itemCount = order.items ? order.items.length : 0;
    const additionalItemsText = itemCount > 1 ? ` (+${itemCount - 1} more)` : '';
    const fullOrderDesc = `"${firstItemName}"${additionalItemsText}`;

    switch (order.status) {
      case 'Pending':
        return { title: 'Order Received', body: `Awaiting confirmation for ${fullOrderDesc}.` };
      case 'Confirmed':
        return { title: 'Order Confirmed', body: `We're preparing ${fullOrderDesc}.` };
      case 'Processing':
        return { title: 'Flowers in Progress', body: `Our florists are crafting ${fullOrderDesc}.` };
      case 'Ready':
        return { title: 'Ready for You!', body: `Your order for ${fullOrderDesc} is ready!` };
      case 'Out for Delivery':
        return { title: 'On The Way!', body: `Your order for ${fullOrderDesc} is out for delivery!` };
      case 'Shipped':
        return { title: 'Items Shipped', body: `Your order for ${fullOrderDesc} has been dispatched.` };
      case 'Delivered':
        return { title: 'Delivery Complete!', body: `Your order for ${fullOrderDesc} has been delivered. Enjoy!` };
      case 'Cancelled':
        return { title: 'Order Cancelled', body: `Your order for ${fullOrderDesc} has been cancelled.` };
      case 'Refunded':
        return { title: 'Refund Processed', body: `Your refund for ${fullOrderDesc} has been processed.` };
      default:
        return { title: 'Order Update', body: `Status of your order for ${fullOrderDesc} has been updated.` };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return 'clock-outline';
      case 'Confirmed': return 'check-circle-outline';
      case 'Processing': return 'flower';
      case 'Ready': return 'package-variant';
      case 'Out for Delivery': return 'truck-delivery-outline';
      case 'Shipped': return 'truck-fast-outline';
      case 'Delivered': return 'package-variant-closed-check';
      case 'Cancelled': return 'close-circle-outline';
      case 'Refunded': return 'cash-refund';
      default: return 'information-outline';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
        case 'Pending': return '#FF9800'; // Orange
        case 'Confirmed': return '#4CAF50'; // Green
        case 'Processing': return '#E91E63'; // Pink
        case 'Ready': return '#2196F3'; // Blue
        case 'Out for Delivery': return '#9C27B0'; // Purple
        case 'Shipped': return '#3F51B5'; // Indigo
        case 'Delivered': return '#009688'; // Teal
        case 'Cancelled': return '#F44336'; // Red
        case 'Refunded': return '#607D8B'; // Blue Grey
        default: return '#757575'; // Grey
    }
  };

  // --- UPDATED --- Redesigned notification item renderer
  const renderNotificationItem = ({ item }) => (
    <View style={[styles.notificationCard, !item.isRead && styles.unreadCard]}>
      <View style={[styles.iconContainer, { backgroundColor: item.statusColor }]}>
        <Icon name={item.icon} size={24} color="#FFF" />
      </View>
      
      <TouchableOpacity 
        style={styles.textContainer}
        onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
      >
        <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.messageText} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.timestampText}>
          {item.timestamp ? formatDistanceToNow(item.timestamp.toDate(), { addSuffix: true }) : ''}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => handleRemoveNotification(item.id)}
      >
        <Icon name="close" size={20} color={colors.subText} />
      </TouchableOpacity>
    </View>
  );
  
  // --- UPDATED --- Redesigned empty state component
  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="bell-off-outline" size={80} color={colors.subText} />
      <Text style={styles.emptyText}>All Clear!</Text>
      <Text style={styles.emptySubText}>
        You have no new notifications. Updates about your orders will appear here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* --- UPDATED --- Header with notification count and "Clear All" button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Notifications <Text style={styles.notificationCount}>({notifications.length})</Text>
        </Text>
        {notifications.length > 0 && (
          <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={ListEmptyComponent}
        />
      )}
    </SafeAreaView>
  );
};

const getThemeColors = (isDarkMode) => ({
    background: isDarkMode ? '#121212' : '#F7F8FA',
    card: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#1C1C1E',
    subText: isDarkMode ? '#A5A5A5' : '#6D6D72',
    primary: '#D81B60',
    border: isDarkMode ? '#333333' : '#EAEAEA',
    unreadBg: isDarkMode ? '#2A1A2E' : '#FFF6F8',
});

// --- UPDATED --- Reworked styles for a cleaner UI
const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  notificationCount: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.subText,
  },
  clearAllButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  clearAllText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  listContainer: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  notificationCard: {
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  unreadCard: {
    backgroundColor: colors.unreadBg,
    borderWidth: 1,
    borderColor: 'rgba(216, 27, 96, 0.2)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: colors.subText,
    lineHeight: 20,
    marginBottom: 4,
  },
  timestampText: {
    fontSize: 12,
    color: colors.subText,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: '30%',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 15,
    color: colors.subText,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default NotificationsScreen;