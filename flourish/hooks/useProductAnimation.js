// hooks/useProductAnimation.js
import { useRef, useEffect, useCallback } from 'react'; // Added useCallback
import { Animated, Easing } from 'react-native';


const useProductAnimation = () => {
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const opacityAnim = useRef(new Animated.Value(0)).current;
 
  const translateYAnim = useRef(new Animated.Value(0)).current;

  
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1, 
      duration: 300, 
      useNativeDriver: true,
    }).start();
  }, []); 

  
  const handlePressIn = useCallback(() => { 
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95, 
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: -5, 
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, translateYAnim]); 


  const handlePressOut = useCallback(() => { 
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1, 
        friction: 4,
        tension: 50, 
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0, 
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, translateYAnim]); 

  
  const startPulse = useCallback(() => {
    scaleAnim.setValue(1); 
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2, 
        duration: 150,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]); 

  
  return { scaleAnim, opacityAnim, translateYAnim, handlePressIn, handlePressOut, startPulse };
};

export default useProductAnimation;