// screens/SettingsScreen.js

import React, { useState, useContext } from 'react'; // <-- CORRECTED IMPORT
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../Backend/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';

const translations = {
  en: {
    settingsTitle: 'Settings',
    generalSection: 'General',
    themeOption: 'Theme',
    languageOption: 'Language',
    accountSection: 'Account',
    editProfileOption: 'Edit Profile',
    changePasswordOption: 'Change Password',
    manageAddressOption: 'Manage Address',
    notificationsSection: 'Notifications',
    pushNotificationsOption: 'Push Notifications',
    helpSupportSection: 'Help & Support',
    helpCenterOption: 'Help Center',
    contactSupportOption: 'Contact Support',
    generalFeedbackOption: 'General Feedback',
    appInfoSection: 'App Info',
    aboutAppOption: 'About App',
    termsOfServiceOption: 'Terms of Service',
    lightMode: 'Light',
    darkMode: 'Dark',
    chooseTheme: 'Choose Theme',
    chooseLanguage: 'Choose Language',
    english: 'English',
    spanish: 'Spanish',
    french: 'French',
    german: 'German',
    logout: 'Logout',
  },
};

const SettingsScreen = ({ navigation }) => {
  const { isDarkMode, toggleTheme, theme } = useTheme();
  const styles = getStyles(isDarkMode, theme);

  const [language] = useState('en');
  const [isPushEnabled, setIsPushEnabled] = useState(true);

  // General feedback modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [generalFeedbackImage, setGeneralFeedbackImage] = useState(null);
  const [isGeneralFeedbackSubmitting, setIsGeneralFeedbackSubmitting] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [appRating, setAppRating] = useState(0);
  
  // --- ADDED FOR SUPPORT FORM START ---
  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSupportSubmitting, setIsSupportSubmitting] = useState(false);
  // --- ADDED FOR SUPPORT FORM END ---

  const FEEDBACK_CATEGORIES = [
    'Bug Report',
    'Feature Request', 
    'User Interface',
    'Performance',
    'General Suggestion',
    'Compliment',
    'Other'
  ];

  const colors = {
    background: isDarkMode ? '#1a1a2e' : '#F7E9E9',
    card: isDarkMode ? '#2c2c44' : '#fff',
    text: isDarkMode ? '#000' : '#333',
    subText: isDarkMode ? '#bbb' : '#666',
    primary: '#D81B60',
    border: isDarkMode ? '#444' : '#E0E0E0',
    inputBackground: isDarkMode ? '#3d3d5f' : '#F0F0F0',
  };

  const handleImagePick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setGeneralFeedbackImage(result.assets[0]);
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
        category: 'General',
        appRating: appRating,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        customerName: 'Anonymous',
        customerEmail: 'N/A',
        status: 'new',
        adminReply: null,
        deviceInfo: {
          platform: 'mobile',
          timestamp: new Date().toISOString(),
        }
      });
      Alert.alert("Thank You!", "Your feedback helps us improve the app experience!");
      setGeneralFeedback('');
      setGeneralFeedbackImage(null);
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error submitting general feedback: ", error);
      Alert.alert("Error", "Could not submit your feedback. Please try again.");
    } finally {
      setIsGeneralFeedbackSubmitting(false);
    }
  };
  
  // --- ADDED FOR SUPPORT FORM START ---
  const handleSupportSubmit = async () => {
    if (supportSubject.trim() === '' || supportMessage.trim() === '') {
      Alert.alert("All Fields Required", "Please provide a subject and a message for your support request.");
      return;
    }
    setIsSupportSubmitting(true);
    
    try {
      await addDoc(collection(db, 'supportTickets'), {
        subject: supportSubject.trim(),
        message: supportMessage.trim(),
        createdAt: serverTimestamp(),
        status: 'new',
      });
      Alert.alert("Support Request Sent", "Our team will get back to you as soon as possible. Thank you!");
      setSupportSubject('');
      setSupportMessage('');
      setIsSupportModalVisible(false);
    } catch (error) {
      console.error("Error submitting support ticket: ", error);
      Alert.alert("Error", "Could not submit your request. Please try again.");
    } finally {
      setIsSupportSubmitting(false);
    }
  };
  // --- ADDED FOR SUPPORT FORM END ---

  const Section = ({ title, children }) => (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );

  const SettingOption = ({ icon, text, onPress, hasSwitch, switchValue, onSwitchChange }) => (
    <TouchableOpacity style={styles.option} onPress={onPress} disabled={hasSwitch}>
      <Icon name={icon} size={22} style={styles.optionIcon} />
      <Text style={styles.optionText}>{text}</Text>
      <View style={styles.optionValueContainer}>
        {hasSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: '#767577', true: isDarkMode ? '#FF6B81' : '#D81B60' }}
            thumbColor={'#f4f3f4'}
          />
        ) : (
          onPress && <Icon name="chevron-right" size={22} style={styles.optionValue} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* General Feedback Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>General Feedback</Text>
              <Text style={styles.modalSubtitle}>
                Have suggestions or comments? Let us know!
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Tell us what you think..."
                  placeholderTextColor={colors.subText}
                  value={generalFeedback}
                  onChangeText={setGeneralFeedback}
                  multiline
                />
                <TouchableOpacity style={styles.imagePickerButton} onPress={handleImagePick}>
                  <Icon name="camera-plus-outline" size={22} color={colors.primary} />
                  <Text style={styles.imagePickerText}>{generalFeedbackImage ? 'Change Photo' : 'Add Photo'}</Text>
                </TouchableOpacity>
                {generalFeedbackImage && (
                  <Image source={{ uri: generalFeedbackImage.uri }} style={styles.generalFeedbackImagePreview} />
                )}
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity style={styles.modalCancelButton} onPress={() => setIsModalVisible(false)}>
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
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- ADDED FOR SUPPORT FORM START --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isSupportModalVisible}
        onRequestClose={() => setIsSupportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Contact Support</Text>
              <Text style={styles.modalSubtitle}>
                Tell us about the problem you're experiencing.
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Subject (e.g., Order Issue)"
                  placeholderTextColor={isDarkMode ? '#bbb' : '#666'}
                  value={supportSubject}
                  onChangeText={setSupportSubject}
                />
                <TextInput
                  style={[styles.modalInput, {minHeight: 150}]}
                  placeholder="Please describe your issue in detail..."
                  placeholderTextColor={isDarkMode ? '#bbb' : '#666'}
                  value={supportMessage}
                  onChangeText={setSupportMessage}
                  multiline
                />
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity style={styles.modalCancelButton} onPress={() => setIsSupportModalVisible(false)}>
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.modalSubmitButton} 
                    onPress={handleSupportSubmit}
                    disabled={isSupportSubmitting}
                  >
                    {isSupportSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Send Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* --- ADDED FOR SUPPORT FORM END --- */}

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{translations[language].settingsTitle}</Text>

        <Section title={translations[language].generalSection}>
          <SettingOption
            icon="theme-light-dark"
            text={translations[language].themeOption}
            hasSwitch
            switchValue={isDarkMode}
            onSwitchChange={toggleTheme}
          />
        </Section>

        <Section title={translations[language].accountSection}>
          <SettingOption
            icon="account-edit-outline"
            text={translations[language].editProfileOption}
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingOption
            icon="lock-outline"
            text={translations[language].changePasswordOption}
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <SettingOption
            icon="map-marker-outline"
            text={translations[language].manageAddressOption}
            onPress={() => navigation.navigate('ManageAddress')}
          />
        </Section>

        <Section title={translations[language].notificationsSection}>
          <SettingOption
            icon="bell-outline"
            text={translations[language].pushNotificationsOption}
            hasSwitch
            switchValue={isPushEnabled}
            onSwitchChange={() => setIsPushEnabled(!isPushEnabled)}
          />
        </Section>

        <Section title={translations[language].helpSupportSection}>
          <SettingOption icon="help-circle-outline" text={translations[language].helpCenterOption} onPress={() => {}} />
          <SettingOption 
            icon="headset" 
            text={translations[language].contactSupportOption} 
            onPress={() => setIsSupportModalVisible(true)}
          />
          <SettingOption 
            icon="message-text-outline" 
            text={translations[language].generalFeedbackOption} 
            onPress={() => setIsModalVisible(true)} 
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (isDarkMode, theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 30,
    color: theme.colors.text,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  option: {
    backgroundColor: theme.colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionIcon: {
    color: theme.colors.primary,
    marginRight: 15,
  },
  optionText: {
    flex: 1,
    fontSize: 17,
    color: theme.colors.text,
  },
  optionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionValue: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    marginRight: 5,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 0, 0, 0.6)' 
  },
  modalContent: { 
    width: '95%', 
    maxHeight: '90%',
    backgroundColor: isDarkMode ? '#2c2c44' : '#fff', 
    borderRadius: 20, 
    padding: 24, 
    alignItems: 'stretch' 
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: isDarkMode ? '#fff' : '#333',
    textAlign: 'center',
  },
  modalSubtitle: { 
    fontSize: 14, 
    color: isDarkMode ? '#bbb' : '#666', 
    textAlign: 'center', 
    marginBottom: 24,
    lineHeight: 20,
  },
  modalInput: { 
    width: '100%', 
    backgroundColor: isDarkMode ? '#383856' : '#F8F9FA', 
    color: isDarkMode ? '#fff' : '#333', 
    borderRadius: 12, 
    padding: 16, 
    textAlignVertical: 'top', 
    minHeight: 60,
    borderWidth: 1, 
    borderColor: isDarkMode ? '#444' : '#E0E0E0',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalButtonContainer: { 
    flexDirection: 'row', 
    marginTop: 12,
    gap: 12,
  },
  modalSubmitButton: { 
    flex: 2, 
    backgroundColor: '#D81B60', 
    borderRadius: 25, 
    paddingVertical: 16, 
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  modalCancelButton: { 
    flex: 1, 
    backgroundColor: 'transparent', 
    borderRadius: 25, 
    paddingVertical: 16, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: isDarkMode ? '#555' : '#D0D5DD',
    minHeight: 52,
    justifyContent: 'center',
  },
  modalCancelButtonText: { 
    color: isDarkMode ? '#bbb' : '#666', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  submitButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  imagePickerButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#D81B60', 
    borderStyle: 'dashed',
    marginBottom: 16, 
    backgroundColor: isDarkMode ? '#383856' : '#FDF2F8',
  },
  imagePickerText: { 
    color: '#D81B60', 
    marginLeft: 8, 
    fontWeight: '600',
    fontSize: 15,
  },
  generalFeedbackImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover',
  },
});

export default SettingsScreen;