// screens/ChangePasswordScreen.js

import React, { useState, useContext, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../Backend/firebaseConfig';
import ThemeContext from '../context/ThemeContext';

// Moved InputField outside of the main component to prevent re-rendering on every keystroke.
const InputField = ({ icon, placeholder, value, onChangeText, isVisible, setVisible, isDarkMode }) => {
    const styles = getStyles(isDarkMode); // Pass theme for correct styling
    return (
        <View style={styles.inputContainer}>
        <Icon name={icon} size={22} style={styles.inputIcon} />
        <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={isDarkMode ? '#8A8A8E' : '#C7C7CD'}
            secureTextEntry={!isVisible}
            value={value}
            onChangeText={onChangeText}
            autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setVisible(!isVisible)}>
            <Icon name={isVisible ? "eye-off-outline" : "eye-outline"} size={22} style={styles.eyeIcon} />
        </TouchableOpacity>
        </View>
    );
};


const ChangePasswordScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  // used useMemo to prevent styles from being recreated on every render
  const styles = useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Incomplete Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The new passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'The new password must be at least 6 characters long.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Authentication Error', 'No user is currently signed in.');
      return;
    }

    setLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert('Success', 'Your password has been updated successfully.');
      navigation.goBack();
    } catch (error) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'The current password you entered is incorrect.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      }
      Alert.alert('Password Change Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-left" size={28} style={styles.backIcon} />
            </TouchableOpacity>
            <Text style={styles.title}>Change Password</Text>
          </View>

          <View style={styles.container}>
            <Text style={styles.subtitle}>
              Your new password must be different from your previously used passwords.
            </Text>

            <InputField
              icon="lock-outline"
              placeholder="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              isVisible={isCurrentPasswordVisible}
              setVisible={setIsCurrentPasswordVisible}
              isDarkMode={isDarkMode}
            />
            <InputField
              icon="lock-plus-outline"
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              isVisible={isNewPasswordVisible}
              setVisible={setIsNewPasswordVisible}
              isDarkMode={isDarkMode}
            />
            <InputField
              icon="lock-check-outline"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isVisible={isConfirmPasswordVisible}
              setVisible={setIsConfirmPasswordVisible}
              isDarkMode={isDarkMode}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (isDarkMode) => StyleSheet.create({
  safeArea: {
    flex: 1,
    // --- CHANGE IS HERE ---
    backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
  },
  scrollView: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  backIcon: {
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    marginLeft: 15,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: isDarkMode ? '#A9A9A9' : '#666666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: isDarkMode ? '#333' : '#EAEAEA',
  },
  inputIcon: {
    color: isDarkMode ? '#FF6B81' : '#D81B60',
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  eyeIcon: {
    color: isDarkMode ? '#8A8A8E' : '#C7C7CD',
  },
  button: {
    backgroundColor: '#D81B60',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ChangePasswordScreen;

