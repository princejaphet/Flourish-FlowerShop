// navigation/StackNavigator.js

import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

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
  const [hasOnboardedThisSession, setHasOnboardedThisSession] = useState(false);
  // --- NEW STATE ---
  // This state tracks if the user has just logged out to change the initial screen.
  const [didLogout, setDidLogout] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // --- MODIFIED LOGIC ---
      // If a user was logged in and is now logged out, set the didLogout flag.
      if (user && !currentUser) {
        setDidLogout(true);
      } 
      // If a user logs in, reset the flag.
      else if (!user && currentUser) {
        setDidLogout(false);
      }
      setUser(currentUser);
      setIsLoading(false);
    });
    // We add 'user' to the dependency array to check the previous state against the new one.
    return unsubscribe;
  }, [user]);

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
              initialParams={{ email: user.email || '...' }} // Pass email safely
            />
          )
        ) : (
          // User is logged out, show auth flow
          !hasOnboardedThisSession ? (
            // Onboarding flow for the very first time
            <>
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Onboarding">
                {(props) => (
                  <OnboardingScreen
                    {...props}
                    onComplete={() => setHasOnboardedThisSession(true)}
                  />
                )}
              </Stack.Screen>
            </>
          ) : (
            // --- MODIFIED LOGIC ---
            // After onboarding, we check if the user just logged out.
            // If they did, Login is the first screen. Otherwise, Welcome is the first.
            didLogout ? (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="Verification" component={VerificationScreen} />
              </>
            ) : (
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

