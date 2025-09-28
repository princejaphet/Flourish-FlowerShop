// ManageAddress.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import ThemeContext from '../context/ThemeContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../Backend/firebaseConfig';

const ManageAddress = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [addresses, setAddresses] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const dynamicStyles = {
    page: { backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9' }, headerTitle: { color: isDarkMode ? '#fff' : '#333' },
    backIcon: { color: isDarkMode ? '#fff' : '#000' }, addAddressContainer: { borderColor: '#D81B60' }, addAddressText: { color: '#D81B60' },
    addressCard: { backgroundColor: isDarkMode ? '#2c2c44' : '#fff', shadowColor: isDarkMode ? '#fff' : '#000' },
    selectedAddressCard: { borderColor: '#D81B60' }, addressLabelText: { color: isDarkMode ? '#fff' : '#333' },
    addressText: { color: isDarkMode ? '#ccc' : '#666' }, deleteIcon: { color: '#D81B60' }, noAddressText: { color: isDarkMode ? '#888' : '#999' },
    applyButton: { backgroundColor: '#D81B60' }, applyButtonDisabled: { backgroundColor: '#999' }, applyButtonText: { color: '#fff' },
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      if (!user) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setAddresses([]); setLoading(false); return; }
    setLoading(true);
    const addressesCollectionRef = collection(db, 'signup_users', userId, 'addresses');
    const unsubscribeSnapshot = onSnapshot(addressesCollectionRef, (snapshot) => {
      const addressesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAddresses(addressesList);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch addresses:", error); Alert.alert("Error", "Failed to load addresses."); setLoading(false);
    });
    return () => unsubscribeSnapshot();
  }, [userId]);

  const handleDeleteAddress = async (addressId) => {
    Alert.alert("Confirm Deletion", "Are you sure you want to delete this address?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete",
        onPress: async () => {
          if (!userId) return;
          const addressDocRef = doc(db, 'signup_users', userId, 'addresses', addressId);
          await deleteDoc(addressDocRef);
        }
      }
    ]);
  };
  
  return (
    <View style={[styles.page, dynamicStyles.page]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-left" size={28} color={dynamicStyles.backIcon.color} /></TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Manage Address</Text>
      </View>
      {loading ? <ActivityIndicator size="large" color="#D81B60" style={styles.loadingIndicator} />
      : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={[styles.addAddressContainer, dynamicStyles.addAddressContainer]} onPress={() => navigation.navigate('DeliveryAddress')}>
            <Text style={[styles.addAddressText, dynamicStyles.addAddressText]}>+ Add Delivery Address</Text>
          </TouchableOpacity>
          {addresses.length > 0 ? (
            addresses.map((address) => {
                const fullAddress = [address.streetAddress, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
                return (
                  <TouchableOpacity key={address.id} style={[styles.addressCard, dynamicStyles.addressCard, selectedAddressId === address.id && dynamicStyles.selectedAddressCard,]} onPress={() => setSelectedAddressId(address.id)}>
                    <View style={styles.addressInfo}>
                      <View style={styles.addressLabelContainer}><Icon name={address.label?.toLowerCase() === 'home' ? 'home' : 'map-marker'} size={20} color={dynamicStyles.addressLabelText.color} /><Text style={[styles.addressLabelText, dynamicStyles.addressLabelText]}>{address.label}</Text></View>
                      <Text style={[styles.addressFullName, dynamicStyles.addressLabelText]}>{address.fullName}</Text>
                      <Text style={[styles.addressText, dynamicStyles.addressText]}>{address.phoneNumber}</Text>
                      <Text style={[styles.addressText, dynamicStyles.addressText]}>{fullAddress}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteAddress(address.id)} style={styles.deleteButton}><Icon name="trash-can-outline" size={24} color={dynamicStyles.deleteIcon.color} /></TouchableOpacity>
                  </TouchableOpacity>
                )
            })
          ) : ( <Text style={[styles.noAddressText, dynamicStyles.noAddressText]}>No addresses found. Add a new one!</Text> )}
        </ScrollView>
      )}
      <TouchableOpacity style={[styles.applyButton, !selectedAddressId && dynamicStyles.applyButtonDisabled]} disabled={!selectedAddressId} onPress={() => Alert.alert("Apply", "Functionality to apply address can be added here.")}>
        <Text style={[styles.applyButtonText, dynamicStyles.applyButtonText]}>Apply</Text>
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
    page: { flex: 1, paddingTop: 50 }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', marginLeft: 20 }, loadingIndicator: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 }, addAddressContainer: { width: '100%', padding: 20, borderWidth: 2, borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    addAddressText: { fontSize: 16, fontWeight: '500' }, addressCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, padding: 20, marginBottom: 15, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    selectedAddressCard: { borderWidth: 2 }, addressInfo: { flex: 1, marginRight: 10 }, addressLabelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    addressLabelText: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 }, addressFullName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    addressText: { fontSize: 15, lineHeight: 22 }, deleteButton: { padding: 5 }, noAddressText: { textAlign: 'center', fontSize: 16, marginTop: 50 },
    applyButton: { paddingVertical: 15, borderRadius: 25, marginHorizontal: 20, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
    applyButtonDisabled: {}, applyButtonText: { fontSize: 18, fontWeight: 'bold' },
});
export default ManageAddress;