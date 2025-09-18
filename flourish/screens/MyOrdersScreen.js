// screens/MyOrdersScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ThemeContext from '../context/ThemeContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../Backend/firebaseConfig';
import { format } from 'date-fns';

const MyOrdersScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  
  const colors = {
    background: isDarkMode ? '#1a1a2e' : '#F7E9E9',
    card: isDarkMode ? '#2c2c44' : '#fff',
    text: isDarkMode ? '#fff' : '#333',
    subText: isDarkMode ? '#bbb' : '#666',
    primary: '#D81B60',
    border: isDarkMode ? '#444' : '#E0E0E0',
    tabActive: '#D81B60',
    tabInactive: isDarkMode ? '#555' : '#ccc',
    tabBackground: isDarkMode ? '#2c2c44' : '#fff',
  };
  const styles = getStyles(colors);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const ordersCollectionRef = collection(db, 'orders');
    const q = query(
      ordersCollectionRef, 
      where("userId", "==", currentUser.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp?.toDate() ? format(doc.data().timestamp.toDate(), 'PPP') : 'No date',
      }));
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter orders based on active tab
  const getFilteredOrders = () => {
    if (activeTab === 'active') {
      // Active orders: Pending, Processing, Shipped
      return orders.filter(order => 
        ['Pending', 'Processing', 'Shipped'].includes(order.status)
      );
    } else {
      // History: Delivered, Cancelled
      return orders.filter(order => 
        ['Delivered', 'Cancelled'].includes(order.status)
      );
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Pending': return { backgroundColor: '#FFC107' };
      case 'Processing': return { backgroundColor: '#2196F3' };
      case 'Shipped': return { backgroundColor: '#9C27B0' };
      case 'Delivered': return { backgroundColor: '#4CAF50' };
      case 'Cancelled': return { backgroundColor: '#F44336' };
      default: return { backgroundColor: '#9E9E9E' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return 'clock-outline';
      case 'Processing': return 'cog-outline';
      case 'Shipped': return 'truck-fast';
      case 'Delivered': return 'check-circle';
      case 'Cancelled': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>Order #{item.id.substring(0, 8)}...</Text>
          {activeTab === 'history' && (
            <Text style={styles.completedDate}>
              {item.status === 'Delivered' ? 'Delivered' : 'Cancelled'} on {item.date}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Icon name={getStatusIcon(item.status)} size={12} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.productRow}>
        <Image 
          source={{ uri: item.product?.imageUrl || 'https://via.placeholder.com/60' }} 
          style={styles.productImage} 
        />
        <View style={styles.productDetails}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.product?.name || 'Product Name Not Available'}
          </Text>
          <Text style={styles.productMeta}>
            {item.product?.quantity || 1}x • Size: {item.product?.size || 'N/A'}
          </Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.totalPrice}>₱{item.totalAmount?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        {activeTab === 'active' ? (
          <>
            <Text style={styles.dateText}>Ordered on {item.date}</Text>
            <TouchableOpacity 
              style={styles.trackButton}
              onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
            >
              <Icon name="map-marker-path" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.trackButtonText}>Track Order</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.historyActions}>
              {item.status === 'Delivered' && (
                <TouchableOpacity 
                  style={styles.reorderButton}
                  onPress={() => {
                    // Navigate to product details or add to cart functionality
                    // You can implement reorder logic here
                    console.log('Reorder item:', item.id);
                  }}
                >
                  <Icon name="refresh" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.reorderButtonText}>Reorder</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
              >
                <Icon name="eye-outline" size={14} color={colors.subText} style={{ marginRight: 4 }} />
                <Text style={styles.viewDetailsButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    const isActiveTab = activeTab === 'active';
    return (
      <View style={styles.emptyContainer}>
        <Icon 
          name={isActiveTab ? "package-variant" : "history"} 
          size={64} 
          color={colors.subText} 
          style={{ opacity: 0.5 }}
        />
        <Text style={styles.emptyTitle}>
          {isActiveTab ? 'No Active Orders' : 'No Order History'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isActiveTab 
            ? 'Your active orders will appear here once you place them.' 
            : 'Your completed and cancelled orders will appear here.'
          }
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subText }]}>Loading your orders...</Text>
      </SafeAreaView>
    );
  }
  
  const filteredOrders = getFilteredOrders();
  const activeOrdersCount = orders.filter(order => 
    ['Pending', 'Processing', 'Shipped'].includes(order.status)
  ).length;
  const historyOrdersCount = orders.filter(order => 
    ['Delivered', 'Cancelled'].includes(order.status)
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Icon 
            name="package-variant" 
            size={18} 
            color={activeTab === 'active' ? '#fff' : colors.subText} 
            style={{ marginRight: 6 }}
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'active' && styles.activeTabText
          ]}>
            Active
          </Text>
          {activeOrdersCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeOrdersCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Icon 
            name="history" 
            size={18} 
            color={activeTab === 'history' ? '#fff' : colors.subText} 
            style={{ marginRight: 6 }}
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'history' && styles.activeTabText
          ]}>
            History
          </Text>
          {historyOrdersCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{historyOrdersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  centerContent: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    height: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border, 
    backgroundColor: colors.card,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: { 
    position: 'absolute', 
    left: 20 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: colors.text 
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.tabBackground,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 12,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: colors.tabActive,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subText,
  },
  activeTabText: {
    color: '#fff',
  },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    paddingHorizontal: 4,
  },

  // List Styles
  listContainer: { 
    padding: 15,
    paddingTop: 10,
  },
  card: { 
    backgroundColor: colors.card, 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: colors.text,
    marginBottom: 2,
  },
  completedDate: {
    fontSize: 12,
    color: colors.subText,
    fontStyle: 'italic',
  },
  statusBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15, 
    paddingHorizontal: 10, 
    paddingVertical: 6,
  },
  statusText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: 'bold' 
  },
  productRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: { 
    width: 60, 
    height: 60, 
    borderRadius: 8, 
    marginRight: 12, 
    backgroundColor: colors.border,
  },
  productDetails: { 
    flex: 1,
    marginRight: 8,
  },
  productName: { 
    fontSize: 15, 
    color: colors.text, 
    fontWeight: '600',
    lineHeight: 18,
  },
  productMeta: { 
    fontSize: 12, 
    color: colors.subText, 
    marginTop: 4 
  },
  priceContainer: { 
    alignItems: 'flex-end' 
  },
  totalPrice: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: colors.primary 
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateText: { 
    fontSize: 11, 
    color: colors.subText,
    flex: 1,
  },
  trackButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  trackButtonText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },

  // History Tab Styles
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reorderButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  viewDetailsButtonText: {
    color: colors.subText,
    fontSize: 12,
    fontWeight: '500',
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.subText,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MyOrdersScreen;