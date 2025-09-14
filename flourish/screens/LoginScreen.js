import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Animated,
  Modal,
  ActivityIndicator,
} from 'react-native';
// --- MODIFICATION START ---
// We add useNavigationState to inspect the navigation history.
// Add useRoute to get navigation params
import { useNavigation, useNavigationState, useRoute } from '@react-navigation/native';
// --- MODIFICATION END ---
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import loginBg from '../assets/flowers3.png';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth } from '../Backend/firebaseConfig';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

// Reusable component for the floating label input effect
const FloatingLabelInput = ({ label, value, icon, rightIcon, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = useRef(new Animated.Value(value === '' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: isFocused || value !== '' ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: 'absolute',
    left: 42,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, -10],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 12],
    }),
    color: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: ['#888', '#000'],
    }),
    backgroundColor: '#FFF6EF',
    paddingHorizontal: 4,
    zIndex: 1,
  };

  const containerStyle = [
    styles.floatingInputContainer,
    { borderColor: isFocused ? '#E6005C' : '#EFEFEF' },
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.icon}>{icon}</View>
      <Animated.Text style={labelStyle}>{label}</Animated.Text>
      <TextInput
        {...props}
        value={value}
        style={styles.floatingInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {rightIcon && <View style={styles.eyeIcon}>{rightIcon}</View>}
    </View>
  );
};

// Forgot Password Modal Component
const ForgotPasswordModal = ({ visible, onClose, onSubmit, resetEmail, setResetEmail }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(resetEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(resetEmail.trim().toLowerCase());
      setResetEmail('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setResetEmail('');
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <FloatingLabelInput
            label="Email Address"
            value={resetEmail}
            onChangeText={setResetEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            autoFocus={true}
            icon={<MaterialCommunityIcons name="email-outline" size={20} color="#333" />}
          />

          <TouchableOpacity
            style={[styles.modalButton, isLoading && styles.modalButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.modalButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function LoginScreen() {
  const navigation = useNavigation();
  // --- MODIFICATION START ---
  const route = useRoute(); // Hook to get route params
  // --- MODIFICATION END ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get the current navigation state to check the history.
  const routesLength = useNavigationState(state => state.routes.length);
  const canGoBack = routesLength > 1;
  
  // This function now intelligently handles the back action.
  const handleGoBack = () => {
    if (canGoBack) {
      // If there's a screen in the history, go back to it.
      navigation.goBack();
    } else {
      // If there's no screen (like after logout), navigate to Welcome.
      navigation.replace('Welcome');
    }
  };

  const loadCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('email');
      const savedPassword = await AsyncStorage.getItem('password');
      if (savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (e) {
      console.error("Failed to load credentials from storage", e);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  // --- MODIFICATION START ---
  // This effect checks for credentials passed from the signup screen
  useEffect(() => {
    if (route.params?.email && route.params?.password) {
      setEmail(route.params.email);
      setPassword(route.params.password);
    }
  }, [route.params]);
  // --- MODIFICATION END ---


  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;

      if (user.emailVerified) {
        console.log('Email verified, user signed in successfully!');
        
        if (rememberMe) {
          await AsyncStorage.setItem('email', email.trim().toLowerCase());
          await AsyncStorage.setItem('password', password);
        } else {
          await AsyncStorage.removeItem('email');
          await AsyncStorage.removeItem('password');
        }
      } else {
        Alert.alert(
          'Verification Required',
          'Please verify your email address to log in. Check your inbox for the verification link.',
          [{ text: 'OK' }]
        );
        await auth.signOut();
      }

    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'An unexpected error occurred during login. Please try again.';  
      
      switch (error.code) {
        case 'auth/invalid-email':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please check your credentials.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact support.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          errorMessage = `Login failed: ${error.message}`;
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (resetEmail) => {
    try {
      const normalizedEmail = resetEmail.trim().toLowerCase();
      await sendPasswordResetEmail(auth, normalizedEmail);
      
      setShowForgotPasswordModal(false);
      setResetEmail('');

      Alert.alert(
        'Reset Email Sent! ✅',
        `We've sent a password reset link to ${normalizedEmail}.\n\nPlease check your inbox and spam folder.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send password reset email. Please try again.';
      
      // ... (error handling)
      
      Alert.alert('Password Reset Failed', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.imageContainer}>
          <Image source={loginBg} style={styles.topImage} resizeMode="cover" />
          {/* The back button now calls our new smart function. */}
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Login to your account</Text>

          <FloatingLabelInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            icon={<MaterialCommunityIcons name="email-outline" size={20} color="#333" />}
          />

          <FloatingLabelInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
            autoComplete="password"
            textContentType="password"
            icon={<MaterialCommunityIcons name="lock-outline" size={20} color="#333" />}
            rightIcon={
              <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                <Ionicons
                  name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#333"
                />
              </TouchableOpacity>
            }
          />
          
          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setResetEmail(email);
              setShowForgotPasswordModal(true);
            }}>
              <Text style={styles.forgot}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>

          {/* The registration link is now inside the main card, below the button. */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ForgotPasswordModal
          visible={showForgotPasswordModal}
          onClose={() => setShowForgotPasswordModal(false)}
          onSubmit={handleForgotPassword}
          resetEmail={resetEmail}
          setResetEmail={setResetEmail}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF6EF',
  },
  imageContainer: {
    height: 200,
    overflow: 'hidden',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  topImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 25,
    padding: 8,
  },
  card: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 28,
    textAlign: 'center',
  },
  floatingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF6EF',
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 12,
    marginBottom: 20,
    height: 55,
  },
  icon: {
    marginRight: 10,
  },
  floatingInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    height: '100%',
  },
  eyeIcon: {
    padding: 5,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#E6005C',
    borderColor: '#E6005C',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#555',
  },
  forgot: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E6005C',
  },
  button: {
    backgroundColor: '#E6005C',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF6EF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#E6005C',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 8,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: '#555',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E6005C',
  },
});