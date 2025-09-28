// screens/MessageChatbot.js

// --- IMPORTS ---
import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../Backend/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import ThemeContext from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const MessageChatbot = () => {
  // --- STATE MANAGEMENT ---
  const { isDarkMode } = useContext(ThemeContext);
  const navigation = useNavigation();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [products, setProducts] = useState([]); // State to hold shop products
  const [loading, setLoading] = useState(true);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const scrollViewRef = useRef();

  // --- CHAT HISTORY STATE ---
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  // --- DYNAMIC STYLING ---
  const colors = {
    background: isDarkMode ? '#1a1a2e' : '#FFF6F0',
    headerBg: isDarkMode ? '#1a1a2e' : '#FFFFFF',
    headerText: isDarkMode ? '#FFFFFF' : '#000000',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    subText: isDarkMode ? '#AAAAAA' : '#666666',
    botBubble: isDarkMode ? '#3a3a5c' : '#FFFFFF',
    userBubble: '#E91E63',
    userBubbleText: '#FFFFFF',
    inputBg: isDarkMode ? '#2c2c44' : '#F5F5F5',
    inputText: isDarkMode ? '#FFFFFF' : '#000000',
    inputBorder: isDarkMode ? '#3a3a5c' : '#E0E0E0',
    sendButton: '#E91E63',
    gradientStart: '#FFE0E6',
    gradientMiddle: '#E6F3FF',
    gradientEnd: '#E8F5E8',
    modalBg: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
    modalContentBg: isDarkMode ? '#2c2c44' : '#FFFFFF',
    danger: '#D32F2F',
  };

  const styles = getStyles(colors);

  // --- EFFECTS ---
  useEffect(() => {
    // Load all necessary data when the screen opens
    const initializeChat = async () => {
      await loadUserData();
      await loadShopData(); // Load product data
      await loadChatHistory();
      setLoading(false);
    };
    initializeChat();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (messages.length > 1) {
      saveCurrentChat();
    }
  }, [messages]);

  // --- CHAT HISTORY FUNCTIONS ---
  const CHAT_HISTORY_KEY = '@chat_history';

  const loadChatHistory = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      const history = jsonValue != null ? JSON.parse(jsonValue) : [];
      setChatHistory(history);
    } catch (e) { console.error('Failed to load chat history.', e); }
  };

  const saveCurrentChat = async () => {
    const userMessage = messages.find(m => m.sender === 'user');
    if (!userMessage) return;

    const title = userMessage.text.substring(0, 40) + (userMessage.text.length > 40 ? '...' : '');
    const idToSave = currentChatId || Date.now();

    const newChatEntry = { id: idToSave, title, messages, timestamp: new Date() };

    try {
      const existingHistory = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      let history = existingHistory ? JSON.parse(existingHistory) : [];
      const existingIndex = history.findIndex(chat => chat.id === idToSave);

      if (existingIndex > -1) {
        history[existingIndex] = newChatEntry;
      } else {
        history.unshift(newChatEntry);
      }

      history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (history.length > 50) history.pop();

      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
      setChatHistory(history);
      if (!currentChatId) setCurrentChatId(idToSave);

    } catch (e) { console.error('Failed to save chat.', e); }
  };
  
  const startNewChat = (userName = 'Guest') => {
    setCurrentChatId(null);
    const welcomeMessage = {
      id: 1,
      text: `Hello ${userName}! 👋\nWelcome to Flourish Flower Shop. Ask me about our flowers!`,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    if (isHistoryVisible) setIsHistoryVisible(false);
  };

  const loadChatFromHistory = (chat) => {
    setMessages(chat.messages);
    setCurrentChatId(chat.id);
    setIsHistoryVisible(false);
  };

  const deleteChat = async (chatId) => {
    try {
      const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedHistory));
      setChatHistory(updatedHistory);
      if (currentChatId === chatId) {
        startNewChat(userProfile?.fullName || 'Guest');
      }
    } catch (e) { console.error('Failed to delete chat.', e); }
  };
  
  // --- DATA LOADING ---
  const loadUserData = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, 'signup_users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setUserProfile(userData);
        startNewChat(userData.fullName || 'Guest');
      } else {
        startNewChat('Guest');
      }
    } else {
      startNewChat('Guest');
    }
  };

  const loadShopData = async () => {
    try {
      const productsQuery = query(collection(db, 'artifacts'), where('type', '==', 'product'));
      const querySnapshot = await getDocs(productsQuery);
      const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
      console.log('Products loaded:', productsData.length);
    } catch (error) {
      console.error("Failed to load shop data:", error);
    }
  };
  
  // --- ✅ UPGRADED CHATBOT BRAIN (Smarter and More Conversational) ---
  const getAIResponse = (userMessageText) => {
      const message = userMessageText.toLowerCase().trim();

      // --- UPGRADED KNOWLEDGE BASE ---
      // This is now more detailed to understand more user questions.
      const knowledgeBase = [
        // Greetings
        { keywords: ["hello", "hi", "good day", "hey"], answer: "Hello! Welcome to Flourish Flower Shop. How can I assist you today?" },
        
        // Asking for All Products
        { keywords: ["flowers", "products", "what do you have", "show me", "selection", "available"], answer: `We have a lovely selection of flowers! Our current offerings include Roses, Tulips, Sunflowers, and Lilies. You can also see our bestsellers on the main page. Is there a specific flower you'd like to know more about?` },
        
        // Delivery Information
        { keywords: ["deliver", "delivery", "shipping", "how much is the fee"], answer: "Yes, we deliver! Our standard delivery fee starts at ₱50 for nearby areas. The final fee depends on the delivery location." },
        { keywords: ["same-day", "same day", "how fast", "how long"], answer: "We offer same-day delivery for all orders placed before 2 PM. Orders after 2 PM will be delivered the next day." },
        
        // Payment Methods
        { keywords: ["payment", "pay", "cod", "cash on delivery", "gcash", "credit card"], answer: "We have several payment options for your convenience! We accept Cash on Delivery (COD), GCash, PayMaya, Bank Transfer, and Credit/Debit Cards." },

        // Shop Information
        { keywords: ["location", "address", "where are you", "physical store"], answer: "Our physical store is located at 123 Flower St., Cebu City. We'd love for you to visit!" },
        { keywords: ["hours", "open", "close", "store hours"], answer: "We are open from 9 AM to 7 PM, Mondays to Saturdays." },
        { keywords: ["contact", "phone", "number", "call"], answer: "You can contact us at (032) 123-4567 for any inquiries. How else can I help?" },
        
        // How to Order
        { keywords: ["how to order", "order", "buy", "place an order"], answer: "You can easily place an order through our app! Just browse our products, add your chosen flowers to the cart, and proceed to checkout." },
        
        // Closing / Gratitude
        { keywords: ["thanks", "thank you"], answer: "You're very welcome! Is there anything else I can help you with?" },
        { keywords: ["bye", "that's all"], answer: "Thank you for visiting Flourish! Have a wonderful day." }
      ];

      // 1. Check for specific product names first (from your database)
      for (const product of products) {
          const productName = product.name ? product.name.toLowerCase() : '';
          if (message.includes(productName) && productName) {
              return `Yes, we have ${product.name}! Here are the details:\n\nDescription: ${product.description}\nPrice: ₱${product.price}`;
          }
      }

      // 2. Check the upgraded knowledge base for keywords
      for (const item of knowledgeBase) {
        for (const keyword of item.keywords) {
          if (message.includes(keyword)) {
            return item.answer;
          }
        }
      }

      // 3. A more helpful default answer if nothing matches
      return "I'm sorry, I didn't quite understand that. You can ask me about our flower selection, delivery, payment methods, or store hours.";
  };

  const frequentQuestions = [
    'What flowers do you have?',
    'How much is the delivery fee?',
    'What are your store hours?',
    'What payment methods are accepted?',
  ];

  // --- SEND MESSAGE FUNCTION (No changes needed here) ---
  const sendMessage = async (text = message) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsBotTyping(true);

    const botResponseText = getAIResponse(text.trim());

    setTimeout(() => {
      const botMessage = {
          id: Date.now() + 1,
          text: botResponseText,
          sender: 'bot',
          timestamp: new Date(),
      };
      setIsBotTyping(false);
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  // --- RENDER FUNCTIONS ---
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color={colors.sendButton} />
        </LinearGradient>
      </SafeAreaView>
    );
  }
  
  const renderHistoryModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isHistoryVisible}
      onRequestClose={() => setIsHistoryVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recent Chats</Text>
            <TouchableOpacity onPress={() => setIsHistoryVisible(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={chatHistory}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <TouchableOpacity style={styles.historyItemTextContainer} onPress={() => loadChatFromHistory(item)}>
                  <Text style={styles.historyItemText} numberOfLines={1}>{item.title}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteChat(item.id)}>
                  <Icon name="delete-outline" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyHistoryText}>No recent chats found.</Text>}
          />
          <TouchableOpacity style={styles.newChatButton} onPress={() => startNewChat(userProfile?.fullName || 'Guest')}>
            <Icon name="add" size={20} color="#FFFFFF" style={{marginRight: 8}}/>
            <Text style={styles.newChatButtonText}>Start New Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHistoryModal()}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Messages</Text>
          </View>
          <TouchableOpacity onPress={() => setIsHistoryVisible(true)} style={styles.headerRight}>
             <Icon name="history" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
          style={styles.messagesContainer}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.botIntroContainer}>
              <View style={styles.botAvatarLarge}>
                <Icon name="local-florist" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.botName}>Flourish AI</Text>
            </View>
            
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[ styles.messageRow, msg.sender === 'user' ? styles.userRow : styles.botRow ]}
              >
                <View style={[ styles.bubbleContainer, msg.sender === 'user' ? styles.userBubble : styles.botBubble ]}>
                    <Text style={[ styles.messageText, msg.sender === 'user' ? styles.userMessageText : styles.botMessageText ]} selectable={true}>
                      {msg.text}
                    </Text>
                </View>
              </View>
            ))}
            
            {isBotTyping && (
               <View style={[styles.messageRow, styles.botRow]}>
                  <View style={[styles.bubbleContainer, styles.botBubble]}>
                      <ActivityIndicator size="small" color={colors.text} />
                  </View>
               </View>
            )}

            <View style={styles.faqContainer}>
              <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
              {frequentQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.faqButton}
                  onPress={() => sendMessage(question)}
                >
                  <Text style={styles.faqButtonText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </LinearGradient>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.imageButton} onPress={() => Alert.alert("Feature Not Available", "Image upload is temporarily disabled.")}>
              <Icon name="photo-camera" size={20} color={colors.sendButton} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.subText}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              disabled={!message.trim()}
            >
              <Icon name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- STYLESHEET (No changes needed here) ---
const getStyles = (colors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.headerBg },
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      backgroundColor: colors.headerBg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
      paddingBottom: 15,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      elevation: 2,
    },
    backButton: { padding: 5 },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '600', color: colors.headerText },
    headerRight: { width: 40, alignItems: 'flex-end' },
    messagesContainer: { flex: 1 },
    messagesContent: { 
      paddingHorizontal: 10, 
      paddingVertical: 20,
      flexGrow: 1,
    },
    botIntroContainer: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
    botAvatarLarge: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.sendButton,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    botName: { fontSize: 18, fontWeight: '600', color: colors.text },
    messageRow: {
      flexDirection: 'row',
      marginBottom: 15,
      marginHorizontal: 10,
    },
    userRow: { justifyContent: 'flex-end' },
    botRow: { justifyContent: 'flex-start' },
    bubbleContainer: {
      maxWidth: '85%',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    userBubble: {
      backgroundColor: colors.userBubble,
      borderTopRightRadius: 5,
    },
    botBubble: {
      backgroundColor: colors.botBubble,
      borderTopLeftRadius: 5,
    },
    messageText: {
      fontSize: 15.5,
      lineHeight: 22,
    },
    userMessageText: { color: colors.userBubbleText },
    botMessageText: { color: colors.text },
    faqContainer: { marginTop: 30, paddingHorizontal: 10 },
    faqTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 },
    faqButton: {
      backgroundColor: 'rgba(255,255,255,0.9)',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      marginBottom: 10,
    },
    faqButtonText: { fontSize: 14, color: colors.text, fontWeight: '500' },
    bottomSpacer: { height: 30 },
    inputContainer: {
      backgroundColor: colors.headerBg,
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.05)',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.inputBg,
      borderRadius: 25,
      paddingHorizontal: 15,
      paddingVertical: 5,
    },
    imageButton: {
      padding: 8,
      marginRight: 8,
      marginBottom: Platform.OS === 'ios' ? 5 : 3,
    },
    textInput: {
      flex: 1,
      color: colors.inputText,
      fontSize: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      paddingRight: 10,
      maxHeight: 100,
    },
    sendButton: {
      backgroundColor: colors.sendButton,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Platform.OS === 'ios' ? 5 : 3,
    },
    sendButtonDisabled: { opacity: 0.5 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.modalBg },
    modalContainer: {
      backgroundColor: colors.modalContentBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      height: '60%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.inputBorder,
    },
    historyItemTextContainer: { flex: 1, marginRight: 15 },
    historyItemText: { fontSize: 16, color: colors.text },
    emptyHistoryText: { textAlign: 'center', marginTop: 50, color: colors.subText, fontSize: 16 },
    newChatButton: {
      flexDirection: 'row',
      backgroundColor: colors.sendButton,
      padding: 15,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    newChatButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  });

export default MessageChatbot;