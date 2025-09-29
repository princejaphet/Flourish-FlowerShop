// screens/Homepage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  ImageBackground,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import BottomNav from '../components/BottomNav';
import { auth, db } from '../Backend/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;
const CARD_MARGIN = (width - CARD_WIDTH) / 2;

const allSpecialOffers = [
    {
      id: 'offer_new_user',
      type: 'newUserDiscount',
      title: 'Enjoy 5% OFF Discount',
      subtitle: 'on your first order',
      badge: 'Special Offer',
      buttonText: 'Order Now',
      background: require('../assets/back.png'),
      image: require('../assets/discount.png') 
    },
    {
      id: 'offer_design_own',
      type: 'browse',
      title: 'Design Your Own Bouquet',
      subtitle: 'Make it Unique for Your Occasion',
      badge: null,
      buttonText: null, 
      background: require('../assets/back.png'),
      image: require('../assets/discount1.png')
    },
    {
      id: 'offer_fresh_flowers',
      type: 'browse',
      title: 'Fresh flowers',
      subtitle: 'Perfect gifts for your loved ones',
      longSubtitle: 'Check out our wide selections of flower arrangements to make your next occasion memorable.',
      badge: null,
      buttonText: 'Order Now',
      background: require('../assets/back.png'),
      image: require('../assets/discount2.png')
    },
    {
      id: 'offer_sunflower',
      type: 'browse',
      title: 'Explore our Fresh & New flowers',
      subtitle: 'Brighten up your day with our latest collection.',
      badge: null,
      buttonText: 'Browse Flowers',
      background: require('../assets/back.png'),
      image: require('../assets/sunflower.png') 
    },
];

// --- MODIFIED SECTION START ---
// The outer SafeAreaView was removed so it doesn't conflict with the parent component's SafeAreaView.
const HomepageSkeleton = ({ isDarkMode }) => {
    const shimmerAnimation = useRef(new Animated.Value(0)).current;
    const styles = getStyles(isDarkMode);

    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmerAnimation, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            })
        ).start();
    }, [shimmerAnimation]);

    const translateX = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width],
    });

    const Shimmer = () => (
        <Animated.View style={{ width: '100%', height: '100%', transform: [{ translateX }] }}>
            <View style={{ width: '200%', height: '100%', backgroundColor: isDarkMode ? '#333' : '#F5F5F5', opacity: 0.3 }} />
        </Animated.View>
    );

    const SkeletonBlock = ({ style }) => (
        <View style={[style, { backgroundColor: isDarkMode ? '#222' : '#E0E0E0', overflow: 'hidden' }]}>
            <Shimmer />
        </View>
    );

    return (
        <ScrollView style={{ flex: 1 }}>
            <View style={styles.header}>
                <SkeletonBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
                <SkeletonBlock style={{ width: 100, height: 30, borderRadius: 8 }} />
                <SkeletonBlock style={{ width: 30, height: 30, borderRadius: 8 }} />
            </View>
            <View style={styles.welcomeContainer}>
                <SkeletonBlock style={{ width: '70%', height: 30, borderRadius: 8, marginBottom: 10 }} />
                <SkeletonBlock style={{ width: '90%', height: 20, borderRadius: 8 }} />
            </View>
            <View style={styles.offerContainer}>
                <SkeletonBlock style={{ width: CARD_WIDTH, height: 180, borderRadius: 15 }} />
            </View>
            <View style={styles.categoryContainer}>
                <View style={{ flexDirection: 'row', paddingHorizontal: 20 }}>
                    <SkeletonBlock style={{ height: 40, width: 80, borderRadius: 20, marginRight: 10 }} />
                    <SkeletonBlock style={{ height: 40, width: 120, borderRadius: 20, marginRight: 10 }} />
                    <SkeletonBlock style={{ height: 40, width: 90, borderRadius: 20 }} />
                </View>
            </View>
            <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                <ProductSkeleton isDarkMode={isDarkMode} />
                <ProductSkeleton isDarkMode={isDarkMode} />
            </View>
             <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
                <ProductSkeleton isDarkMode={isDarkMode} />
                <ProductSkeleton isDarkMode={isDarkMode} />
            </View>
        </ScrollView>
    );
};
// --- MODIFIED SECTION END ---


const ProductSkeleton = ({ isDarkMode }) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnimation]);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const baseColor = isDarkMode ? '#222' : '#E0E0E0';
  const highlightColor = isDarkMode ? '#333' : '#F5F5F5';

  return (
    <View style={[getStyles(isDarkMode).product, { backgroundColor: baseColor, shadowOpacity: 0 }]}>
      <View style={{ width: '100%', height: 150, backgroundColor: baseColor, overflow: 'hidden' }}>
          <Animated.View style={{ width: '100%', height: '100%', transform: [{ translateX }] }}>
              <View style={{ width: '200%', height: '100%', backgroundColor: highlightColor, opacity: 0.3 }} />
          </Animated.View>
      </View>
      <View style={{ padding: 10 }}>
        <View style={{ width: '90%', height: 20, borderRadius: 4, backgroundColor: baseColor, overflow: 'hidden' }}>
             <Animated.View style={{ width: '100%', height: '100%', transform: [{ translateX }] }}>
                <View style={{ width: '200%', height: '100%', backgroundColor: highlightColor, opacity: 0.3 }} />
            </Animated.View>
        </View>
        <View style={{ width: '60%', height: 20, marginTop: 6, borderRadius: 4, backgroundColor: baseColor, overflow: 'hidden' }}>
            <Animated.View style={{ width: '100%', height: '100%', transform: [{ translateX }] }}>
                <View style={{ width: '200%', height: '100%', backgroundColor: highlightColor, opacity: 0.3 }} />
            </Animated.View>
        </View>
      </View>
    </View>
  );
};

const Homepage = ({ navigation }) => {
  const { isDarkMode, theme } = useTheme();
  const styles = getStyles(isDarkMode, theme);

  const [activeCategory, setActiveCategory] = useState('All');
  const [allProducts, setAllProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userName, setUserName] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const activeTab = 'home';
  const [userId, setUserId] = useState(null);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [top5ProductNames, setTop5ProductNames] = useState([]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [displayedOffers, setDisplayedOffers] = useState(allSpecialOffers);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isNewUser) {
      setDisplayedOffers(allSpecialOffers);
    } else {
      setDisplayedOffers(allSpecialOffers.filter(offer => offer.id !== 'offer_new_user'));
    }
    setActiveOfferIndex(0);
  }, [isNewUser]);

  useEffect(() => {
    const bestSellersRef = doc(db, 'artifacts/flourish-admin-app/public/data/bestsellers/top5');
    
    const unsubscribe = onSnapshot(bestSellersRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().productNames) {
        setTop5ProductNames(docSnap.data().productNames);
      } else {
        setTop5ProductNames([]);
      }
    }, (err) => {
      console.error("Error fetching best sellers:", err);
    });

    return () => unsubscribe();
  }, []);


  useEffect(() => {
    const productsCollectionRef = collection(db, `artifacts/flourish-admin-app/public/data/products`);
    const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      productsData.sort((a, b) => a.name.localeCompare(b.name));
      setAllProducts(productsData);
    }, (err) => console.error("Error fetching products from Firestore:", err));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const categoriesCollectionRef = collection(db, `artifacts/flourish-admin-app/public/data/categories`);
    const unsubscribe = onSnapshot(categoriesCollectionRef, (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedCategories = categoriesData.sort((a, b) => a.name.localeCompare(b.name));
      
      setCategories([
        { id: 'all-category', name: 'All' },
        ...sortedCategories,
        { id: 'most-popular-category', name: 'Most Popular' }
      ]);
    }, (err) => console.error("Error fetching categories from Firestore:", err));

    return () => unsubscribe();
  }, []);

  const getFilteredProducts = (categoryName) => {
    if (categoryName === 'Most Popular') {
      return allProducts.filter(p => top5ProductNames.includes(p.name))
                        .sort((a, b) => top5ProductNames.indexOf(a.name) - top5ProductNames.indexOf(b.name));
    }
    if (categoryName === 'All') {
      return allProducts;
    }
    return allProducts.filter(product => product.category === categoryName);
  };

  useEffect(() => {
    if (allProducts.length > 0) {
       setTimeout(() => {
         setDisplayedProducts(getFilteredProducts(activeCategory));
         setLoading(false);
      }, 1000); 
    }
  }, [allProducts, top5ProductNames, activeCategory]);


  const onRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setDisplayedProducts(getFilteredProducts(activeCategory));
    setIsRefreshing(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const userDocRef = doc(db, 'signup_users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.fullName);
            setProfilePicUrl(userData.profilePicUrl || null);
          } else { setUserName('User'); setProfilePicUrl(null); }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserName('User'); setProfilePicUrl(null);
        }
      } else {
        setUserName('Guest');
        setProfilePicUrl(null);
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkIsNewUser = async () => {
          if (!userId) {
              setIsNewUser(true);
              return;
          }
          try {
              const ordersRef = collection(db, 'orders');
              const q = query(ordersRef, where('userId', '==', userId));
              const querySnapshot = await getDocs(q);
              setIsNewUser(querySnapshot.empty);
          } catch (error) {
              console.error("Error checking if user is new:", error);
              setIsNewUser(false);
          }
      };
      checkIsNewUser();
    }, [userId])
  );


  useEffect(() => {
    if (!userId) {
      setHasNotifications(false);
      return;
    }

    const appId = 'flourish-flowers-app';
    const ordersRef = collection(db, `artifacts/${appId}/public/data/orders`);
    const q = query(ordersRef, where('userId', '==', userId), where('isRead', '==', false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasNotifications(!snapshot.empty);
    }, (err) => {
      console.error("Error listening for notifications:", err);
      setHasNotifications(false);
    });

    return () => unsubscribe();
  }, [userId]);
  
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (displayedOffers.length > 0) {
      intervalRef.current = setInterval(() => {
        setActiveOfferIndex(prevIndex => (prevIndex + 1) % displayedOffers.length);
      }, 3000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [displayedOffers]);

  const handleOfferPress = async (offerType) => {
    if (offerType === 'browse') {
      navigation.navigate('BrowseProducts');
      return;
    }

    if (!userId) {
      navigation.navigate('BrowseProducts');
      return;
    }

    try {
      const appId = 'flourish-flowers-app';
      const ordersRef = collection(db, `artifacts/${appId}/public/data/orders`);
      const q = query(ordersRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        navigation.navigate('BrowseProducts'); 
      } else {
        Alert.alert(
          "Offer Not Available",
          "This offer is only for first-time customers."
        );
      }
    } catch (error) {
      console.error("Error checking user order history:", error);
      Alert.alert("Error", "Could not verify your eligibility. Please try again.");
    }
  };

  const handleCategoryPress = (name) => {
    setActiveCategory(name);
  };

  const renderCategory = ({ item }) => {
    const isActive = activeCategory === item.name;
    return (
      <TouchableOpacity style={[styles.categoryItem, isActive && styles.categoryItemActive]} onPress={() => handleCategoryPress(item.name)}>
        <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderProduct = ({ item }) => {
    // --- UPDATED: New cleaner price display logic ---
    const hasRange = item.minPrice !== undefined && item.maxPrice !== undefined;
    const isRange = hasRange && item.minPrice !== item.maxPrice;
    const basePrice = item.minPrice ?? item.price ?? 0;

    return (
      <TouchableOpacity
        style={styles.product}
        onPress={() => navigation.navigate('ProductDetail', { product: item, isNewUser })}
      >
        <Image source={{ uri: item.imageUrl || 'https://placehold.co/200x200/cccccc/ffffff?text=No+Image' }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceRow}>
            {isNewUser ? (
              <View>
                <Text style={styles.originalPrice}>
                  {isRange && <Text style={styles.fromText}>From </Text>}
                  ₱{basePrice.toFixed(2)}
                </Text>
                <Text style={styles.productPrice}>
                  {isRange && <Text style={styles.fromText}>From </Text>}
                  ₱{(basePrice * 0.95).toFixed(2)}
                </Text>
              </View>
            ) : (
              <Text style={styles.productPrice}>
                {isRange && <Text style={styles.fromText}>From </Text>}
                ₱{basePrice.toFixed(2)}
              </Text>
            )}
            <TouchableOpacity
              style={styles.productAddButton}
              onPress={() => navigation.navigate('ProductDetail', { product: item, isNewUser })}
            >
              <Text style={styles.plusIcon}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => {
    if (displayedOffers.length === 0) {
        return null;
    }
    const currentOffer = displayedOffers[activeOfferIndex];

    const renderOfferTitle = () => {
      if (currentOffer.id === 'offer_new_user') {
        const parts = currentOffer.title.split(/(5% OFF)/);
        return (
          <Text style={styles.offerTitle}>
            {parts[0]}<Text style={styles.offerHighlight}>{parts[1]}</Text>{parts[2]}
          </Text>
        );
      }
      if (currentOffer.id === 'offer_design_own') {
        const parts = currentOffer.title.split(/(Design Your Own)/);
        return (
          <Text style={styles.offerTitle}>
            <Text style={styles.offerHighlightPink}>{parts[1]}</Text>{parts[2]}
          </Text>
        );
      }
      if (currentOffer.id === 'offer_fresh_flowers') {
        return (
          <Text style={styles.offerTitle}>
            <Text style={styles.offerHighlightPink}>Fresh</Text> flowers
          </Text>
        );
      }
      if (currentOffer.id === 'offer_sunflower') {
        const parts = currentOffer.title.split(/(Fresh & New)/);
        return (
          <Text style={styles.offerTitle}>
            {parts[0]}<Text style={styles.offerHighlightPink}>{parts[1]}</Text>{parts[2]}
          </Text>
        );
      }
      return <Text style={styles.offerTitle}>{currentOffer.title}</Text>;
    };

    const OfferCardComponent = () => {
      const shouldReverseDirection = currentOffer.id === 'offer_design_own' || currentOffer.id === 'offer_sunflower';
      
      const cardStyle = shouldReverseDirection
        ? [styles.offerCard, { flexDirection: 'row-reverse' }]
        : styles.offerCard;

      return (
        <ImageBackground source={currentOffer.background} style={cardStyle} imageStyle={styles.offerCardImageStyle}>
          <View style={styles.offerOverlay} />
          <View style={styles.offerTextWrapper}>
            {currentOffer.badge && <View style={styles.offerBadge}><Text style={styles.offerBadgeText}>{currentOffer.badge}</Text></View>}
            {renderOfferTitle()}
            <Text style={styles.offerSubTitle}>{currentOffer.subtitle}</Text>
            {currentOffer.longSubtitle && <Text style={styles.offerLongSubTitle}>{currentOffer.longSubtitle}</Text>}
            {currentOffer.buttonText && (
              <TouchableOpacity style={styles.getNowBtn} onPress={() => handleOfferPress(currentOffer.type)}>
                <Text style={styles.getNowText}>{currentOffer.buttonText}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Image source={currentOffer.image} style={styles.offerImage} />
        </ImageBackground>
      );
    };

    return (
      <View>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
            <Image source={profilePicUrl ? { uri: profilePicUrl } : require('../assets/pic.png')} style={styles.profile} />
          </TouchableOpacity>
          <Image source={require('../assets/flourish.png')} style={styles.logo} />
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <Icon
              name={hasNotifications ? "notifications" : "notifications-outline"}
              size={26}
              color={isDarkMode ? '#fff' : '#D81B60'}
            />
            {hasNotifications && <View style={styles.notificationBadge} />}
          </TouchableOpacity>
        </View>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome, {userName} 👋</Text>
          <Text style={styles.subText}>What bouquet are you looking for today?</Text>
        </View>
        
        <View style={styles.offerContainer}>
          {currentOffer.type === 'browse' && !currentOffer.buttonText ? (
            <TouchableOpacity onPress={() => handleOfferPress(currentOffer.type)}>
              <OfferCardComponent />
            </TouchableOpacity>
          ) : (
            <OfferCardComponent />
          )}
        </View>

        <View style={styles.categoryContainer}>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        </View>
      </View>
    );
  };
  
  // --- MODIFIED SECTION START ---
  // The main return logic is updated to always show the BottomNav
  // and conditionally render the skeleton or the content above it.
  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={styles.container.backgroundColor} />
      <SafeAreaView style={styles.safeArea}>
        {loading ? (
           <HomepageSkeleton isDarkMode={isDarkMode} />
        ) : (
          <FlatList
            data={displayedProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={isDarkMode ? '#fff' : '#D81B60'} />}
          />
        )}
        <BottomNav activeTab={activeTab} />
      </SafeAreaView>
    </View>
  );
  // --- MODIFIED SECTION END ---
};

const getStyles = (isDarkMode, theme) => StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: StatusBar.currentHeight || 0,
      backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
    },
    safeArea: { flex: 1, backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
    profile: { width: 40, height: 40, borderRadius: 20 },
    logo: { width: 100, height: 40, resizeMode: 'contain' },
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
        borderWidth: 1.5,
        borderColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
    },
    welcomeContainer: { paddingHorizontal: 20, marginTop: 5 },
    welcomeText: { fontSize: 24, fontWeight: 'bold', color: isDarkMode ? '#fff' : '#333' },
    subText: { fontSize: 16, color: isDarkMode ? '#aaa' : '#666', marginTop: 5 },
    offerContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    offerCard: { 
        width: CARD_WIDTH, 
        height: 180,
        borderRadius: 15, 
        overflow: 'hidden', 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 10
    },
    offerCardImageStyle: { borderRadius: 15 },
    offerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 15 },
    offerTextWrapper: { flex: 1, zIndex: 1, paddingHorizontal: 10 },
    offerBadge: { backgroundColor: 'rgba(255, 215, 0, 0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, alignSelf: 'flex-start' },
    offerBadgeText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
    offerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 10, textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    offerHighlight: { color: '#FFD700' },
    offerHighlightPink: { color: '#D81B60' },
    offerSubTitle: { color: '#fff', fontSize: 14, marginTop: 5, textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    offerLongSubTitle: { color: '#fff', fontSize: 12, marginTop: 5, textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, flexWrap: 'wrap' },
    getNowBtn: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15, marginTop: 15, alignSelf: 'flex-start' },
    getNowText: { color: '#D81B60', fontWeight: 'bold' },
    offerImage: { 
        width: 150,
        height: 150,
        resizeMode: 'contain', 
        zIndex: 1 
    },
    categoryContainer: { marginTop: 20, marginBottom: 20 },
    categoryList: { paddingHorizontal: 20 },
    categoryItem: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginRight: 10, backgroundColor: isDarkMode ? '#333' : '#fff' },
    categoryItemActive: { backgroundColor: '#D81B60' },
    categoryText: { color: isDarkMode ? '#fff' : '#333', fontWeight: '600' },
    categoryTextActive: { color: '#fff' },
    productRow: { justifyContent: 'space-between', paddingHorizontal: 15 },
    product: {
        width: (width - 45) / 2,
        backgroundColor: isDarkMode ? '#222' : '#fff',
        borderRadius: 10,
        marginBottom: 15,
        overflow: 'hidden',
        shadowColor: isDarkMode ? '#fff' : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDarkMode ? 0.1 : 0.2,
        elevation: 8,
    },
    productImage: { width: '100%', height: 150, resizeMode: 'cover' },
    productInfo: {
        padding: 10,
        justifyContent: 'space-between',
        flex: 1,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: isDarkMode ? '#fff' : '#333',
        marginBottom: 8,
        minHeight: 34,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#D81B60',
    },
    originalPrice: {
        fontSize: 12,
        color: isDarkMode ? '#aaa' : '#666',
        textDecorationLine: 'line-through',
    },
    // --- ADDED: Style for the 'From' text to make it cleaner ---
    fromText: {
        fontSize: 14,
        fontWeight: '500',
        color: isDarkMode ? '#bbb' : '#555',
    },
    productAddButton: {
        backgroundColor: '#D81B60',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plusIcon: { color: '#fff', fontSize: 20, lineHeight: 22 },
});

export default Homepage;