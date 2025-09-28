// OrderCheckout.js
import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, TextInput,
  Image, Dimensions, Modal, StatusBar, Alert,
  ActivityIndicator, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Feather from 'react-native-vector-icons/Feather';
import ThemeContext from '../context/ThemeContext';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../Backend/firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const gcashLogo = require('../assets/gcash_logo.jpg');
const qrCodeImage = require('../assets/qr_code.jpg');
const { width } = Dimensions.get('window');
const lightColors = {
  background: '#F9F5F8', cardBackground: '#fff', text: '#333', subText: '#666', border: '#f0f0f0', shadowColor: '#000',
  inputBackground: '#F5F5F5', primary: '#D81B60', discount: '#D81B60', modalOverlay: 'rgba(0, 0, 0, 0.5)',
  selectedButton: '#D81B60', selectedButtonText: '#fff', success: '#28a745',
};
const darkColors = {
  background: '#121212', cardBackground: '#1C1C1E', text: '#E0E0E0', subText: '#888', border: '#333', shadowColor: '#000',
  inputBackground: '#2C2C2E', primary: '#D81B60', discount: '#D81B60', modalOverlay: 'rgba(0, 0, 0, 0.7)',
  selectedButton: '#D81B60', selectedButtonText: '#fff', success: '#28a745',
};
const mockVouchers = [
  { id: '1', code: 'SALE10', description: 'Get 10% off your order', discount: 10 },
  { id: '2', code: 'FREESHIP', description: 'Free shipping on all items', discount: 0, freeShipping: true },
];

const OrderCheckout = ({ route, navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const colors = isDarkMode ? darkColors : lightColors;
  const styles = getStyles(colors);

  const { orderDetails } = route.params;
  const { product, quantity, variation, note, isNewUser } = orderDetails;
  const orderItems = [{ ...product, quantity, size: variation ? variation.name : null, note }];
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('Loading address...');
  const [contactNumber, setContactNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('Same-Day Delivery');
  const [showDeliveryOptions, setShowDeliveryOptions] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isVoucherModalVisible, setVoucherModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
  const [newOrderId, setNewOrderId] = useState(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [proofOfPaymentImage, setProofOfPaymentImage] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, 'signup_users', user.uid);
          try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setName(userData.fullName || 'No name provided');
              
              if (userData.address && typeof userData.address === 'object') {
                const { streetAddress, city, state, zipCode } = userData.address;
                const fullAddress = [streetAddress, city, state, zipCode].filter(Boolean).join(', ');
                setAddress(fullAddress || 'No address provided.');
              } else if (typeof userData.address === 'string') {
                 setAddress(userData.address);
              } else {
                 setAddress('No address set. Please update your profile.');
              }
              
              setContactNumber(userData.phoneNumber || 'No contact provided');
            } else {
              setAddress('No address set. Please update your profile.');
              setName('');
              setContactNumber('');
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
            setAddress('Could not load address.');
          }
        }
      };
      fetchUserData();
    }, [])
  );

  const onPickerChange = (event, selectedValue) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedValue) { pickerMode === 'date' ? setDate(selectedValue) : setTime(selectedValue); }
  };
  const showMode = (currentMode) => { setShowPicker(true); setPickerMode(currentMode); };
  
  const subtotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const originalSubtotal = orderItems.reduce((acc, item) => acc + (item.originalPrice || item.price) * item.quantity, 0);
  const deliveryFee = deliveryOption === 'Standard' ? 5.00 : 10.00;
  const newUserDiscount = isNewUser ? originalSubtotal - subtotal : 0;
  const voucherDiscount = appliedVoucher ? (subtotal * (appliedVoucher.discount / 100)) : 0;
  const totalAmount = subtotal + deliveryFee - voucherDiscount;

  const handleSelectProofImage = async () => {
    let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos to upload proof of payment."); return;
    }
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!pickerResult.canceled) { setProofOfPaymentImage(pickerResult.assets[0].uri); }
  };

  const uploadImageAsync = async (uri) => {
    const cloudName = 'djhtu0rzz';
    const uploadPreset = 'my_app_preset';
    const apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', { uri, name: `proof_${Date.now()}.jpg`, type: 'image/jpeg' });
    formData.append('upload_preset', uploadPreset);
    try {
      const response = await fetch(apiUrl, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) { return data.secure_url; } 
      else { throw new Error(data.error?.message || 'Cloudinary upload failed'); }
    } catch (error) {
      console.error("Cloudinary Upload Error:", error); throw error;
    }
  };

  const handlePlaceOrder = async () => {
    const user = auth.currentUser;
    if (!user) { Alert.alert("Authentication Error", "You must be logged in to place an order."); return; }
    if (!name || !address || !contactNumber || address.startsWith('No address')) {
        Alert.alert("Missing Information", "Please provide a complete shipping address by editing your profile."); return;
    }
    if (product.variations && product.variations.length > 0 && (!variation || !variation.name || variation.name === 'Default')) {
        Alert.alert("Selection Required", "Please select a size before placing your order."); return;
    }
    if (paymentMethod === 'GCash' && !proofOfPaymentImage) { Alert.alert("Proof Required", "Please upload a screenshot of your GCash payment."); return; }

    setIsLoading(true);
    let proofOfPaymentUrl = null;
    try {
      if (paymentMethod === 'GCash' && proofOfPaymentImage) {
        setIsUploading(true);
        proofOfPaymentUrl = await uploadImageAsync(proofOfPaymentImage);
        setIsUploading(false);
      }
      const mainProduct = orderItems[0] || {};
      const orderData = {
        userId: user.uid, customerName: name, customerEmail: user.email, customerPhone: contactNumber,
        deliveryAddress: address, product: {
          name: mainProduct.name, price: mainProduct.price, originalPrice: mainProduct.originalPrice,
          quantity: mainProduct.quantity, addons: mainProduct.addons || [], imageUrl: mainProduct.imageUrl,
        }, totalAmount: totalAmount, notes: orderNotes, status: 'Pending', timestamp: serverTimestamp(),
        deliveryDetails: { option: deliveryOption, date: format(date, 'yyyy-MM-dd'), time: format(time, 'HH:mm'), },
        paymentDetails: { method: paymentMethod, proofUrl: proofOfPaymentUrl, referenceNumber: referenceNumber, },
        discountDetails: { newUserDiscount: newUserDiscount, voucherDiscount: voucherDiscount, voucherCode: appliedVoucher ? appliedVoucher.code : null, }
      };
      if (variation && variation.name && variation.name !== 'Default') { orderData.product.size = variation.name; }
      const newOrderRef = await addDoc(collection(db, 'orders'), orderData);
      setNewOrderId(newOrderRef.id);
      setSuccessModalVisible(true);
    } catch (error) {
      console.error("Error placing order: ", error); Alert.alert("Order Failed", "Something went wrong. Please try again.");
    } finally { setIsLoading(false); setIsUploading(false); }
  };
  
  const handleSelectVoucher = (voucher) => { setAppliedVoucher(voucher); setVoucherModalVisible(false); };
  const handleSelectDelivery = (option) => { setDeliveryOption(option); setShowDeliveryOptions(false); };

  const ProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <Text style={[styles.stepText, styles.activeStepText]}>Shipping</Text>
      <Feather name="chevron-right" size={20} color={colors.subText} /><Text style={styles.stepText}>Payment</Text>
      <Feather name="chevron-right" size={20} color={colors.subText} /><Text style={styles.stepText}>Summary</Text>
    </View>
  );

  const SuccessModal = () => (
    <Modal animationType="fade" transparent={true} visible={isSuccessModalVisible} onRequestClose={() => setSuccessModalVisible(false)}>
      <View style={styles.modalOverlay}><View style={styles.successModalContent}>
          <View style={styles.successIconCircle}><Feather name="check" size={40} color="#fff" /></View>
          <Text style={styles.orderPlacedTitle}>Order Placed!</Text>
          <Text style={styles.orderPlacedSubtitle}>Your order was placed successfully. For more details, check your order status under My Order page.</Text>
          <TouchableOpacity style={styles.trackOrderButton} onPress={() => { setSuccessModalVisible(false); navigation.replace('OrderTracking', { orderId: newOrderId }); }}><Text style={styles.trackOrderButtonText}>Track Order</Text></TouchableOpacity>
          <TouchableOpacity style={styles.backToHomeButton} onPress={() => { setSuccessModalVisible(false); navigation.navigate('Homepage'); }}><Text style={styles.backToHomeButtonText}>Back to Home</Text></TouchableOpacity>
      </View></View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SuccessModal />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text><View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <ProgressIndicator />
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Shipping Information</Text>
          <TouchableOpacity style={styles.addressBox} onPress={() => navigation.navigate('DeliveryAddress')}>
            <Feather name="map-pin" size={24} color={colors.primary} style={styles.addressIcon} />
            <View style={styles.addressDetails}>
              <Text style={styles.addressName} numberOfLines={1}>{name} {contactNumber ? `• ${contactNumber}` : ''}</Text>
              <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
            </View>
            <Feather name="edit-2" size={20} color={colors.subText} />
          </TouchableOpacity>
        </View>
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Your Order</Text>
            {orderItems.map((item, index) => (
              <View key={index.toString()} style={styles.productRow}>
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  {item.size && <Text style={styles.productMeta}>Size: {item.size}</Text>}
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
                  <Text style={styles.productMeta}>Qty: {item.quantity}</Text>
                </View>
              </View>
            ))}
        </View>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View><View style={styles.deliveryRow}><Text style={styles.deliveryLabel}>Delivery Option</Text><TouchableOpacity onPress={() => setShowDeliveryOptions(!showDeliveryOptions)} style={styles.datePickerButton}><Text style={styles.datePickerText}>{deliveryOption}</Text><Feather name={showDeliveryOptions ? "chevron-up" : "chevron-down"} size={20} color={colors.subText} /></TouchableOpacity></View>
            {showDeliveryOptions && (
              <View style={styles.deliveryDropdown}>
                <TouchableOpacity style={styles.deliveryOption} onPress={() => handleSelectDelivery('Same-Day Delivery')}><Text style={styles.deliveryOptionText}>Same-Day Delivery</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deliveryOption} onPress={() => handleSelectDelivery('Pre-Order Exclusive')}><Text style={styles.deliveryOptionText}>Pre-Order Exclusive</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.deliveryOption, { borderBottomWidth: 0 }]} onPress={() => handleSelectDelivery('Next-Day Specials')}><Text style={styles.deliveryOptionText}>Next-Day Specials</Text></TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.deliveryRow}><Text style={styles.deliveryLabel}>Date</Text><TouchableOpacity onPress={() => showMode('date')} style={styles.datePickerButton}><Text style={styles.datePickerText}>{format(date, 'MMM dd, yyyy')}</Text><Feather name="calendar" size={20} color={colors.subText} /></TouchableOpacity></View>
          <View style={styles.deliveryRow}><Text style={styles.deliveryLabel}>Time</Text><TouchableOpacity onPress={() => showMode('time')} style={styles.datePickerButton}><Text style={styles.datePickerText}>{format(time, 'p')}</Text><Feather name="clock" size={20} color={colors.subText} /></TouchableOpacity></View>
        </View>
        {showPicker && (<DateTimePicker testID="dateTimePicker" value={pickerMode === 'date' ? date : time} mode={pickerMode} is24Hour={true} display="default" onChange={onPickerChange} />)}
        <View style={styles.sectionContainer}><Text style={styles.sectionTitle}>Order Notes</Text><TextInput style={styles.notesInput} placeholder="Add special instructions for your order..." placeholderTextColor={colors.subText} value={orderNotes} onChangeText={setOrderNotes} multiline /></View>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <TouchableOpacity onPress={() => setPaymentMethod('Cash on Delivery')} style={styles.paymentOption}><Icon name={paymentMethod === 'Cash on Delivery' ? "radiobox-marked" : "radiobox-blank"} size={24} color={colors.primary} /><Text style={styles.paymentOptionText}>Cash On Delivery </Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setPaymentMethod('GCash')} style={styles.paymentOption}><Icon name={paymentMethod === 'GCash' ? "radiobox-marked" : "radiobox-blank"} size={24} color={colors.primary} /><Image source={gcashLogo} style={styles.gcashLogo} /><Text style={styles.paymentOptionText}>GCash</Text></TouchableOpacity>
          {paymentMethod === 'GCash' && (
            <View style={styles.paymentInstructions}>
              <Text style={styles.instructionsTitle}>Payment Instructions</Text>
              <View style={styles.instructionRow}><Icon name="file-document-outline" size={20} color={colors.subText} /><View style={styles.instructionTextContainer}><Text style={styles.instructionText}>Send payment to:</Text><Text style={styles.instructionDetail}>Name: Flourish Flower</Text><Text style={styles.instructionDetail}>Mobile No: 09219348606</Text></View></View>
              <Image source={qrCodeImage} style={styles.qrCode} /><Text style={styles.instructionFooter}>After sending, upload a screenshot and/or enter your GCASH reference number below.</Text>
              {proofOfPaymentImage && (<View style={styles.imagePreviewContainer}><Image source={{ uri: proofOfPaymentImage }} style={styles.imagePreview} /><TouchableOpacity style={styles.removeImageButton} onPress={() => setProofOfPaymentImage(null)}><Feather name="x" size={16} color="#fff" /></TouchableOpacity></View>)}
              <TouchableOpacity style={styles.uploadButton} onPress={handleSelectProofImage}><Text style={styles.uploadButtonText}>{proofOfPaymentImage ? 'Change Proof of Payment' : 'Upload Proof of Payment'}</Text></TouchableOpacity>
              <TextInput style={styles.referenceInput} placeholder="Enter Reference Number (optional)" placeholderTextColor={colors.subText} value={referenceNumber} onChangeText={setReferenceNumber} />
            </View>
          )}
        </View>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}><Text style={styles.summaryText}>Subtotal:</Text><Text style={styles.summaryValue}>₱{originalSubtotal.toFixed(2)}</Text></View>
          {isNewUser && (<View style={styles.summaryRow}><Text style={styles.summaryText}>New User Discount (5%):</Text><Text style={[styles.summaryValue, {color: colors.discount}]}>- ₱{newUserDiscount.toFixed(2)}</Text></View>)}
          <View style={styles.summaryRow}><Text style={styles.summaryText}>Delivery Fee:</Text><Text style={styles.summaryValue}>₱{deliveryFee.toFixed(2)}</Text></View>
          <TouchableOpacity style={styles.summaryRow} onPress={() => setVoucherModalVisible(true)}><Text style={styles.summaryText}>Voucher:</Text><Text style={[styles.summaryValue, {color: colors.primary}]}>{appliedVoucher ? `- ₱${voucherDiscount.toFixed(2)}` : 'Apply Voucher >'}</Text></TouchableOpacity>
          <View style={styles.divider} /><View style={styles.summaryRow}><Text style={styles.totalText}>Total:</Text><Text style={styles.totalValue}>₱{totalAmount.toFixed(2)}</Text></View>
        </View>
      </ScrollView>
      <View style={styles.footer}><View style={styles.footerPrice}><Text style={styles.footerTotalLabel}>Total Amount</Text><Text style={styles.footerTotalValue}>₱{totalAmount.toFixed(2)}</Text></View>
        <TouchableOpacity style={[styles.placeOrderButton, (isLoading || isUploading) && styles.disabledButton]} onPress={handlePlaceOrder} disabled={isLoading || isUploading}>
          {isUploading ? (<Text style={styles.placeOrderButtonText}>Uploading Proof...</Text>) : isLoading ? (<ActivityIndicator size="small" color="#fff" />) : (<Text style={styles.placeOrderButtonText}>Place Order</Text>)}
        </TouchableOpacity>
      </View>
      <Modal animationType="slide" transparent={true} visible={isVoucherModalVisible} onRequestClose={() => setVoucherModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setVoucherModalVisible(false)}><View style={styles.voucherModalContent}>
            <Text style={styles.modalTitle}>Select a Voucher</Text>
            <ScrollView style={styles.voucherList}>{mockVouchers.map(voucher => (
                <TouchableOpacity key={voucher.id} style={styles.voucherItem} onPress={() => handleSelectVoucher(voucher)}>
                  <Icon name="ticket-percent-outline" size={30} color={colors.primary} style={styles.voucherIcon} />
                  <View style={styles.voucherInfo}><Text style={styles.voucherCode}>{voucher.code}</Text><Text style={styles.voucherDesc}>{voucher.description}</Text></View>
                </TouchableOpacity>))}
            </ScrollView>
        </View></TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
const getStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, container: { paddingBottom: 100 }, 
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text }, progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: colors.cardBackground },
  stepText: { fontSize: 14, color: colors.subText }, activeStepText: { color: colors.primary, fontWeight: 'bold' },
  sectionContainer: { marginTop: 12, backgroundColor: colors.cardBackground, padding: 15 }, sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  addressBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border }, addressIcon: { marginRight: 15 },
  addressDetails: { flex: 1 }, addressName: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 4 }, addressText: { fontSize: 14, color: colors.subText },
  productRow: { flexDirection: 'row', marginBottom: 15 }, productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 15 }, productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: 'bold', color: colors.text }, productMeta: { fontSize: 13, color: colors.subText, marginTop: 4 },
  priceContainer: { alignItems: 'flex-end' }, productPrice: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  notesInput: { height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, backgroundColor: colors.inputBackground, color: colors.text, fontSize: 15 },
  summaryContainer: { backgroundColor: colors.cardBackground, padding: 15, marginTop: 12 }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryText: { fontSize: 15, color: colors.subText }, summaryValue: { fontSize: 15, color: colors.text, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 }, totalText: { fontSize: 16, color: colors.text, fontWeight: 'bold' },
  totalValue: { fontSize: 18, color: colors.primary, fontWeight: 'bold' }, footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingVertical: 10, paddingBottom: 20 },
  footerPrice: { flex: 1 }, footerTotalLabel: { fontSize: 14, color: colors.subText }, footerTotalValue: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  placeOrderButton: { backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, justifyContent: 'center', alignItems: 'center', minWidth: 150 },
  placeOrderButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }, modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  voucherModalContent: { backgroundColor: colors.cardBackground, borderRadius: 20, padding: 20, width: '90%' }, modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20, textAlign: 'center' },
  voucherList: { maxHeight: 250 }, voucherItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  voucherIcon: { marginRight: 15 }, voucherInfo: { flex: 1 }, voucherCode: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  voucherDesc: { fontSize: 14, color: colors.subText, marginTop: 4 }, successModalContent: { width: '90%', backgroundColor: colors.cardBackground, borderRadius: 20, padding: 30, alignItems: 'center', shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  orderPlacedTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text }, orderPlacedSubtitle: { fontSize: 15, color: colors.subText, textAlign: 'center', marginVertical: 15, lineHeight: 22 },
  trackOrderButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30, marginTop: 10, width: '100%', alignItems: 'center' },
  trackOrderButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }, backToHomeButton: { backgroundColor: 'transparent', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30, marginTop: 10, width: '100%', alignItems: 'center' },
  backToHomeButtonText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' }, deliveryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  deliveryLabel: { fontSize: 15, color: colors.text, fontWeight: '500' }, datePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 15, width: '60%', backgroundColor: colors.inputBackground },
  datePickerText: { fontSize: 15, color: colors.text }, deliveryDropdown: { alignSelf: 'flex-end', width: '60%', marginTop: 2, backgroundColor: colors.cardBackground, borderRadius: 8, borderWidth: 1, borderColor: colors.border, elevation: 3, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  deliveryOption: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border }, deliveryOptionText: { fontSize: 15, color: colors.text },
  paymentOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }, paymentOptionText: { fontSize: 16, color: colors.text, marginLeft: 15 },
  gcashLogo: { width: 25, height: 25, resizeMode: 'contain', marginLeft: 15 }, paymentInstructions: { marginTop: 15, padding: 15, backgroundColor: colors.inputBackground, borderRadius: 8 },
  instructionsTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 15 }, instructionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  instructionTextContainer: { marginLeft: 10 }, instructionText: { fontSize: 15, color: colors.text }, instructionDetail: { fontSize: 14, color: colors.subText, marginTop: 4 },
  qrCode: { width: 150, height: 150, alignSelf: 'center', marginVertical: 15 }, instructionFooter: { fontSize: 14, color: colors.subText, textAlign: 'center', marginBottom: 15 },
  uploadButton: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.primary, borderRadius: 25, paddingVertical: 12, alignItems: 'center', marginBottom: 15 },
  uploadButtonText: { color: colors.primary, fontSize: 15, fontWeight: 'bold' }, referenceInput: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 15 },
  imagePreviewContainer: { alignItems: 'center', marginBottom: 15, }, imagePreview: { width: 150, height: 150, borderRadius: 8, borderWidth: 1, borderColor: colors.border, },
  removeImageButton: { position: 'absolute', top: -8, right: (width * 0.9 - 180) / 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', },
  disabledButton: { backgroundColor: '#E0E0E0', },
});
export default OrderCheckout;