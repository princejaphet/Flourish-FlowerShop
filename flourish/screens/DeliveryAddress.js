import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@react-navigation/native';

const DeliveryAddress = ({ navigation }) => {
  const { dark: isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    streetAddress: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    deliveryInstructions: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAddress = async () => {
    const requiredFields = ['fullName', 'phoneNumber', 'streetAddress', 'city', 'state', 'zipCode'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      Alert.alert(
        'Required Fields',
        'Please fill in all required fields marked with *',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(isDarkMode);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={styles.container.backgroundColor} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={styles.headerText.color} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Delivery Address</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.formContainer}>
            {/* Contact Information Section */}
            <View style={styles.sectionHeader}>
              <Icon name="account-outline" size={24} color={isDarkMode ? '#FFF' : '#333'} />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={styles.placeholder.color}
                value={formData.fullName}
                onChangeText={(text) => handleInputChange('fullName', text)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor={styles.placeholder.color}
                keyboardType="phone-pad"
                value={formData.phoneNumber}
                onChangeText={(text) => handleInputChange('phoneNumber', text)}
              />
            </View>

            {/* Address Details Section */}
            <View style={styles.sectionHeader}>
              <Icon name="map-marker-outline" size={24} color={isDarkMode ? '#FFF' : '#333'} />
              <Text style={styles.sectionTitle}>Address Details</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Street Address <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Enter street address"
                placeholderTextColor={styles.placeholder.color}
                value={formData.streetAddress}
                onChangeText={(text) => handleInputChange('streetAddress', text)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Apartment, Suite, etc. (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter apartment or suite number"
                placeholderTextColor={styles.placeholder.color}
                value={formData.apartment}
                onChangeText={(text) => handleInputChange('apartment', text)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>City <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Enter city"
                placeholderTextColor={styles.placeholder.color}
                value={formData.city}
                onChangeText={(text) => handleInputChange('city', text)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>State <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Enter state"
                placeholderTextColor={styles.placeholder.color}
                value={formData.state}
                onChangeText={(text) => handleInputChange('state', text)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>ZIP Code <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Enter ZIP code"
                placeholderTextColor={styles.placeholder.color}
                keyboardType="number-pad"
                value={formData.zipCode}
                onChangeText={(text) => handleInputChange('zipCode', text)}
              />
            </View>

            {/* Delivery Instructions Section */}
            <View style={styles.sectionHeader}>
              <Icon name="note-text-outline" size={24} color={isDarkMode ? '#FFF' : '#333'} />
              <Text style={styles.sectionTitle}>Delivery Instructions</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Special Instructions (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add delivery instructions, security codes, etc."
                placeholderTextColor={styles.placeholder.color}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                value={formData.deliveryInstructions}
                onChangeText={(text) => handleInputChange('deliveryInstructions', text)}
              />
            </View>

            <View style={styles.noteContainer}>
              <Icon name="information-outline" size={20} color="#D81B60" />
              <Text style={styles.noteText}>
                Please ensure all required fields marked with * are filled in correctly for accurate delivery.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSaveAddress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="content-save-outline" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>Save Address</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


const getStyles = (isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7E9E9', // Keep original background color
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#333' : '#E0E0E0',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? '#333' : '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDarkMode ? '#FFF' : '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  headerText: {
    color: isDarkMode ? '#FFF' : '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#333' : '#E8E8E8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#333',
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#333',
    marginBottom: 8,
  },
  required: {
    color: '#D81B60',
    fontSize: 16,
  },
  input: {
    backgroundColor: isDarkMode ? '#2A2A3E' : '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: isDarkMode ? '#FFF' : '#333',
    borderWidth: 1,
    borderColor: isDarkMode ? '#444' : '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  placeholder: {
    color: isDarkMode ? '#888' : '#999',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: isDarkMode ? '#2A2A3E' : '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#D81B60',
  },
  noteText: {
    fontSize: 14,
    color: isDarkMode ? '#CCC' : '#666',
    marginLeft: 8,
    lineHeight: 20,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: isDarkMode ? '#1A1A2E' : '#F7E9E9',
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#333' : '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#D81B60',
    paddingVertical: 16,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D81B60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
});


export default DeliveryAddress;