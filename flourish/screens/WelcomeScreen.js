import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Animated,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import welcomeBg from '../assets/flowers.png';

export default function WelcomeScreen() {
  const navigation = useNavigation();

  // Animated values for fade-in and slide-up effect
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current; // Start from 50px below
  
  // Animated value for the "Sign Up" button press
  const [signUpPressAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Animate the fade-in and slide-up of all content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200, // Longer duration for a smoother fade
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, // Slide up to original position
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Press-down animation for the Sign Up button
  const handlePressIn = () => {
    Animated.spring(signUpPressAnim, {
      toValue: 0.95, // Scale down slightly on press
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(signUpPressAnim, {
      toValue: 1, // Return to original size
      friction: 5,
      useNativeDriver: true,
    }).start(() => navigation.navigate('Signup'));
  };

  return (
    <ImageBackground
      source={welcomeBg}
      style={styles.background}
      blurRadius={4} // Slightly increased blur for a softer look
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />

      <Animated.View
        style={[
          styles.centerContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.headline}>
          Explore our{'\n'}
          <Text style={styles.highlight}>beautiful flowers</Text>{'\n'}
          made for every occasion.
        </Text>

        <View style={styles.buttonWrapper}>
          <Animated.View style={{ transform: [{ scale: signUpPressAnim }] }}>
            <TouchableOpacity
              style={styles.button}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={1}
            >
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Text style={styles.loginLinkText}>Log in</Text>
          </View>
        </TouchableOpacity>

      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', // Increased opacity for better readability
  },
  centerContent: {
    width: '85%',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  headline: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 36,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  highlight: {
    color: '#ffe4ec',
  },
  buttonWrapper: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#e91e63',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  loginText: {
    color: '#fff',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loginLinkText: {
    color: '#ffe4ec', // Use highlight color to match the theme
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});