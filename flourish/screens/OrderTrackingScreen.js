// screens/OrderTrackingScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  ActivityIndicator, TextInput, Alert, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ThemeContext from '../context/ThemeContext';
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'; 
import { db } from '../Backend/firebaseConfig';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';

// --- Helper Components (Moved Outside & Rewritten for Stability) ---

const StarRating = ({ rating, setRating, feedbackExists, colors }) => (
  <View style={getStyles(colors).starContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} onPress={() => setRating(star)} disabled={feedbackExists}>
        <Icon 
          name={star <= rating ? 'star' : 'star-outline'} 
          size={35} 
          color={star <= rating ? '#FFD700' : colors.subText} 
        />
      </TouchableOpacity>
    ))}
  </View>
);

// Rewritten Timeline component to be more explicit and avoid rendering bugs.
const Timeline = ({ status, colors }) => {
  const styles = getStyles(colors);
  const allStatuses = [
    { key: 'Pending', label: 'Processing', icon: 'check-circle' },
    { key: 'Processing', label: 'Confirmed', icon: 'sync' },
    { key: 'Shipped', label: 'Shipped', icon: 'truck-fast' },
    { key: 'Delivered', label: 'Delivered', icon: 'home-variant' },
  ];
  const currentStatusIndex = allStatuses.findIndex(s => s.key === status);

  return (
    <View style={styles.timelineContainer}>
      {allStatuses.map((step, index) => {
        const isActive = index <= currentStatusIndex;
        return (
          // Using a Fragment here is safe as its children are proper components.
          <React.Fragment key={step.key}>
            <View style={styles.timelineStep}>
              <View style={[styles.timelineIconContainer, isActive ? styles.timelineIconActive : null]}>
                <Icon name={step.icon} size={20} color={isActive ? '#fff' : colors.subText} />
              </View>
              <Text style={[styles.timelineLabel, isActive ? styles.timelineLabelActive : null]}>{step.label}</Text>
            </View>
            {/* Using a ternary operator is the safest way for conditional rendering. */}
            {index < allStatuses.length - 1 ? (
              <View style={[styles.timelineConnector, isActive ? styles.timelineConnectorActive : null]} />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
};


// --- Main Component ---

const OrderTrackingScreen = ({ route, navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const orderId = route.params?.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackImage, setFeedbackImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [generalFeedbackImage, setGeneralFeedbackImage] = useState(null); 
  const [isGeneralFeedbackSubmitting, setIsGeneralFeedbackSubmitting] = useState(false);

  // Updated state for cancellation
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState(null);
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // START: MODIFIED CODE
  // State for the report issue modal
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportCategory, setReportCategory] = useState(null);
  const [reportDetails, setReportDetails] = useState('');
  const [reportImage, setReportImage] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  // END: MODIFIED CODE

  const PREDEFINED_REASONS = [
    'Changed my mind',
    'Found a cheaper option',
    'Order took too long',
    'Wrong item selected',
  ];

  // START: MODIFIED CODE
  const REPORT_CATEGORIES = ['Complaint', 'Damage', 'Refund'];
  // END: MODIFIED CODE

  const colors = {
    background: isDarkMode ? '#1a1a2e' : '#F7E9E9',
    card: isDarkMode ? '#2c2c44' : '#fff',
    text: isDarkMode ? '#000' : '#333',
    subText: isDarkMode ? '#bbb' : '#666',
    primary: '#D81B60',
    border: isDarkMode ? '#444' : '#E0E0E0',
    timelineActive: '#D81B60',
    timelineInactive: isDarkMode ? '#555' : '#ccc',
    inputBackground: isDarkMode ? '#3d3d5f' : '#F0F0F0',
    adminReplyBg: isDarkMode ? '#3d3d5f' : '#FFF0F5',
    adminReplyText: isDarkMode ? '#E0E0E0' : '#555',
    danger: '#E53935',
  };
  const styles = getStyles(colors);

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided.");
      setLoading(false);
      return;
    }
    const orderDocRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(orderDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const orderData = { id: docSnapshot.id, ...docSnapshot.data() };
        setOrder(orderData);
        if (orderData.feedback?.rating) setRating(orderData.feedback.rating);
        if (orderData.feedback?.text) setFeedback(orderData.feedback.text);
        if (orderData.feedback?.imageUrl) setFeedbackImage({ uri: orderData.feedback.imageUrl });
      } else {
        setError("Order not found.");
        setOrder(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId]);

  const handleImagePick = async (setImageState) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setImageState(result.assets[0]);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating first.");
      return;
    }
    setIsSubmitting(true);
    let imageUrl = null;
    if (feedbackImage && feedbackImage.base64) {
      const CLOUDINARY_CLOUD_NAME = "djhtu0rzz";
      const CLOUDINARY_UPLOAD_PRESET = "my_app_preset";
      const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${feedbackImage.base64}`);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      try {
        const response = await fetch(apiUrl, { body: formData, method: 'POST' });
        const responseData = await response.json();
        if (responseData.secure_url) {
          imageUrl = responseData.secure_url;
        } else {
          throw new Error(responseData.error.message || 'Image URL not found');
        }
      } catch (e) {
        Alert.alert("Upload Failed", `Could not upload the image. Reason: ${e.message}`);
        setIsSubmitting(false);
        return;
      }
    }

    const orderDocRef = doc(db, 'orders', orderId);
    const feedbackCollectionRef = collection(db, 'feedback');
    try {
      const feedbackData = { rating, text: feedback.trim(), imageUrl, createdAt: serverTimestamp(), orderId: order.id, customerName: order.customerName || 'Anonymous', customerEmail: order.customerEmail || '', productName: order.product?.name || 'N/A', productImageUrl: order.product?.imageUrl || '', status: 'new', adminReply: null };
      await addDoc(feedbackCollectionRef, feedbackData);
      await updateDoc(orderDocRef, { feedback: { rating: feedbackData.rating, text: feedbackData.text, imageUrl: feedbackData.imageUrl, submittedAt: new Date() } });
      Alert.alert("Feedback Submitted", "Thank you for your review!");
    } catch (error) {
      console.error("Error submitting feedback: ", error);
      Alert.alert("Error", "Could not submit your feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneralFeedbackSubmit = async () => {
    if (generalFeedback.trim() === '' && !generalFeedbackImage) {
      Alert.alert("Feedback Required", "Please enter your feedback or add a photo before submitting.");
      return;
    }
    setIsGeneralFeedbackSubmitting(true);

    let imageUrl = null;
    if (generalFeedbackImage && generalFeedbackImage.base64) {
      const CLOUDINARY_CLOUD_NAME = "djhtu0rzz";
      const CLOUDINARY_UPLOAD_PRESET = "my_app_preset";
      const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${generalFeedbackImage.base64}`);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      try {
        const response = await fetch(apiUrl, {
          body: formData,
          method: 'POST',
        });
        const responseData = await response.json();
        
        if (responseData.secure_url) {
          imageUrl = responseData.secure_url;
        } else {
          throw new Error(responseData.error.message || 'Image URL not found');
        }
      } catch (e) {
        Alert.alert("Upload Failed", `Could not upload the image. Reason: ${e.message}`);
        setIsGeneralFeedbackSubmitting(false);
        return;
      }
    }
    
    try {
      await addDoc(collection(db, 'generalFeedback'), {
        text: generalFeedback.trim(),
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        customerName: order?.customerName || 'Anonymous',
        customerEmail: order?.customerEmail || 'N/A',
        status: 'new',
        adminReply: null,
      });
      Alert.alert("Thank You!", "Your general feedback has been received.");
      setGeneralFeedback('');
      setGeneralFeedbackImage(null);
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error submitting general feedback: ", error);
      Alert.alert("Error", "Could not submit your general feedback.");
    } finally {
      setIsGeneralFeedbackSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    let finalReason = '';

    if (selectedCancelReason === 'Other') {
        if (customCancelReason.trim() === '') {
            Alert.alert("Reason Required", "Please provide your custom reason for cancellation.");
            return;
        }
        finalReason = customCancelReason.trim();
    } else {
        if (!selectedCancelReason) {
            Alert.alert("Reason Required", "Please select a reason for cancelling your order.");
            return;
        }
        finalReason = selectedCancelReason;
    }

    setIsCancelling(true);
    const orderDocRef = doc(db, 'orders', orderId);
    
    // Get a reference to the notifications collection
    const notificationsCollectionRef = collection(db, 'notifications');

    try {
        await updateDoc(orderDocRef, {
            status: 'Cancelled',
            cancellationReason: finalReason,
            cancelledAt: serverTimestamp(),
        });
        
        // Create a notification document for the admin
        await addDoc(notificationsCollectionRef, {
            type: 'ORDER_CANCELLED',
            message: `Order #${orderId.substring(0, 6).toUpperCase()} was cancelled. Reason: ${finalReason}`,
            orderId: orderId,
            timestamp: serverTimestamp(),
            status: 'unread',
        });

        Alert.alert("Order Cancelled", "Your order has been successfully cancelled.");
        setIsCancelModalVisible(false);
        setSelectedCancelReason(null);
        setCustomCancelReason('');

    } catch (error) {
        console.error("Error cancelling order: ", error);
        Alert.alert("Error", "Could not cancel the order. Please try again.");
    } finally {
        setIsCancelling(false);
    }
  };

  // START: MODIFIED CODE
  const handleReportSubmit = async () => {
    if (!reportCategory) {
      Alert.alert("Category Required", "Please select a category for your report.");
      return;
    }
    if (reportDetails.trim() === '') {
      Alert.alert("Details Required", "Please describe the issue in detail.");
      return;
    }
    setIsSubmittingReport(true);

    let imageUrl = null;
    // Image upload logic (reused from other submit handlers)
    if (reportImage && reportImage.base64) {
      const CLOUDINARY_CLOUD_NAME = "djhtu0rzz";
      const CLOUDINARY_UPLOAD_PRESET = "my_app_preset";
      const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${reportImage.base64}`);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      try {
        const response = await fetch(apiUrl, { body: formData, method: 'POST' });
        const responseData = await response.json();
        if (responseData.secure_url) {
          imageUrl = responseData.secure_url;
        } else {
          throw new Error(responseData.error.message || 'Image URL not found');
        }
      } catch (e) {
        Alert.alert("Upload Failed", `Could not upload the image. Reason: ${e.message}`);
        setIsSubmittingReport(false);
        return;
      }
    }
    
    // Firestore submission logic
    const reportsCollectionRef = collection(db, 'reports');
    const orderDocRef = doc(db, 'orders', orderId);

    try {
      // Add to 'reports' collection
      await addDoc(reportsCollectionRef, {
        orderId: order.id,
        category: reportCategory,
        details: reportDetails.trim(),
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        customerName: order?.customerName || 'Anonymous',
        customerEmail: order?.customerEmail || 'N/A',
        status: 'new', // For admin tracking
      });

      // Update the order to show a report was filed
      await updateDoc(orderDocRef, {
        reportInfo: {
            category: reportCategory,
            submittedAt: serverTimestamp(),
        }
      });

      Alert.alert("Report Submitted", "Your report has been sent to the admin team. We will get back to you shortly.");
      
      // Reset state and close modal
      setIsReportModalVisible(false);
      setReportCategory(null);
      setReportDetails('');
      setReportImage(null);

    } catch (error) {
      console.error("Error submitting report: ", error);
      Alert.alert("Error", "Could not submit your report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };
  // END: MODIFIED CODE

  if (loading) return (<SafeAreaView style={[styles.safeArea, styles.centerScreen]}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>);
  if (error || !order) return (<SafeAreaView style={[styles.safeArea, styles.centerScreen]}><Icon name="alert-circle-outline" size={50} color={colors.primary} /><Text style={{ color: colors.text, marginTop: 10 }}>{error || "Could not find order details."}</Text></SafeAreaView>);

  const isCancellable = () => {
    if (!order?.timestamp || (order.status !== 'Pending' && order.status !== 'Processing')) {
      return false;
    }
    const orderTime = order.timestamp.toDate().getTime();
    const currentTime = new Date().getTime();
    const tenMinutesInMillis = 10 * 60 * 1000;
    return (currentTime - orderTime) < tenMinutesInMillis;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Icon name="arrow-left" size={24} color={colors.text} /></TouchableOpacity><Text style={styles.headerTitle}>Track Order</Text></View>
      
      {/* General Feedback Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>General Feedback</Text>
            <Text style={styles.modalSubtitle}>
              Have suggestions or comments about our service or app? Let us know!
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Tell us what you think..."
              placeholderTextColor={colors.subText}
              value={generalFeedback}
              onChangeText={setGeneralFeedback}
              multiline
            />
            
            <TouchableOpacity 
              style={styles.imagePickerButton} 
              onPress={() => handleImagePick(setGeneralFeedbackImage)}
            >
              <Icon name="camera-plus-outline" size={22} color={colors.primary} />
              <Text style={styles.imagePickerText}>{generalFeedbackImage ? 'Change Photo' : 'Add Photo'}</Text>
            </TouchableOpacity>
            {generalFeedbackImage ? (
              <Image source={{ uri: generalFeedbackImage.uri }} style={styles.generalFeedbackImagePreview} />
            ) : null}

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => {
                setIsModalVisible(false);
                setGeneralFeedback('');
                setGeneralFeedbackImage(null);
              }}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSubmitButton} 
                onPress={handleGeneralFeedbackSubmit}
                disabled={isGeneralFeedbackSubmitting}
              >
                {isGeneralFeedbackSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancellation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isCancelModalVisible}
        onRequestClose={() => setIsCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure? This action cannot be undone. Please select a reason below.
            </Text>
            
            <View style={styles.reasonContainer}>
              {PREDEFINED_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonButton,
                    selectedCancelReason === reason && styles.selectedReasonButton,
                  ]}
                  onPress={() => setSelectedCancelReason(reason)}
                >
                  <Text style={[
                    styles.reasonButtonText,
                    selectedCancelReason === reason && styles.selectedReasonButtonText
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.reasonButton,
                  selectedCancelReason === 'Other' && styles.selectedReasonButton,
                ]}
                onPress={() => setSelectedCancelReason('Other')}
              >
                <Text style={[
                  styles.reasonButtonText,
                  selectedCancelReason === 'Other' && styles.selectedReasonButtonText
                ]}>
                  Other...
                </Text>
              </TouchableOpacity>
            </View>

            {selectedCancelReason === 'Other' && (
              <TextInput
                style={[styles.modalInput, { marginTop: 10 }]}
                placeholder="Please specify your reason..."
                placeholderTextColor={colors.subText}
                value={customCancelReason}
                onChangeText={setCustomCancelReason}
                multiline
              />
            )}

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => {
                setIsCancelModalVisible(false);
                setSelectedCancelReason(null);
                setCustomCancelReason('');
              }}>
                <Text style={styles.modalCancelButtonText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSubmitButton, { backgroundColor: colors.danger }]} 
                onPress={handleCancelOrder}
                disabled={isCancelling}
              >
                {isCancelling ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Confirm Cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* START: MODIFIED CODE */}
      {/* Report Issue Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isReportModalVisible}
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report an Issue</Text>
            <Text style={styles.modalSubtitle}>
              Please select a category and describe the issue with your order.
            </Text>
            
            <View style={styles.reasonContainer}>
              {REPORT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.reasonButton,
                    reportCategory === category && styles.selectedReasonButton,
                  ]}
                  onPress={() => setReportCategory(category)}
                >
                  <Text style={[
                    styles.reasonButtonText,
                    reportCategory === category && styles.selectedReasonButtonText
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
                style={styles.modalInput}
                placeholder="Please describe the issue in detail..."
                placeholderTextColor={colors.subText}
                value={reportDetails}
                onChangeText={setReportDetails}
                multiline
            />

            <TouchableOpacity 
              style={styles.imagePickerButton} 
              onPress={() => handleImagePick(setReportImage)}
            >
              <Icon name="camera-plus-outline" size={22} color={colors.primary} />
              <Text style={styles.imagePickerText}>{reportImage ? 'Change Photo' : 'Add Photo (Optional)'}</Text>
            </TouchableOpacity>
            {reportImage ? (
              <Image source={{ uri: reportImage.uri }} style={styles.generalFeedbackImagePreview} />
            ) : null}

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => {
                setIsReportModalVisible(false);
                setReportCategory(null);
                setReportDetails('');
                setReportImage(null);
              }}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSubmitButton} 
                onPress={handleReportSubmit}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Report</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* END: MODIFIED CODE */}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.orderSummaryHeader}>
            <Text style={styles.cardTitle}>Order ID: #{order.id.substring(0, 8).toUpperCase()}</Text>
            {/* START: MODIFIED CODE */}
            <View style={styles.headerActions}>
              {isCancellable() && (
                <TouchableOpacity onPress={() => setIsCancelModalVisible(true)} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel Order</Text>
                </TouchableOpacity>
              )}
              { (order.status === 'Shipped' || order.status === 'Delivered') && !order.reportInfo && (
                <TouchableOpacity onPress={() => setIsReportModalVisible(true)} style={styles.reportButton}>
                   <Icon name="alert-circle-outline" size={14} color={colors.primary} style={{ marginRight: 5 }}/>
                   <Text style={styles.reportButtonText}>Report Issue</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* END: MODIFIED CODE */}
          </View>
           {/* START: MODIFIED CODE */}
           {order.reportInfo && (
            <View style={styles.reportInfoBadge}>
                <Icon name="information" size={16} color={colors.primary} />
                <Text style={styles.reportInfoText}>
                    An issue was reported for this order ({order.reportInfo.category}).
                </Text>
            </View>
          )}
          {/* END: MODIFIED CODE */}
          <View style={[
              styles.statusBadge, 
              { backgroundColor: order.status === 'Cancelled' ? colors.danger : colors.primary }
            ]}>
              <Text style={styles.statusBadgeText}>{order.status}</Text>
          </View>
          <Text style={styles.orderDate}>
            Placed on: {order.timestamp ? format(order.timestamp.toDate(), 'MMM dd, yyyy') : 'N/A'}
          </Text>
        </View>

        <View style={styles.card}>
          {order.status === 'Cancelled' ? (
            <View style={styles.cancelledStatusContainer}>
                <Icon name="close-circle" size={24} color={colors.danger} />
                <Text style={styles.cancelledStatusText}>This order was cancelled.</Text>
                {order.cancellationReason && (
                    <Text style={styles.cancellationReasonText}>Reason: {order.cancellationReason}</Text>
                )}
            </View>
          ) : (
            <Timeline status={order.status} colors={colors} />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Order</Text>
          <View style={styles.productRow}>
            <Image source={{ uri: order.product.imageUrl }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{order.product.name}</Text>
              <Text style={styles.productMeta}>
                {`Size: ${order.product.size} • Qty: ${order.product.quantity}`}
              </Text>
            </View>
            <Text style={styles.productPrice}>₱{order.product.price.toFixed(2)}</Text>
          </View>
        </View>
        
        {order.status === 'Delivered' ? (
          <View style={styles.card}>
            <View style={styles.cardHeaderContainer}>
              <Text style={styles.cardTitle}>Rate Your Order</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(true)}>
                <Text style={styles.generalFeedbackButton}>General Feedback</Text>
              </TouchableOpacity>
            </View>
            {order.feedback ? (
                <View>
                  <Text style={styles.ratingSubtitle}>Thank you for your feedback!</Text>
                  <StarRating rating={rating} setRating={setRating} feedbackExists={!!order.feedback} colors={colors} />
                  {order.feedback.text ? (<View style={styles.feedbackDisplay}><Text style={styles.feedbackLabel}>Your feedback:</Text><Text style={styles.feedbackText}>{order.feedback.text}</Text></View>) : null}
                  {order.feedback.imageUrl ? (<View style={styles.feedbackDisplay}><Text style={styles.feedbackLabel}>Your photo:</Text><Image source={{ uri: order.feedback.imageUrl }} style={styles.feedbackImage} /></View>) : null}
                  {order.adminReply ? ( <View style={styles.adminReplyContainer}> <View style={styles.adminReplyHeader}> <Icon name="storefront-outline" size={20} color={colors.primary} /> <Text style={styles.adminReplyLabel}>A Reply from the Shop</Text> </View> <Text style={styles.adminReplyText}>{order.adminReply}</Text> </View> ) : null}
                </View>
            ) : (
              <View>
                <Text style={styles.ratingSubtitle}>How was your experience?</Text>
                <StarRating rating={rating} setRating={setRating} feedbackExists={!!order.feedback} colors={colors} />
                <TextInput style={styles.feedbackInput} placeholder="Tell us about your experience..." placeholderTextColor={colors.subText} value={feedback} onChangeText={setFeedback} multiline />
                
                <TouchableOpacity style={styles.imagePickerButton} onPress={() => handleImagePick(setFeedbackImage)}>
                  <Icon name="camera-plus-outline" size={22} color={colors.primary} />
                  <Text style={styles.imagePickerText}>{feedbackImage ? 'Change Photo' : 'Add Photo'}</Text>
                </TouchableOpacity>
                {feedbackImage ? <Image source={{ uri: feedbackImage.uri }} style={styles.imagePreview} /> : null}

                <TouchableOpacity style={styles.submitButton} onPress={handleFeedbackSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Feedback</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    centerScreen: { justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
    backButton: { position: 'absolute', left: 20 },
    headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
    // START: MODIFIED CODE
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    reportButtonText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 12,
    },
    reportInfoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBackground,
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
    },
    reportInfoText: {
        color: colors.subText,
        fontSize: 13,
        marginLeft: 8,
        flex: 1,
    },
    // END: MODIFIED CODE
    scrollContent: { padding: 15 },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 20, marginBottom: 15 },
    orderSummaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    generalFeedbackButton: { color: colors.primary, fontWeight: '600', fontSize: 14 },
    orderDate: { fontSize: 13, color: colors.subText, marginTop: 5 },
    statusBadge: { borderRadius: 15, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
    statusBadgeText: { color: '#fff', fontWeight: 'bold' },
    timelineContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    timelineStep: { alignItems: 'center' },
    timelineIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.timelineInactive, justifyContent: 'center', alignItems: 'center' },
    timelineIconActive: { backgroundColor: colors.timelineActive },
    timelineLabel: { fontSize: 12, color: colors.subText, marginTop: 8 },
    timelineLabelActive: { color: colors.timelineActive, fontWeight: 'bold' },
    timelineConnector: { flex: 1, height: 4, backgroundColor: colors.timelineInactive },
    timelineConnectorActive: { backgroundColor: colors.timelineActive },
    productRow: { flexDirection: 'row', alignItems: 'center' },
    productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 15 },
    productInfo: { flex: 1 },
    productName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    productMeta: { fontSize: 14, color: colors.subText, marginTop: 4 },
    productPrice: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    ratingSubtitle: { fontSize: 14, color: colors.subText, marginBottom: 15, textAlign: 'center' },
    starContainer: { flexDirection: 'row', justifyContent: 'space-around' },
    feedbackInput: { backgroundColor: colors.inputBackground, color: colors.text, borderRadius: 10, padding: 15, textAlignVertical: 'top', marginTop: 20, minHeight: 100, borderWidth: 1, borderColor: colors.border },
    submitButton: { backgroundColor: colors.primary, borderRadius: 25, paddingVertical: 12, alignItems: 'center', marginTop: 15, minHeight: 48, justifyContent: 'center' },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    feedbackDisplay: { marginTop: 20, backgroundColor: colors.inputBackground, borderRadius: 10, padding: 15 },
    feedbackLabel: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
    feedbackText: { fontSize: 14, color: colors.subText },
    adminReplyContainer: { marginTop: 15, backgroundColor: colors.adminReplyBg, borderRadius: 10, padding: 15, borderLeftWidth: 4, borderLeftColor: colors.primary },
    adminReplyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    adminReplyLabel: { fontSize: 15, fontWeight: 'bold', color: colors.primary, marginLeft: 8 },
    adminReplyText: { fontSize: 14, color: colors.adminReplyText, lineHeight: 20 },
    imagePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginTop: 15, backgroundColor: colors.inputBackground },
    imagePickerText: { color: colors.primary, marginLeft: 10, fontWeight: 'bold' },
    imagePreview: { width: '100%', height: 200, borderRadius: 10, marginTop: 15, resizeMode: 'cover' },
    feedbackImage: { width: '100%', height: 200, borderRadius: 10, marginTop: 5, resizeMode: 'cover' },

    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { width: '90%', backgroundColor: colors.card, borderRadius: 15, padding: 20, alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
    modalSubtitle: { fontSize: 14, color: colors.subText, textAlign: 'center', marginBottom: 20 },
    modalInput: { width: '100%', backgroundColor: colors.inputBackground, color: colors.text, borderRadius: 10, padding: 15, textAlignVertical: 'top', minHeight: 120, borderWidth: 1, borderColor: colors.border },
    modalButtonContainer: { flexDirection: 'row', marginTop: 20, width: '100%', justifyContent: 'space-between' },
    modalSubmitButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 25, paddingVertical: 12, alignItems: 'center', marginLeft: 5 },
    modalCancelButton: { flex: 1, backgroundColor: 'transparent', borderRadius: 25, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.subText, marginRight: 5 },
    modalCancelButtonText: { color: colors.subText, fontSize: 16, fontWeight: 'bold' },
    
    generalFeedbackImagePreview: {
      width: '100%',
      height: 150,
      borderRadius: 10,
      marginTop: 15,
      resizeMode: 'cover',
    },

    // New styles for cancellation
    cancelButton: {
        backgroundColor: colors.danger,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    cancelledStatusContainer: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    cancelledStatusText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.danger,
      marginTop: 8,
    },
    cancellationReasonText: {
      fontSize: 14,
      color: colors.subText,
      marginTop: 4,
      textAlign: 'center',
    },
    reasonContainer: {
        width: '100%',
        marginBottom: 5,
    },
    reasonButton: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 10,
    },
    selectedReasonButton: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    reasonButtonText: {
        color: colors.text,
        fontSize: 14,
    },
    selectedReasonButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default OrderTrackingScreen;