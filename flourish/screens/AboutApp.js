import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Modal, LayoutAnimation, UIManager, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ThemeContext from '../context/ThemeContext'; // Import ThemeContext
import appLogo from '../assets/flourish.png';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// GI-UPDATE: Kompleto ug saktong Firebase config para sa mobile app
const firebaseConfig = {
    apiKey: "AIzaSyDTZKJpdPKCunl7dFpjEUPXY-eboXkPrhk",
    authDomain: "flourish-adf09.firebaseapp.com",
    projectId: "flourish-adf09",
    storageBucket: "flourish-adf09.appspot.com",
    messagingSenderId: "853529980918",
    appId: "1:853529980918:web:abacb3f82df5a3681121d7",
    measurementId: "G-0CEWS807Q0"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const FAQ_DATA = [
  {
    question: "How fresh are your flowers?",
    answer: "We guarantee the freshness of our flowers. We partner with top growers and receive daily deliveries to ensure you get the most vibrant and long-lasting bouquets."
  },
  {
    question: "Do you offer same-day delivery?",
    answer: "Yes, we offer same-day delivery for orders placed before 2 PM local time. Any orders placed after that time will be delivered the following day."
  },
  {
    question: "Can I customize my bouquet?",
    answer: "Absolutely! We love creating custom arrangements. You can contact us directly through the app or by phone to discuss your vision with one of our expert florists."
  },
  {
    question: "What is your return policy?",
    answer: "Your satisfaction is our priority. If you're not happy with your order, please contact us within 24 hours of delivery with a photo of the arrangement, and we'll be happy to assist you."
  },
  {
    question: "How do I care for my flowers?",
    answer: "To maximize the life of your flowers, trim the stems at an angle before placing them in a clean vase with fresh water. Keep them in a cool place, away from direct sunlight and drafts. Change the water every two days."
  }
];

const FaqItem = ({ item, isDarkMode, isActive, onPress }) => {
    const dynamicStyles = {
        faqItem: {
            borderBottomColor: isDarkMode ? '#444' : '#EEE',
        },
        questionText: {
            color: isDarkMode ? '#fff' : '#333',
        },
        answerText: {
            color: isDarkMode ? '#bbb' : '#666',
        },
        iconColor: isDarkMode ? '#D81B60' : '#D81B60',
    };

    return (
        <View style={[styles.faqItem, dynamicStyles.faqItem]}>
            <TouchableOpacity onPress={onPress} style={styles.questionContainer}>
                <Text style={[styles.questionText, dynamicStyles.questionText]}>{item.question}</Text>
                <Icon name={isActive ? 'chevron-up' : 'chevron-down'} size={24} color={dynamicStyles.iconColor} />
            </TouchableOpacity>
            {isActive && (
                <View style={styles.answerContainer}>
                    <Text style={[styles.answerText, dynamicStyles.answerText]}>{item.answer}</Text>
                </View>
            )}
        </View>
    );
};


const FaqModal = ({ visible, onClose, isDarkMode }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFaq = (index) => {
    // Use the spring animation for a smoother effect
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setActiveIndex(activeIndex === index ? null : index);
  };

  const dynamicModalStyles = {
    modalContent: {
      backgroundColor: isDarkMode ? '#1e1e1e' : '#FFFFFF',
      shadowColor: isDarkMode ? '#fff' : '#000',
    },
    modalTitle: {
      color: isDarkMode ? '#fff' : '#333',
      borderBottomColor: isDarkMode ? '#444' : '#EEE',
    },
    closeButton: {
      backgroundColor: isDarkMode ? '#D81B60' : '#F7E9E9',
    },
    closeButtonText: {
      color: isDarkMode ? '#fff' : '#D81B60',
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, dynamicModalStyles.modalContent]}>
          <Text style={[styles.modalTitle, dynamicModalStyles.modalTitle]}>FAQ</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {FAQ_DATA.map((item, index) => (
              <FaqItem
                key={index}
                item={item}
                isDarkMode={isDarkMode}
                isActive={activeIndex === index}
                onPress={() => toggleFaq(index)}
              />
            ))}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, dynamicModalStyles.closeButton]}>
            <Text style={[styles.closeButtonText, dynamicModalStyles.closeButtonText]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};


const AboutApp = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [isFaqModalVisible, setIsFaqModalVisible] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    email: 'loading...',
    phone: 'loading...',
    address: 'loading...'
  });

  useEffect(() => {
    // GIBUTANG NA NAKO IMONG ADMIN UID: Kini na ang mobasa sa data gikan sa imong admin account
    const adminUserId = 'nEVf6hCFk8aeynpzKXwCfcT5iVD2';
    
    const docRef = doc(db, 'users', adminUserId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().businessInfo) {
        const info = docSnap.data().businessInfo;
        setBusinessInfo({
          email: info.email || 'Not available',
          phone: info.phone || 'Not available',
          address: info.address || 'Not available'
        });
      } else {
        console.log("Admin business info not found! Make sure the admin has saved their business info at least once.");
        setBusinessInfo({ email: 'Not found', phone: 'Not found', address: 'Not found' });
      }
    }, (error) => {
        console.error("Error fetching business info: ", error);
        setBusinessInfo({ email: 'Error', phone: 'Error', address: 'Error' });
    });

    return () => unsubscribe();
  }, []);

  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  // Dynamic styles based on the current theme
  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9', // Updated to match UserProfile
    },
    header: {
      backgroundColor: isDarkMode ? '#242424' : '#F7E6E9',
      shadowColor: isDarkMode ? '#fff' : '#D81B60',
    },
    section: {
      backgroundColor: isDarkMode ? '#1e1e1e' : '#FFFFFF',
      shadowColor: isDarkMode ? '#fff' : '#000',
    },
    sectionTitle: {
      color: isDarkMode ? '#fff' : '#333',
      borderBottomColor: isDarkMode ? '#444' : '#EEE',
    },
    sectionText: {
      color: isDarkMode ? '#bbb' : '#666',
    },
    combinedTitle: {
      color: isDarkMode ? '#fff' : '#333',
    },
    featureText: {
      color: isDarkMode ? '#ccc' : '#444',
    },
    contactText: {
      color: isDarkMode ? '#fff' : '#333',
    },
    socialIconText: {
      color: isDarkMode ? '#aaa' : '#666',
    },
    socialIconCircle: {
      backgroundColor: isDarkMode ? '#2c2c2c' : '#F5F5F5',
    },
    footer: {
      borderTopColor: isDarkMode ? '#444' : '#EEE',
    },
    footerText: {
      color: isDarkMode ? '#bbb' : '#333',
    },
    footerVersion: {
      color: isDarkMode ? '#D81B60' : '#D81B60',
    },
    footerCopyright: {
      color: isDarkMode ? '#D81B60' : '#D81B60',
    },
  };

  return (
    <>
      <ScrollView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <View style={styles.headerContent}>
            <Image source={appLogo} style={styles.appLogo} resizeMode="contain" />
          </View>
        </View>

        <View style={[styles.section, dynamicStyles.section]}>
          <View style={styles.combinedContainer}>
            <View style={styles.combinedItem}>
              <View style={[styles.combinedIconContainer, { backgroundColor: '#F08080' }]}>
                <Icon name="target" size={24} color="#fff" />
              </View>
              <View style={styles.combinedTextContainer}>
                <Text style={[styles.combinedTitle, dynamicStyles.combinedTitle]}>Our Mission</Text>
                <Text style={[styles.sectionText, dynamicStyles.sectionText]}>
                  At Flourish, our mission is to connect you with the vibrant world of flowers. We believe that every bouquet tells a story and every plant brings life into a space. We're dedicated to sourcing the freshest, most beautiful flowers and making them accessible to everyone.
                </Text>
              </View>
            </View>
            <View style={styles.combinedItem}>
              <View style={[styles.combinedIconContainer, { backgroundColor: '#66CDAA' }]}>
                <Icon name="eye-outline" size={24} color="#fff" />
              </View>
              <View style={styles.combinedTextContainer}>
                <Text style={[styles.combinedTitle, dynamicStyles.combinedTitle]}>Our Vision</Text>
                <Text style={[styles.sectionText, dynamicStyles.sectionText]}>
                  Our vision is to become the leading platform for floral artistry and gifting. We aim to inspire a global community of flower lovers and empower them to express emotions through nature's most beautiful creations, one perfect bouquet at a time.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Key Features</Text>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconCircle, { backgroundColor: '#FFD700' }]}>
              <Icon name="flower-tulip-outline" size={20} color="#fff" />
            </View>
            <Text style={[styles.featureText, dynamicStyles.featureText]}>Browse a stunning collection of fresh flowers and unique arrangements.</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconCircle, { backgroundColor: '#4CAF50' }]}>
              <Icon name="palette-outline" size={20} color="#fff" />
            </View>
            <Text style={[styles.featureText, dynamicStyles.featureText]}>Discover the meaning and symbolism behind different types of flowers.</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconCircle, { backgroundColor: '#FF8A65' }]}>
              <Icon name="truck-delivery-outline" size={20} color="#fff" />
            </View>
            <Text style={[styles.featureText, dynamicStyles.featureText]}>Enjoy fast and reliable delivery, right to your doorstep.</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconCircle, { backgroundColor: '#1E90FF' }]}>
              <Icon name="gift-outline" size={20} color="#fff" />
            </View>
            <Text style={[styles.featureText, dynamicStyles.featureText]}>Create personalized gifts with custom messages and packaging options.</Text>
          </View>
        </View>

        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Get in Touch</Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={() => openLink(`mailto:${businessInfo.email}`)}>
            <View style={[styles.contactIconContainer, { backgroundColor: '#FFD700' }]}>
              <Icon name="email-outline" size={20} color="#fff" />
            </View>
            <Text style={[styles.contactText, dynamicStyles.contactText]}>{businessInfo.email}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactItem} onPress={() => openLink(`tel:${businessInfo.phone}`)}>
            <View style={[styles.contactIconContainer, { backgroundColor: '#4CAF50' }]}>
              <Icon name="phone-outline" size={20} color="#fff" />
            </View>
            <Text style={[styles.contactText, dynamicStyles.contactText]}>{businessInfo.phone}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactItem} onPress={() => openLink(`https://maps.google.com/?q=${encodeURIComponent(businessInfo.address)}`)}>
            <View style={[styles.contactIconContainer, { backgroundColor: '#D81B60' }]}>
              <Icon name="map-marker-outline" size={20} color="#fff" />
            </View>
            <Text style={[styles.contactText, dynamicStyles.contactText]}>{businessInfo.address}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={() => setIsFaqModalVisible(true)}>
            <View style={[styles.contactIconContainer, { backgroundColor: '#1E90FF' }]}>
              <Icon name="help-circle-outline" size={20} color="#fff" />
            </View>
            <Text style={[styles.contactText, dynamicStyles.contactText]}>Visit our FAQ</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Follow Us</Text>
          <View style={styles.socialIconsContainer}>
            <TouchableOpacity style={styles.socialIcon} onPress={() => openLink('https://www.instagram.com/flourish_by_christy/')}>
              <View style={[styles.socialIconCircle, dynamicStyles.socialIconCircle]}>
                <Icon name="instagram" size={26} color="#E1306C" />
              </View>
              <Text style={[styles.socialIconText, dynamicStyles.socialIconText]}>Instagramm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon} onPress={() => openLink('https://www.facebook.com/your_app_name')}>
              <View style={[styles.socialIconCircle, dynamicStyles.socialIconCircle]}>
                <Icon name="facebook" size={26} color="#4267B2" />
              </View>
              <Text style={[styles.socialIconText, dynamicStyles.socialIconText]}>Facebookk</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon} onPress={() => openLink('https://www.pinterest.com/your_app_name')}>
              <View style={[styles.socialIconCircle, dynamicStyles.socialIconCircle]}>
                <Icon name="pinterest" size={26} color="#BD081C" />
              </View>
              <Text style={[styles.socialIconText, dynamicStyles.socialIconText]}>Pinterestt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon} onPress={() => openLink('https://www.twitter.com/your_app_name')}>
              <View style={[styles.socialIconCircle, dynamicStyles.socialIconCircle]}>
                <Icon name="twitter" size={26} color="#1DA1F2" />
              </View>
              <Text style={[styles.socialIconText, dynamicStyles.socialIconText]}>Twitterr</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.footer, dynamicStyles.footer]}>
          <View style={styles.footerContent}>
            <Text style={[styles.footerText, dynamicStyles.footerText]}>
              <Text style={[styles.footerVersion, dynamicStyles.footerVersion]}>Version 1.0.0</Text> | <Text style={[styles.footerCopyright, dynamicStyles.footerCopyright]}>© 2025 Flourish™. All Rights Reserved.</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
      <FaqModal
        visible={isFaqModalVisible}
        onClose={() => setIsFaqModalVisible(false)}
        isDarkMode={isDarkMode}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  headerContent: {
    alignItems: 'center',
  },
  appLogo: {
    width: 100,
    height: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  section: {
    borderRadius: 20,
    marginHorizontal: 15,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  combinedContainer: {
    flexDirection: 'column',
  },
  combinedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  combinedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 5,
  },
  combinedTextContainer: {
    flex: 1,
  },
  combinedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '500',
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  socialIcon: {
    alignItems: 'center',
  },
  socialIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  socialIconText: {
    fontSize: 12,
  },
  footer: {
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
  footerVersion: {
    fontWeight: 'bold',
  },
  footerCopyright: {
    fontWeight: 'bold',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  faqItem: {
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  answerContainer: {
    paddingBottom: 15,
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
  },
  closeButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AboutApp;