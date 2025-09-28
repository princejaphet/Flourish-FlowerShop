// DeliveryAddress.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView,
  Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@react-navigation/native';
import { db, auth } from '../Backend/firebaseConfig';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const DeliveryAddress = ({ navigation }) => {
  const { dark: isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [formData, setFormData] = useState({
    label: '', fullName: '', phoneNumber: '', streetAddress: '',
    apartment: '', city: '', state: '', zipCode: '', deliveryInstructions: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'signup_users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFormData(prev => ({ ...prev, fullName: userData.fullName || '', phoneNumber: userData.phoneNumber || '', }));
        }
      }
      setIsFetching(false);
    };
    fetchUserData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAddress = async () => {
    const requiredFields = ['label', 'fullName', 'phoneNumber', 'streetAddress', 'city', 'state', 'zipCode'];
    if (requiredFields.some(field => !formData[field])) {
      Alert.alert('Required Fields', 'Please fill in all required fields marked with *', [{ text: 'OK' }]);
      return;
    }
    const user = auth.currentUser;
    if (!user) { Alert.alert("Authentication Error", "You are not logged in."); return; }
    setLoading(true);
    try {
      // Action 1: Add the new address to the 'addresses' subcollection for ManageAddress screen
      const addressesCollectionRef = collection(db, 'signup_users', user.uid, 'addresses');
      await addDoc(addressesCollectionRef, { ...formData, createdAt: serverTimestamp() });

      // Action 2: Update the main user document to set this as the latest/primary address for OrderCheckout screen
      const userDocRef = doc(db, 'signup_users', user.uid);
      await updateDoc(userDocRef, {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        address: { // This nested object will be read by OrderCheckout
            streetAddress: formData.streetAddress, apartment: formData.apartment,
            city: formData.city, state: formData.state, zipCode: formData.zipCode,
        }
      });
      
      Alert.alert("Success", "New address added successfully!");
      navigation.goBack();
    } catch (error) {
      console.error("Failed to save address:", error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(isDarkMode);
  if (isFetching) { return ( <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#D81B60" /></SafeAreaView> ); }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Icon name="arrow-left" size={24} color={styles.headerText.color} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Address</Text><View style={styles.headerSpacer} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <View style={styles.sectionHeader}><Icon name="tag-outline" size={24} color={isDarkMode ? '#FFF' : '#333'} /><Text style={styles.sectionTitle}>Address Label</Text></View>
            <View style={styles.inputContainer}><Text style={styles.label}>Label <Text style={styles.required}>*</Text></Text><TextInput style={styles.input} placeholder="e.g., Home, Work, Office" placeholderTextColor={styles.placeholder.color} value={formData.label} onChangeText={(text) => handleInputChange('label', text)} /></View>
            <View style={styles.sectionHeader}><Icon name="account-outline" size={24} color={isDarkMode ? '#FFF' : '#333'} /><Text style={styles.sectionTitle}>Contact Information</Text></View>
            <View style={styles.inputContainer}><Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text><TextInput style={styles.input} value={formData.fullName} onChangeText={(text) => handleInputChange('fullName', text)} /></View>
            <View style={styles.inputContainer}><Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text><TextInput style={styles.input} keyboardType="phone-pad" value={formData.phoneNumber} onChangeText={(text) => handleInputChange('phoneNumber', text)} /></View>
            <View style={styles.sectionHeader}><Icon name="map-marker-outline" size={24} color={isDarkMode ? '#FFF' : '#333'} /><Text style={styles.sectionTitle}>Address Details</Text></View>
            <View style={styles.inputContainer}><Text style={styles.label}>Street Address <Text style={styles.required}>*</Text></Text><TextInput style={styles.input} value={formData.streetAddress} onChangeText={(text) => handleInputChange('streetAddress', text)} /></View>
            <View style={styles.inputContainer}><Text style={styles.label}>Apartment, Suite, etc. (optional)</Text><TextInput style={styles.input} value={formData.apartment} onChangeText={(text) => handleInputChange('apartment', text)} /></View>
            <View style={styles.inputContainer}><Text style={styles.label}>City <Text style={styles.required}>*</Text></Text><TextInput style={styles.input} value={formData.city} onChangeText={(text) => handleInputChange('city', text)} /></View>
            <View style={styles.inputContainer}><Text style={styles.label}>State <Text style={styles.required}>*</Text></Text><TextInput style={styles.input} value={formData.state} onChangeText={(text) => handleInputChange('state', text)} /></View>
            <View style={styles.inputContainer}><Text style={styles.label}>ZIP Code <Text style={styles.required}>*</Text></Text><TextInput style={styles.input} keyboardType="number-pad" value={formData.zipCode} onChangeText={(text) => handleInputChange('zipCode', text)} /></View>
          </View>
        </ScrollView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={handleSaveAddress} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save Address</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
const getStyles = (isDarkMode) => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7E9E9', }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#333' : '#E0E0E0', },
    backButton: { padding: 8, borderRadius: 20, backgroundColor: isDarkMode ? '#333' : '#FFF', }, headerTitle: { fontSize: 20, fontWeight: '700', color: isDarkMode ? '#FFF' : '#333', flex: 1, textAlign: 'center', marginHorizontal: 10, },
    headerSpacer: { width: 40 }, headerText: { color: isDarkMode ? '#FFF' : '#333' }, scrollContent: { paddingBottom: 20 }, formContainer: { paddingHorizontal: 20, paddingTop: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 25, marginBottom: 15, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#333' : '#E8E8E8' },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: isDarkMode ? '#FFF' : '#333', marginLeft: 8 }, inputContainer: { marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFF' : '#333', marginBottom: 8 }, required: { color: '#D81B60' },
    input: { backgroundColor: isDarkMode ? '#2A2A3E' : '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: isDarkMode ? '#FFF' : '#333', borderWidth: 1, borderColor: isDarkMode ? '#444' : '#E0E0E0' },
    placeholder: { color: isDarkMode ? '#888' : '#999' }, buttonContainer: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: isDarkMode ? '#1A1A2E' : '#F7E9E9', borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#E0E0E0' },
    saveButton: { backgroundColor: '#D81B60', paddingVertical: 16, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }, saveButtonDisabled: { backgroundColor: '#999' },
    saveButtonText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
});
export default DeliveryAddress;