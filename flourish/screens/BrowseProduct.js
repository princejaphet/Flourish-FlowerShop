// screens/BrowseProduct.js

import React, { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Modal,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Animated,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ThemeContext from '../context/ThemeContext';
import BottomNav from '../components/BottomNav';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, updateDoc, doc, getDocs, where, deleteDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const localFirebaseConfig = {
  apiKey: "AIzaSyDTZKJpdPKCunl7dFpjEUPXY-eboXkPrhk",
  authDomain: "flourish-adf09.firebaseapp.com",
  projectId: "flourish-adf09",
  storageBucket: "flourish-adf09.firebasestorage.app",
  messagingSenderId: "853529980918",
  appId: "1:853529980918:web:abacb3f82df5a3681121d7",
  measurementId: "G-0CEWS807Q0"
};

const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : localFirebaseConfig;

let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

export const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'flourish-admin-app';
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);


// --- NEW: Full-page skeleton loader that matches the BrowseProduct layout ---
const BrowseProductSkeleton = ({ isDarkMode }) => {
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
        <SafeAreaView style={styles.container}>
            {/* Header Skeleton */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <SkeletonBlock style={{ width: 200, height: 30, borderRadius: 8 }} />
                    <SkeletonBlock style={{ width: 30, height: 30, borderRadius: 8 }} />
                </View>
                {/* Categories Skeleton */}
                <View style={{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 5 }}>
                    <SkeletonBlock style={{ height: 36, width: 80, borderRadius: 20, marginRight: 10 }} />
                    <SkeletonBlock style={{ height: 36, width: 120, borderRadius: 20, marginRight: 10 }} />
                    <SkeletonBlock style={{ height: 36, width: 90, borderRadius: 20 }} />
                </View>
            </View>

            {/* Product Grid Skeleton */}
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <FlatList
                    data={[1, 2, 3, 4, 5, 6]}
                    renderItem={() => <ProductSkeleton isDarkMode={isDarkMode} />}
                    keyExtractor={(item) => item.toString()}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                />
            </View>
            
            {/* Bottom Nav Skeleton */}
            <View style={{height: 70, borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#EEE', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 10}}>
                <SkeletonBlock style={{width: 50, height: 40, borderRadius: 8}}/>
                <SkeletonBlock style={{width: 50, height: 40, borderRadius: 8}}/>
                <SkeletonBlock style={{width: 50, height: 40, borderRadius: 8}}/>
                <SkeletonBlock style={{width: 50, height: 40, borderRadius: 8}}/>
            </View>
        </SafeAreaView>
    );
};


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

  const baseColor = isDarkMode ? '#1E1E1E' : '#E0E0E0';
  const highlightColor = isDarkMode ? '#333' : '#F5F5F5';
  const styles = getStyles(isDarkMode);

  return (
    <View style={[styles.productCard, { backgroundColor: baseColor, shadowOpacity: 0 }]}>
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

const BrowseProduct = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getStyles(isDarkMode);

  const currentFilters = navigation.getState()?.routes?.find(r => r.name === 'BrowseProduct')?.params || {};
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(currentFilters.selectedCategory || 'All');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [priceRange, setPriceRange] = useState(currentFilters.priceRange || { min: 0, max: 10000 });
  const [sortBy, setSortBy] = useState(currentFilters.sortBy || 'name');
  const activeTab = 'bouquet';
  const [isNewUser, setIsNewUser] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const saveFilters = () => {
      navigation.setParams({
        selectedCategory,
        priceRange,
        sortBy
      });
    };
    saveFilters();
  }, [selectedCategory, priceRange, sortBy, navigation]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setIsAuthReady(true);
      } else {
        try {
            await signInAnonymously(auth);
        } catch (authError) {
          setError(`Authentication Failed: ${authError.message}.`);
          setLoading(false);
          setIsAuthReady(false);
        }
      }
    });
    return () => unsubscribeAuth();
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
        if (isAuthReady) {
            checkIsNewUser();
        }
      }, [userId, isAuthReady])
    );

  useEffect(() => {
    if (db && userId && isAuthReady) {
      const productsCollectionRef = collection(db, `artifacts/${canvasAppId}/public/data/products`);
      setLoading(true);
      const unsubscribeProducts = onSnapshot(productsCollectionRef, (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        productsData.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(productsData);
        setTimeout(() => setLoading(false), 2000); // Simulate loading
      }, (err) => { setError("Failed to load products."); setLoading(false); });
      
      return () => {
        if (unsubscribeProducts) unsubscribeProducts();
      };
    }
  }, [db, userId, isAuthReady]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category))).sort()], [products]);
  
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => 
      (selectedCategory === 'All' || product.category === selectedCategory) && 
      (product.price >= priceRange.min && product.price <= priceRange.max)
    );

    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name':
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return filtered;
  }, [products, selectedCategory, priceRange, sortBy]);
  
  const resetFilters = () => {
    setSelectedCategory('All');
    setPriceRange({ min: 0, max: 10000 });
    setSortBy('name');
    setIsFilterModalVisible(false);
  };

  const renderProductItem = ({ item }) => {
    const discountedPrice = item.price * 0.95;
    return (
        <TouchableOpacity style={styles.productCard} onPress={() => navigation.navigate('ProductDetail', { product: item, isNewUser })}>
            <Image source={{ uri: item.imageUrl || 'https://placehold.co/200x200/cccccc/ffffff?text=No+Image' }} style={styles.productImage} />
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                {item.rating > 0 && item.numReviews > 0 && (
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {item.rating.toFixed(1)} ({item.numReviews})
                    </Text>
                  </View>
                )}
                <View style={styles.priceRow}>
                    {isNewUser ? (
                        <View>
                            <Text style={styles.originalPrice}>₱{item.price.toFixed(2)}</Text>
                            <Text style={styles.productPrice}>₱{discountedPrice.toFixed(2)}</Text>
                        </View>
                    ) : (
                        <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
                    )}
                    <TouchableOpacity style={styles.productAddButton} onPress={() => navigation.navigate('ProductDetail', { product: item, isNewUser })}>
                        <Text style={styles.plusIcon}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={isFilterModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter Products</Text>
            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
              <Icon name="close" size={24} color={isDarkMode ? '#FFF' : '#333'} />
            </TouchableOpacity>
          </View>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Category</Text>
            <FlatList
              data={categories}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.categoryFilterButton, selectedCategory === item && styles.selectedCategoryFilter]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text style={[styles.categoryFilterText, selectedCategory === item && styles.selectedCategoryFilterText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryFilterList}
            />
          </View>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.sortOptions}>
              {[ { key: 'name', label: 'Name (A-Z)' }, { key: 'price-low', label: 'Price (Low to High)' }, { key: 'price-high', label: 'Price (High to Low)' } ].map((option) => (
                <TouchableOpacity key={option.key} style={[styles.sortOption, sortBy === option.key && styles.selectedSortOption]} onPress={() => setSortBy(option.key)} >
                  <Text style={[styles.sortOptionText, sortBy === option.key && styles.selectedSortOptionText]}> {option.label} </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <View style={styles.priceInputs}>
              <TextInput style={styles.priceInput} placeholder="Min" placeholderTextColor={isDarkMode ? '#999' : '#666'} value={priceRange.min.toString()} onChangeText={(text) => setPriceRange(prev => ({ ...prev, min: parseInt(text) || 0 }))} keyboardType="numeric" />
              <Text style={styles.priceRangeSeparator}>-</Text>
              <TextInput style={styles.priceInput} placeholder="Max" placeholderTextColor={isDarkMode ? '#999' : '#666'} value={priceRange.max.toString()} onChangeText={(text) => setPriceRange(prev => ({ ...prev, max: parseInt(text) || 10000 }))} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => setIsFilterModalVisible(false)}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const LoadingErrorDisplay = ({ message }) => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={isDarkMode ? '#D81B60' : '#D81B60'} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );

  if (!isAuthReady || loading) {
    if (error) return <LoadingErrorDisplay message={error} />;
    return <BrowseProductSkeleton isDarkMode={isDarkMode} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={styles.container.backgroundColor} />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Browse Products</Text>
          <TouchableOpacity style={styles.filterIconContainer} onPress={() => setIsFilterModalVisible(true)}>
            <Icon name="filter-variant" size={28} style={styles.primaryText} />
            {(selectedCategory !== 'All' || priceRange.min > 0 || priceRange.max < 10000 || sortBy !== 'name') && (
              <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>•</Text></View>
            )}
          </TouchableOpacity>
        </View>
        <FlatList
          data={categories}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.categoryButton, selectedCategory === item && styles.selectedCategoryButton]} onPress={() => setSelectedCategory(item)}>
              <Text style={[styles.categoryButtonText, selectedCategory === item && styles.selectedCategoryButtonText]}>{item}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
      />
      
      {renderFilterModal()}
      <BottomNav activeTab={activeTab} />
    </View>
  );
};

const getStyles = (isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 0,
    backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
  },
  primaryText: { color: '#D81B60' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
  },
  loadingText: {
    color: isDarkMode ? '#FFF' : '#333',
    marginTop: 10
  },
  header: { padding: 10, backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: isDarkMode ? '#FFF' : '#333' },
  filterIconContainer: { padding: 5, position: 'relative' },
  filterBadge: { position: 'absolute', top: 0, right: 0, borderRadius: 5, minWidth: 10, height: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#D81B60' },
  filterBadgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  categoryList: { paddingVertical: 5, paddingHorizontal: 5 },
  categoryButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: isDarkMode ? '#333' : '#f0f0f0', backgroundColor: isDarkMode ? '#222' : '#FFF' },
  selectedCategoryButton: { backgroundColor: '#D81B60' },
  categoryButtonText: { fontSize: 14, fontWeight: '500', color: isDarkMode ? '#FFF' : '#333' },
  selectedCategoryButtonText: { color: '#FFF' },
  productList: { paddingHorizontal: 10, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },
  productCard: {
    width: (width / 2) - 15,
    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.4 : 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: isDarkMode ? '#FFF' : '#333',
    marginBottom: 4,
    minHeight: 34,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 14,
    color: isDarkMode ? '#bbb' : '#444',
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
  productAddButton: {
    backgroundColor: '#D81B60',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: { color: '#fff', fontSize: 20, lineHeight: 22 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? '#FFF' : '#333',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#333',
    marginBottom: 10,
  },
  categoryFilterList: {
    marginVertical: 5,
  },
  categoryFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#333' : '#DDD',
    backgroundColor: isDarkMode ? '#222' : '#FFF',
  },
  selectedCategoryFilter: {
    backgroundColor: '#D81B60',
    borderColor: '#D81B60',
  },
  categoryFilterText: {
    fontSize: 14,
    color: isDarkMode ? '#FFF' : '#333',
  },
  selectedCategoryFilterText: {
    color: '#FFF',
  },
  sortOptions: {
    gap: 10,
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#333' : '#DDD',
    backgroundColor: isDarkMode ? '#222' : '#FFF',
  },
  selectedSortOption: {
    backgroundColor: '#D81B60',
    borderColor: '#D81B60',
  },
  sortOptionText: {
    fontSize: 14,
    color: isDarkMode ? '#FFF' : '#333',
  },
  selectedSortOptionText: {
    color: '#FFF',
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDarkMode ? '#333' : '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: isDarkMode ? '#FFF' : '#333',
    backgroundColor: isDarkMode ? '#222' : '#FFF',
  },
  priceRangeSeparator: {
    fontSize: 16,
    color: isDarkMode ? '#FFF' : '#333',
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginTop: 10,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D81B60',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#D81B60',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#D81B60',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BrowseProduct;