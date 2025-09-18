// navigation/StackNavigator.js

import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth } from '../Backend/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ThemeProvider } from '../context/ThemeContext';

// Import all your screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import VerificationScreen from '../screens/VerificationScreen';
import Homepage from '../screens/Homepage';
import BrowseProduct from '../screens/BrowseProduct';
import UserProfile from '../screens/UserProfile';
import EditProfile from '../screens/EditProfile';
import ManageAddress from '../screens/ManageAddress';
import DeliveryAddress from '../screens/DeliveryAddress';
import ProductDetail from '../screens/ProductDetail';
import OrderCheckout from '../screens/OrderCheckout';
import Message from '../screens/Message';
import MessageChatbot from '../screens/MessageChatbot';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import AboutApp from '../screens/AboutApp';
import SettingsScreen from '../screens/SettingsScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import ChatScreen from '../screens/ChatScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [didLogout, setDidLogout] = useState(false);

  // Load onboarding status from AsyncStorage
  const loadOnboardingStatus = async () => {
    try {
      const hasOnboarded = await AsyncStorage.getItem('hasCompletedOnboarding');
      console.log('🔍 DEBUG: Loaded onboarding status:', hasOnboarded);
      console.log('🔍 DEBUG: Will show onboarding?', hasOnboarded !== 'true');
      setHasCompletedOnboarding(hasOnboarded === 'true');
    } catch (error) {
      console.error('Error loading onboarding status:', error);
      setHasCompletedOnboarding(false);
    }
  };

  // Save onboarding completion to AsyncStorage
  const completeOnboarding = async () => {
    try {
      console.log('🟢 DEBUG: Saving onboarding completion...');
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      setHasCompletedOnboarding(true);
      console.log('🟢 DEBUG: Onboarding marked as complete!');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔐 DEBUG: Auth state changed. Current user:', currentUser ? 'logged in' : 'logged out');
      
      // If a user was logged in and is now logged out, set the didLogout flag
      if (user && !currentUser) {
        console.log('🔴 DEBUG: User logged out, setting didLogout flag');
        setDidLogout(true);
      } 
      // If a user logs in, reset the flag and mark onboarding as complete
      else if (!user && currentUser) {
        console.log('🟢 DEBUG: User logged in, resetting logout flag');
        setDidLogout(false);
        // When user successfully logs in, mark onboarding as completed
        if (!hasCompletedOnboarding) {
          console.log('🎯 DEBUG: User logged in but hasnt completed onboarding, marking as complete');
          completeOnboarding();
        }
      }
      setUser(currentUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user, hasCompletedOnboarding]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E6005C" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // User is logged in
          user.emailVerified ? (
            // User is verified, show the main app screens
            <>
              <Stack.Screen name="Homepage" component={Homepage} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="BrowseProducts" component={BrowseProduct} />
              <Stack.Screen name="ProductDetail" component={ProductDetail} />
              <Stack.Screen name="UserProfile" component={UserProfile} />
              <Stack.Screen name="OrderCheckout" component={OrderCheckout} />
              <Stack.Screen name="EditProfile" component={EditProfile} />
              <Stack.Screen name="ManageAddress" component={ManageAddress} />
              <Stack.Screen name="DeliveryAddress" component={DeliveryAddress} />
              <Stack.Screen name="Message" component={Message} />
              <Stack.Screen name="MessageChatbot" component={MessageChatbot} />
              <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
              <Stack.Screen name="AboutApp" component={AboutApp} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
              <Stack.Screen name="ChatScreen" component={ChatScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            </>
          ) : (
            // User is not verified, show only the verification screen
            <Stack.Screen
              name="Verification"
              component={VerificationScreen}
              initialParams={{ email: user.email || '...' }}
            />
          )
        ) : (
          // User is logged out
          !hasCompletedOnboarding ? (
            // Show onboarding flow for users who haven't completed it
            <>
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Onboarding">
                {(props) => (
                  <OnboardingScreen
                    {...props}
                    onComplete={completeOnboarding}
                  />
                )}
              </Stack.Screen>
            </>
          ) : (
            // User has completed onboarding, show auth screens
            didLogout ? (
              // User just logged out, show Login first
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="Verification" component={VerificationScreen} />
              </>
            ) : (
              // Normal flow, show Welcome first
              <>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="Verification" component={VerificationScreen} />
              </>
            )
          )
        )}
      </Stack.Navigator>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
  },
});