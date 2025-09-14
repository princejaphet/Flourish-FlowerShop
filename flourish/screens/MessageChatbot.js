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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const MessageChatbot = () => {
  // --- STATE MANAGEMENT ---
  const { isDarkMode } = useContext(ThemeContext);
  const navigation = useNavigation();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const scrollViewRef = useRef();

  // --- CHAT HISTORY STATE ---
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  // --- IMAGE UPLOAD STATE ---
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  // --- DYNAMIC STYLING ---
  const colors = {
    background: isDarkMode ? '#1a1a2e' : '#FFF6F0',
    headerBg: isDarkMode ? '#1a1a2e' : '#FFFFFF',
    headerText: isDarkMode ? '#FFFFFF' : '#000000',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    subText: isDarkMode ? '#AAAAAA' : '#666666',
    botBubble: isDarkMode ? '#3a3a5c' : '#FFFFFF', // Theme-aware bot bubble
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
    loadUserData();
    loadChatHistory();
    requestPermissions();
  }, []);

  useEffect(() => {
    // Add a small delay to ensure proper scrolling after state update
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
    } catch (e) {
      console.error('Failed to load chat history.', e);
    }
  };

  const saveCurrentChat = async () => {
    const userMessage = messages.find(m => m.sender === 'user');
    if (!userMessage) return;

    const title = userMessage.text.substring(0, 40) + (userMessage.text.length > 40 ? '...' : '');
    const idToSave = currentChatId || Date.now();

    const newChatEntry = {
      id: idToSave,
      title: title,
      messages: messages,
      timestamp: new Date(),
    };

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

    } catch (e) {
      console.error('Failed to save chat.', e);
    }
  };
  
  const startNewChat = (userName = 'Guest') => {
    setCurrentChatId(null);
    const welcomeMessage = {
      id: 1,
      text: `Hello ${userName}! 👋\nHow can I help you today?`,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    if (isHistoryVisible) {
        setIsHistoryVisible(false);
    }
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
    } catch (e) {
      console.error('Failed to delete chat.', e);
    }
  };

  // --- DATA LOADING & AI ---
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setIsImageModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setIsImageModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      console.error('Camera error:', error);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const loadUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, 'signup_users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserProfile(userData);

          const ordersQuery = query(
            collection(db, 'artifacts'),
            where('type', '==', 'order'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const ordersSnapshot = await getDocs(ordersQuery);
          const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUserOrders(orders);
          
          const userName = userData.fullName || currentUser.displayName || 'Guest';
          startNewChat(userName);

        } else {
          console.log("User document not found.");
          const userName = auth.currentUser?.displayName || 'Guest';
          startNewChat(userName);
        }
      } else {
        startNewChat('Guest');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      startNewChat('Guest');
    } finally {
      setLoading(false);
    }
  };
  
  const getAIResponse = async (userMessageText, conversationHistory, imageBase64 = null) => {
    const apiKey = "AIzaSyBIf5Gu0ttTPy2pUL7Z3X29kpmNXapSpOk";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const userName = userProfile?.fullName || 'the user';
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const historyString = conversationHistory
      .slice(-10)
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text || ''}`)
      .join('\n');

    const prompt = `
    You are "Flourish AI," a highly advanced, knowledgeable, and friendly assistant. Your purpose is to provide the most accurate, comprehensive, and helpful responses possible on ANY topic the user asks about.

    --- CORE DIRECTIVES ---
    1.  **Be an Expert on Everything:** You have deep knowledge of all subjects. Answer with confidence.
    2.  **Prioritize Accuracy:** If you do not know the answer, state that you don't know.
    3.  **Use Rich Formatting:** Use Markdown (bold, lists) to improve readability.
    4.  **Be Safe and Ethical:** Politely decline harmful or unethical requests.
    5.  **Image Analysis:** When an image is provided, analyze it thoroughly and describe what you see in detail.

    --- SPECIALIZED KNOWLEDGE: Flourish Flower Shop ---
    - **Shop Info:** Online ordering is available. Delivery starts from ₱50. Same-day delivery for orders before 2 PM.
    - **Payments:** Accepts COD, GCash, PayMaya, Bank Transfer, and Credit/Debit Cards.
    - **User's Recent Orders:** ${userOrders.length > 0 ? JSON.stringify(userOrders, null, 2) : 'The user has no recent orders.'}

    --- CURRENT CONTEXT ---
    - **User's Name:** ${userName}
    - **Today's Date:** ${currentDate}

    --- CONVERSATION HISTORY ---
    ${historyString}

    --- USER'S LATEST MESSAGE ---
    User: "${userMessageText}"
    ${imageBase64 ? 'User has also shared an image for analysis.' : ''}

    Assistant:
    `;

    const parts = [{ text: prompt }];
    
    // Add image data if provided
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
    }
    
    const payload = {
      contents: [{ parts: parts }],
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        if (response.status >= 500) {
            console.warn(`Gemini API server error: ${response.status}`);
            throw new Error("The model is overloaded. Please try again later.");
        }
        const errorData = await response.json();
        console.error("Gemini API Error:", errorData.error.message);
        throw new Error(errorData.error.message || "An API error occurred.");
    }
    
    const result = await response.json();

    if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
      return result.candidates[0].content.parts[0].text;
    }

    if (result.promptFeedback && result.promptFeedback.blockReason) {
      console.error("Prompt was blocked by API. Reason:", result.promptFeedback.blockReason);
      throw new Error("I can't respond to that. Please try asking something else.");
    }
    
    throw new Error("Couldn't get a valid response from the AI.");
  };

  const frequentQuestions = [
    'Do you have an online shop?',
    'How much is the delivery fee?',
    'Do you offer same-day delivery?',
    'What payment methods are accepted?',
  ];

  const sendMessage = async (text = message, imageData = null) => {
    if (!text.trim() && !imageData) return;

    const userMessage = {
      id: Date.now(),
      text: text.trim() || (imageData ? 'Shared an image' : ''),
      sender: 'user',
      timestamp: new Date(),
      image: imageData ? imageData.uri : null,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setMessage('');
    setSelectedImage(null);
    setIsImageModalVisible(false);
    setIsBotTyping(true);

    let botResponseText = '';
    const maxRetries = 3;
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const imageBase64 = imageData ? imageData.base64 : null;
            botResponseText = await getAIResponse(text.trim(), updatedMessages, imageBase64);
            break;
        } catch (error) {
            console.log(`Attempt ${attempt} failed: ${error.message}`);
            if (attempt === maxRetries) {
                botResponseText = "I'm having trouble connecting right now. Please try again in a moment.";
            } else {
                await delay(1000 * attempt);
            }
        }
    }
    
    setIsBotTyping(false);
    const botMessage = {
        id: Date.now() + 1,
        text: botResponseText,
        sender: 'bot',
        timestamp: new Date(),
    };
    setMessages(prev => [...prev, botMessage]);
  };

  // --- RENDER FUNCTIONS ---
  // --- CHANGE IS HERE ---
  // Removed the loading text from the loading container
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

  const renderImageModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isImageModalVisible}
      onRequestClose={() => {
        setIsImageModalVisible(false);
        setSelectedImage(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.imageModalContainer}>
          <View style={styles.imageModalHeader}>
            <Text style={styles.modalTitle}>Send Image</Text>
            <TouchableOpacity onPress={() => {
              setIsImageModalVisible(false);
              setSelectedImage(null);
            }}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage.uri }} 
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          
          <View style={styles.imageModalInput}>
            <TextInput
              style={styles.imageTextInput}
              placeholder="Add a message about this image..."
              placeholderTextColor={colors.subText}
              value={message}
              onChangeText={setMessage}
              multiline
            />
          </View>
          
          <View style={styles.imageModalButtons}>
            <TouchableOpacity
              style={[styles.imageModalButton, styles.cancelButton]}
              onPress={() => {
                setIsImageModalVisible(false);
                setSelectedImage(null);
                setMessage('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.imageModalButton, styles.sendImageButton]}
              onPress={() => sendMessage(message, selectedImage)}
            >
              <Icon name="send" size={18} color="#FFFFFF" style={{marginRight: 5}}/>
              <Text style={styles.sendImageButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHistoryModal()} 
      {renderImageModal()}
      
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
            keyboardShouldPersistTaps="handled"
            bounces={true}
            style={{ flex: 1 }}
          >
            <View style={styles.botIntroContainer}>
              <View style={styles.botAvatarLarge}>
                <Icon name="local-florist" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.botName}>Flourish AI</Text>
            </View>
            
            {/* --- FIXED MESSAGE RENDERING WITH IMAGE SUPPORT --- */}
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  msg.sender === 'user' ? styles.userRow : styles.botRow,
                ]}
              >
                <View
                  style={[
                    styles.bubbleContainer,
                    msg.sender === 'user' ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  {msg.image && (
                    <Image 
                      source={{ uri: msg.image }} 
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  )}
                  {msg.text && (
                    <Text
                      style={[
                        styles.messageText,
                        msg.sender === 'user'
                          ? styles.userMessageText
                          : styles.botMessageText,
                        msg.image && styles.messageTextWithImage,
                      ]}
                      selectable={true}
                    >
                      {msg.text}
                    </Text>
                  )}
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

            {messages.length <= 1 && (
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
            )}
            
            {/* --- BOTTOM SPACER TO ENSURE LAST MESSAGE IS VISIBLE --- */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </LinearGradient>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity 
              style={styles.imageButton}
              onPress={showImageOptions}
            >
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

// --- STYLESHEET WITH BOTTOM SPACER FIX ---
const getStyles = (colors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.headerBg },
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 16, color: colors.text, marginTop: 10 },
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
      flexGrow: 1, // Allows content to grow and fill available space
      width: '100%', // Ensure full width
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

    // --- Message bubble styles - FIXED FOR TEXT DISPLAY ---
    messageRow: {
      flexDirection: 'row',
      marginBottom: 15,
      marginHorizontal: 10,
      width: '100%', // Ensure full width available
    },
    userRow: {
      justifyContent: 'flex-end',
    },
    botRow: {
      justifyContent: 'flex-start',
    },
    bubbleContainer: {
      maxWidth: '85%',
      minWidth: '20%', // Ensure minimum width
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flex: 0, // Don't flex to prevent text cutting
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
      flexWrap: 'wrap', // Allow text to wrap
      width: '100%', // Take full width of container
    },
    userMessageText: {
      color: colors.userBubbleText,
    },
    botMessageText: {
      color: colors.text,
    },

    // --- Image message styles ---
    messageImage: {
      width: 200,
      height: 150,
      borderRadius: 12,
      marginBottom: 8,
    },
    messageTextWithImage: {
      marginTop: 5,
    },

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
    
    // --- BOTTOM SPACER TO FIX VISIBILITY ---
    bottomSpacer: {
      height: 30, // Adds space at the bottom so last message is fully visible
    },
    
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
    
    // --- Image Modal Styles ---
    imageModalContainer: {
      backgroundColor: colors.modalContentBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      height: '70%',
      width: '100%',
    },
    imageModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    previewImage: {
      width: '100%',
      height: 250,
      borderRadius: 12,
      marginBottom: 20,
      backgroundColor: colors.inputBg,
    },
    imageModalInput: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
      minHeight: 60,
    },
    imageTextInput: {
      color: colors.inputText,
      fontSize: 16,
      textAlignVertical: 'top',
    },
    imageModalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 15,
    },
    imageModalButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 25,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: colors.inputBorder,
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    sendImageButton: {
      backgroundColor: colors.sendButton,
    },
    sendImageButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default MessageChatbot;