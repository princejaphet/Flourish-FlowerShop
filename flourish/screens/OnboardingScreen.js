// screens/OnboardingScreen.js

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  FlatList,
  Image,
  ImageBackground,
} from 'react-native';


const { width } = Dimensions.get('window');

const onboardingData = [
  { id: '1', title: 'Welcome to\nFlourish', description: 'Your online flower shop made easy.', image: require('../assets/onboarding1.png'), backgroundImage: require('../assets/background_blob_1.png'), hasBlobBackground: true },
  { id: '2', title: 'Browse &\nCustomize', description: 'Browse beautiful bouquets\nor design your own.', image: require('../assets/onboarding2.png'), backgroundImage: require('../assets/background_blob_2.png'), hasBlobBackground: true },
  { id: '3', title: 'Order\n& Track', description: 'Place your order and track\nit in real time.', image: require('../assets/onboarding3.png'), backgroundImage: null, hasBlobBackground: false },
];

const OnboardingItem = ({ item }) => {
  if (item.hasBlobBackground) {
    return (
      <View style={styles.slide}>
        <ImageBackground source={item.backgroundImage} style={styles.blobBackground} resizeMode="contain">
          <Image source={item.image} style={styles.imageInBlob} resizeMode="contain" />
        </ImageBackground>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  } else {
    return (
      <View style={styles.slide}>
        <View style={styles.imageContainerNoBlob}>
          <Image source={item.image} style={styles.imageNoBlob} resizeMode="contain" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  }
};

const OnboardingScreen = ({ onComplete }) => {
  // const navigation = useNavigation(); // No longer needed for this logic
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef(null);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  
  const handleCompleteOnboarding = () => {
    if (onComplete) {
      onComplete();
    }
    
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7E9E9" />
      <View style={{ flex: 3 }}>
        <FlatList
          data={onboardingData}
          renderItem={({ item }) => <OnboardingItem item={item} />}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ref={slidesRef}
          scrollEventThrottle={32}
        />
      </View>

      <View style={styles.bottomSection}>
        {currentIndex < onboardingData.length - 1 ? (
          <>
            <TouchableOpacity onPress={handleCompleteOnboarding} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <View style={styles.indicatorContainer}>
              {onboardingData.map((_, i) => (
                <Animated.View
                  key={i}
                  style={[styles.indicator, i === currentIndex ? styles.indicatorActive : null]}
                />
              ))}
            </View>
            <View style={{ width: 50 }} />
          </>
        ) : (
          <TouchableOpacity onPress={handleCompleteOnboarding} style={styles.getStartedButton}>
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Add all your styles here...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7E9E9' },
  slide: { width, alignItems: 'center', justifyContent: 'center', padding: 20 },
  blobBackground: { width: width * 0.85, height: width * 0.85, alignItems: 'center', justifyContent: 'center', marginBottom: 50 },
  imageInBlob: { width: '75%', height: '75%' },
  imageContainerNoBlob: { width: width * 0.85, height: width * 0.85, alignItems: 'center', justifyContent: 'center', marginBottom: 50 },
  imageNoBlob: { width: '100%', height: '100%' },
  textContainer: { alignItems: 'center', paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#E6005C', textAlign: 'center', marginBottom: 16, lineHeight: 40 },
  description: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, fontWeight: '400' },
  bottomSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 30 },
  indicatorContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  indicator: { height: 10, width: 10, borderRadius: 5, backgroundColor: '#D9D9D9', marginHorizontal: 5 },
  indicatorActive: { backgroundColor: '#E6005C' },
  skipButton: { position: 'absolute', left: 20, bottom: 45, padding: 10 },
  skipText: { fontSize: 16, color: '#999', fontWeight: '500' },
  getStartedButton: { backgroundColor: '#E6005C', paddingVertical: 16, width: '90%', alignItems: 'center', borderRadius: 30, shadowColor: '#E6005C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6 },
  getStartedText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});

export default OnboardingScreen;
