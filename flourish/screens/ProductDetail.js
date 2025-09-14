// screens/ProductDetail.js
import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Share,
  Animated, // Added for skeleton loader
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ThemeContext from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// --- NEW: Skeleton Loader for the Product Detail page ---
const ProductDetailSkeleton = ({ isDarkMode }) => {
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
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <SkeletonBlock style={{ width: width, height: width }} />
                <View style={styles.detailsContainer}>
                    <SkeletonBlock style={{ width: '80%', height: 30, borderRadius: 8, marginBottom: 15 }} />
                    <SkeletonBlock style={{ width: '40%', height: 25, borderRadius: 8, marginBottom: 30 }} />
                    <SkeletonBlock style={{ width: '100%', height: 20, borderRadius: 8, marginBottom: 8 }} />
                    <SkeletonBlock style={{ width: '100%', height: 20, borderRadius: 8, marginBottom: 8 }} />
                    <SkeletonBlock style={{ width: '70%', height: 20, borderRadius: 8, marginBottom: 30 }} />
                    <SkeletonBlock style={{ width: '30%', height: 25, borderRadius: 8, marginBottom: 15 }} />
                    <View style={{ flexDirection: 'row' }}>
                        <SkeletonBlock style={{ width: 80, height: 40, borderRadius: 20, marginRight: 10 }} />
                        <SkeletonBlock style={{ width: 80, height: 40, borderRadius: 20, marginRight: 10 }} />
                        <SkeletonBlock style={{ width: 80, height: 40, borderRadius: 20 }} />
                    </View>
                </View>
            </ScrollView>
            <View style={styles.footer}>
                <View style={{ flex: 1, marginRight: 15 }}>
                    <SkeletonBlock style={{ width: '50%', height: 20, borderRadius: 8, marginBottom: 8 }} />
                    <SkeletonBlock style={{ width: '70%', height: 25, borderRadius: 8 }} />
                </View>
                <SkeletonBlock style={{ width: 150, height: 60, borderRadius: 30 }} />
            </View>
        </SafeAreaView>
    );
};


const ProductDetail = ({ route, navigation }) => {
  const { product, isNewUser } = route.params;
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getStyles(isDarkMode);

  const [isPageLoading, setIsPageLoading] = useState(true); // State for the skeleton loader
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [addonNote, setAddonNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (product.variations && product.variations.length > 0) {
      setSelectedVariation(product.variations[0]);
    } else {
      setSelectedVariation({ name: 'Default', price: product.price });
    }
  }, [product]);

  const images = (product.imageUrls && product.imageUrls.length > 0)
    ? product.imageUrls
    : [product.imageUrl || 'https://placehold.co/400x400/cccccc/ffffff?text=No+Image'];

  const currentPrice = selectedVariation ? selectedVariation.price : product.price;
  const finalPrice = isNewUser ? currentPrice * 0.95 : currentPrice;

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleSaveNote = () => {
    setIsNoteModalVisible(false);
  };
  
  const handleShare = async () => {
    try {
      const productUrl = `https://your-flower-shop.com/product/${product.id || '123'}`; 
      const message = `Check out this amazing product: ${product.name}!\n\nPrice: ₱${finalPrice.toFixed(2)}\n\n${product.description}\n\nSee more here: ${productUrl}`;
      await Share.share({ message: message, title: `Share ${product.name}` });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCheckout = () => {
    setIsLoading(true);
    setTimeout(() => {
      const orderDetails = {
        product: { ...product, price: finalPrice, originalPrice: currentPrice },
        quantity,
        variation: selectedVariation,
        note: addonNote,
        isNewUser,
      };
      navigation.navigate('OrderCheckout', { orderDetails });
      setIsLoading(false);
    }, 1500);
  };

  const onScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const renderImage = ({ item }) => (
    <Image source={{ uri: item }} style={styles.productImage} />
  );
  
  const Pagination = ({ data, currentIndex }) => (
    <View style={styles.paginationContainer}>
      {data.map((_, index) => (
        <View key={index} style={[styles.dot, index === currentIndex ? styles.activeDot : styles.inactiveDot]} />
      ))}
    </View>
  );

  const StarRating = ({ rating }) => (
    <View style={styles.starRatingContainer}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name={i < rating ? 'star' : 'star-outline'} size={16} style={styles.starIcon} />
      ))}
    </View>
  );

  if (isPageLoading) {
    return <ProductDetailSkeleton isDarkMode={isDarkMode} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Icon name="arrow-left" size={24} style={styles.iconColor} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <TouchableOpacity onPress={handleShare} style={styles.headerIcon}>
            <Icon name="share-variant" size={24} style={styles.iconColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={images}
            renderItem={renderImage}
            keyExtractor={(item, index) => `image-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            style={{ width: width, height: width }}
          />
          {images.length > 1 && <Pagination data={images} currentIndex={activeIndex} />}
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <TouchableOpacity>
              <Icon name="heart-outline" size={24} style={styles.heartIcon} />
            </TouchableOpacity>
          </View>
          
          {/* START: FIX - Added rating summary display */}
          {product.reviews && product.reviews.length > 0 && (
            <View style={styles.ratingSummaryContainer}>
                <StarRating rating={
                    product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length
                } />
                <Text style={styles.ratingSummaryText}>
                    {(product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length).toFixed(1)}
                    {' '}
                    ({product.reviews.length} {product.reviews.length > 1 ? 'Reviews' : 'Review'})
                </Text>
            </View>
          )}
          {/* END: FIX */}

          {isNewUser && selectedVariation ? (
            <View style={styles.priceDisplayContainer}>
              <Text style={styles.originalPriceText}>₱{selectedVariation.price.toFixed(2)}</Text>
              <Text style={styles.productPrice}>₱{finalPrice.toFixed(2)}</Text>
            </View>
          ) : (
            <Text style={styles.productPrice}>₱{finalPrice.toFixed(2)}</Text>
          )}

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {product.description || 'No description available for this product. It is a beautiful arrangement perfect for any occasion.'}
          </Text>

          <TouchableOpacity style={styles.addNoteButton} onPress={() => setIsNoteModalVisible(true)}>
             <Icon name="note-plus-outline" size={20} style={styles.primaryText} />
             <Text style={styles.addNoteText}>
               {addonNote ? 'Edit Note' : 'Add a Note'}
             </Text>
          </TouchableOpacity>
          {addonNote ? <Text style={styles.notePreview} numberOfLines={2}>Your Note: "{addonNote}"</Text> : null}
          
          {product.variations && product.variations.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Size</Text>
              <View style={styles.sizeSelector}>
                {product.variations.map((variation) => (
                  <TouchableOpacity
                    key={variation.name}
                    style={[ styles.sizeOption, selectedVariation?.name === variation.name && styles.sizeOptionSelected, ]}
                    onPress={() => setSelectedVariation(variation)}
                  >
                    <Text style={[ styles.sizeText, selectedVariation?.name === variation.name && styles.sizeTextSelected, ]}>
                      {variation.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.quantitySelector}>
            <TouchableOpacity onPress={decrementQuantity} style={styles.quantityButton}>
              <Icon name="minus" size={20} style={styles.iconColor} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity onPress={incrementQuantity} style={styles.quantityButton}>
              <Icon name="plus" size={20} style={styles.iconColor} />
            </TouchableOpacity>
          </View>

          {product.reviews && product.reviews.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Customer Reviews ({product.reviews.length})</Text>
              {product.reviews.map((review, index) => (
                <View key={review.feedbackId || index} style={styles.reviewContainer}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAuthorInfo}>
                      <Text style={styles.reviewAuthor}>{review.customerName}</Text>
                      <StarRating rating={review.rating} />
                    </View>
                  </View>
                  <Text style={styles.reviewMessage}>"{review.message}"</Text>
                  {review.adminReply && (
                    <View style={styles.adminReplyContainer}>
                      <Icon name="storefront-outline" size={18} style={styles.adminReplyIcon} />
                      <View style={styles.adminReplyTextContainer}>
                          <Text style={styles.adminReplyHeader}>Reply from the Shop</Text>
                          <Text style={styles.adminReplyMessage}>{review.adminReply}</Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalPriceContainer}>
          <Text style={styles.totalPriceLabel}>Total Price</Text>
          <Text style={styles.totalPriceValue}>₱{(finalPrice * quantity).toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="check" size={22} color="#FFFFFF" />
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isNoteModalVisible}
        onRequestClose={() => setIsNoteModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Add a Note</Text>
            <TextInput
              style={styles.noteTextInput}
              multiline
              placeholder="Enter a special request or message..."
              placeholderTextColor={isDarkMode ? '#888' : '#AAA'}
              value={addonNote}
              onChangeText={setAddonNote}
            />
            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveNote}>
              <Text style={styles.modalSaveButtonText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (isDarkMode) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' },
  container: { flex: 1 },
  iconColor: { color: isDarkMode ? '#FFF' : '#000' },
  primaryText: { color: '#D81B60' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  headerIcon: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFF' : '#000' },
  
  carouselContainer: {
    width: width,
    height: width,
  },
  productImage: {
    width: width,
    height: width,
    resizeMode: 'cover'
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 15,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#D81B60',
    width: 16,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    width: 8,
  },
  detailsContainer: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 24, fontWeight: 'bold', color: isDarkMode ? '#FFF' : '#333', flex: 1, marginRight: 10 },
  heartIcon: { color: isDarkMode ? '#AAA' : '#888' },

  // START: FIX - Added and adjusted styles for rating summary
  ratingSummaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  ratingSummaryText: {
    fontSize: 14,
    color: isDarkMode ? '#AAA' : '#666',
    marginLeft: 8,
    fontWeight: '600',
  },
  productPrice: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#D81B60', 
    // Removed marginTop to improve spacing with new rating section
    marginBottom: 20 
  },
  priceDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // Removed marginTop to improve spacing
    marginBottom: 20,
  },
  // END: FIX

  originalPriceText: {
    fontSize: 18,
    color: isDarkMode ? '#888' : '#666',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#E0E0E0' : '#444', marginBottom: 15, marginTop: 15, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#333' : '#EEE', paddingBottom: 10 },
  description: { fontSize: 15, color: isDarkMode ? '#B0B0B0' : '#666', lineHeight: 22, marginBottom: 20 },
  addNoteButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#222' : '#F7F7F7', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: isDarkMode ? '#333' : '#EEE' },
  addNoteText: { fontSize: 16, fontWeight: '600', marginLeft: 10, color: '#D81B60' },
  notePreview: { fontSize: 14, color: isDarkMode ? '#AAA' : '#666', marginTop: 10, fontStyle: 'italic' },
  sizeSelector: { flexDirection: 'row', marginBottom: 20, flexWrap: 'wrap' },
  sizeOption: { paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: isDarkMode ? '#444' : '#DDD', borderRadius: 20, marginRight: 10, marginBottom: 10 },
  sizeOptionSelected: { borderColor: '#D81B60', backgroundColor: '#D81B60' },
  sizeText: { fontSize: 14, color: isDarkMode ? '#FFF' : '#333' },
  sizeTextSelected: { color: '#FFFFFF' },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  quantityButton: { width: 40, height: 40, borderWidth: 1, borderColor: isDarkMode ? '#444' : '#DDD', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  quantityText: { fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFF' : '#333', marginHorizontal: 20 },
  
  reviewContainer: {
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: isDarkMode ? '#333' : '#EEE'
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewAuthorInfo: {
    flex: 1
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? '#E0E0E0' : '#333',
  },
  starRatingContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  starIcon: {
    color: '#FFC107',
    marginRight: 2,
  },
  reviewMessage: {
    fontSize: 15,
    color: isDarkMode ? '#B0B0B0' : '#555',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  adminReplyContainer: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(216, 27, 96, 0.1)' : '#FFF4F7',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#D81B60',
  },
  adminReplyIcon: {
      color: '#D81B60',
      marginRight: 10,
      marginTop: 2,
  },
  adminReplyTextContainer: {
      flex: 1,
  },
  adminReplyHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D81B60',
    marginBottom: 4,
  },
  adminReplyMessage: {
    fontSize: 15,
    color: isDarkMode ? '#E0E0E0' : '#444',
    lineHeight: 21,
  },

  footer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#F0F0F0', backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' },
  totalPriceContainer: { flex: 1 },
  totalPriceLabel: { fontSize: 14, color: isDarkMode ? '#AAA' : '#888' },
  totalPriceValue: { fontSize: 22, fontWeight: 'bold', color: '#D81B60' },
  checkoutButton: { flexDirection: 'row', backgroundColor: '#D81B60', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, alignItems: 'center', justifyContent: 'center', minWidth: 130 },
  checkoutButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  modalCenteredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: { margin: 20, width: '90%', backgroundColor: isDarkMode ? '#1E1E1E' : 'white', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { marginBottom: 15, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: isDarkMode ? '#FFF' : '#000' },
  noteTextInput: { width: '100%', height: 100, backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7', borderRadius: 10, padding: 15, textAlignVertical: 'top', fontSize: 16, color: isDarkMode ? '#FFF' : '#000', marginBottom: 20 },
  modalSaveButton: { backgroundColor: '#D81B60', borderRadius: 20, padding: 15, elevation: 2, width: '100%' },
  modalSaveButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
});

export default ProductDetail;