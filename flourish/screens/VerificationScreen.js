// screens/VerificationScreen.js

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
// IMPORT THIS: We will use CommonActions for a more robust navigation reset.
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../Backend/firebaseConfig';
import { sendEmailVerification } from 'firebase/auth';

export default function VerificationScreen() {
  const navigation = useNavigation();
  const user = auth.currentUser;
  
  const [email] = useState(user?.email || 'your email');
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(user?.emailVerified || false);
  const intervalRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const checkVerificationStatus = async () => {
      await auth.currentUser?.reload();
      const reloadedUser = auth.currentUser;

      if (reloadedUser?.emailVerified) {
        console.log('Email has been verified!');
        clearInterval(intervalRef.current);
        if (isMounted.current) {
          setIsVerified(true);
        }
      } else {
        console.log('Email not yet verified...');
      }
    };

    if (!isVerified) {
      intervalRef.current = setInterval(checkVerificationStatus, 3000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVerified]);

  const handleResendEmail = async () => {
    if (!user) {
      Alert.alert('Error', 'No user is currently signed in.');
      return;
    }
    
    setIsResending(true);
    try {
      await sendEmailVerification(user);
      Alert.alert('Email Sent', 'A new verification email has been sent to your address.');
    } catch (error) {
      console.error('Resend email error:', error);
      Alert.alert('Error', 'Failed to resend verification email. Please try again later.');
    } finally {
      if (isMounted.current) {
        setIsResending(false);
      }
    }
  };
  
  // UPDATED FUNCTION: This version uses CommonActions.reset to prevent warnings.
  const handleProceedToLogin = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    try {
      await auth.signOut();
      // This is a more robust way to reset the navigation stack, which prevents race conditions.
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
    } catch (error) {
      console.error("Error signing out and resetting stack:", error);
      Alert.alert("Error", "An error occurred. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {isVerified ? (
          // --- VERIFIED STATE ---
          <>
            <Ionicons name="checkmark-circle-outline" size={80} color="#2ECC71" />
            <Text style={styles.title}>Account Verified!</Text>
            <Text style={styles.instructions}>
              Thank you for verifying your email. You can now proceed to log in.
            </Text>
            <TouchableOpacity style={styles.proceedButton} onPress={handleProceedToLogin}>
              <Text style={styles.proceedButtonText}>Proceed to Login</Text>
            </TouchableOpacity>
          </>
        ) : (
          // --- PENDING VERIFICATION STATE ---
          <>
            <Ionicons name="mail-unread-outline" size={80} color="#E6005C" />
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a verification link to your email address:
            </Text>
            <Text style={styles.emailText}>{email}</Text>
            <Text style={styles.instructions}>
              Please click the link in that email to continue. This window will automatically update once you're verified.
            </Text>
            <ActivityIndicator size="large" color="#E6005C" style={styles.spinner} />

            <TouchableOpacity style={styles.resendButton} onPress={handleResendEmail} disabled={isResending}>
              {isResending ? (
                <ActivityIndicator color="#E6005C" />
              ) : (
                <Text style={styles.resendButtonText}>Resend Email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleProceedToLogin}>
              <Text style={styles.backToLogin}>Back to Login</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF6EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    maxWidth: '90%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  emailText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  instructions: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  spinner: {
    marginVertical: 30,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#E6005C',
    marginBottom: 20,
  },
  resendButtonText: {
    color: '#E6005C',
    fontWeight: 'bold',
    fontSize: 15,
  },
  backToLogin: {
    fontSize: 14,
    color: '#888',
    textDecorationLine: 'underline',
  },
  proceedButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 30,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

