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
  
  const colors = {
    background: isDarkMode ? '#1a1a2e' : '#F7E9E9',
    card: isDarkMode ? '#2c2c44' : '#fff',
    text: isDarkMode ? '#fff' : '#333',
    subText: isDarkMode ? '#bbb' : '#666',
    primary: '#D81B60',
    border: isDarkMode ? '#444' : '#E0E0E0',
  };
  const styles = getStyles(colors);

  // --- START: CORRECTED DATA FETCHING LOGIC ---
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Corrected path to the top-level 'orders' collection
    const ordersCollectionRef = collection(db, 'orders');
    
    // Query to get orders where 'userId' matches the current user's ID
    const q = query(
      ordersCollectionRef, 
      where("userId", "==", currentUser.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Ensure timestamp is a JS Date object for formatting
        date: doc.data().timestamp?.toDate() ? format(doc.data().timestamp.toDate(), 'PPP') : 'No date',
      }));
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders: ", error);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  // --- END: CORRECTED DATA FETCHING LOGIC ---

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Pending': return { backgroundColor: '#FFC107' }; // Amber
      case 'Processing': return { backgroundColor: '#2196F3' }; // Blue
      case 'Delivered': return { backgroundColor: '#4CAF50' }; // Green
      case 'Cancelled': return { backgroundColor: '#F44336' }; // Red
      default: return { backgroundColor: '#9E9E9E' }; // Grey
    }
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item.id.substring(0, 8)}...</Text>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.productRow}>
        <Image 
          source={{ uri: item.product?.imageUrl || 'https://via.placeholder.com/60' }} 
          style={styles.productImage} 
        />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.product?.name || 'Product Name Not Available'}</Text>
          <Text style={styles.productMeta}>
            {item.product?.quantity || 1}x • Size: {item.product?.size || 'N/A'}
          </Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.totalPrice}>₱{item.totalAmount?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{item.date}</Text>
        <TouchableOpacity 
          style={styles.trackButton}
          onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
        >
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>
      {orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.subText }}>You have no orders yet.</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  backButton: { position: 'absolute', left: 20 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  listContainer: { padding: 15 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  statusBadge: { borderRadius: 15, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 15, backgroundColor: '#eee' },
  productDetails: { flex: 1 },
  productName: { fontSize: 15, color: colors.text, fontWeight: '500' },
  productMeta: { fontSize: 13, color: colors.subText, marginTop: 4 },
  priceContainer: { alignItems: 'center' },
  totalPrice: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  dateText: { fontSize: 12, color: colors.subText },
  trackButton: { backgroundColor: colors.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  trackButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});

export default MyOrdersScreen;