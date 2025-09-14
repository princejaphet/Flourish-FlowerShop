// screens/ChatScreen.js
import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Alert,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ThemeContext from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';


import { db, auth } from '../Backend/firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  serverTimestamp, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const { width, height } = Dimensions.get('window');

const ChatScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef();

  const colors = {
    background: isDarkMode ? '#0F0F23' : '#F8FAFC',
    gradientStart: isDarkMode ? '#1A1A2E' : '#FFFFFF',
    gradientEnd: isDarkMode ? '#16213E' : '#F1F5F9',
    card: isDarkMode ? '#1E1E3F' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#1E293B',
    subText: isDarkMode ? '#94A3B8' : '#64748B',
    primary: '#EC4899',
    primaryLight: '#F472B6',
    primaryDark: '#BE185D',
    secondary: '#8B5CF6',
    userBubble: '#EC4899',
    adminBubble: isDarkMode ? '#374151' : '#F1F5F9',
    userBubbleText: '#FFFFFF',
    adminBubbleText: isDarkMode ? '#F9FAFB' : '#374151',
    inputBackground: isDarkMode ? '#1F2937' : '#FFFFFF',
    inputBorder: isDarkMode ? '#374151' : '#E2E8F0',
    shadow: isDarkMode ? '#000000' : '#64748B',
    online: '#10B981',
    border: isDarkMode ? '#374151' : '#E2E8F0',
  };

  const styles = getStyles(colors);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'signup_users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserName(userDoc.data().fullName || 'User');
        } else {
          setUserName('User');
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- START: Real-time Presence and Seen Logic ---
  useFocusEffect(
    useCallback(() => {
      if (user) {
        const appId = 'flourish-flowers-app';
        const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${user.uid}`);
        
        // Set user to online and mark as seen when screen is focused
        setDoc(chatThreadRef, { isOnline: true, isSeenByUser: true }, { merge: true });

        // --- NEW: Mark all received admin messages as seen ---
        const markAdminMessagesAsSeen = async () => {
          const messagesRef = collection(db, `artifacts/${appId}/public/data/chats/${user.uid}/messages`);
          const q = query(messagesRef, where("senderId", "==", "flourish-admin"), where("isSeen", "==", false));
          
          try {
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach(document => {
              batch.update(document.ref, { isSeen: true });
            });
            await batch.commit();
          } catch (error) {
            console.error("Error marking messages as seen: ", error);
          }
        };

        markAdminMessagesAsSeen();

        // Set user to offline when the screen is unfocused
        return () => {
          setDoc(chatThreadRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
        };
      }
    }, [user])
  );
  // --- END: Real-time Presence and Seen Logic ---

  const sendWelcomeMessage = async () => {
    if (!user) return;
    const appId = 'flourish-flowers-app';
    const messagesRef = collection(db, `artifacts/${appId}/public/data/chats/${user.uid}/messages`);
    
    try {
      setIsTyping(true);
      setTimeout(async () => {
        await addDoc(messagesRef, {
          text: 'Hello! Welcome to Flourish Flowers 🌸 How can I help you find the perfect flowers today?',
          timestamp: serverTimestamp(),
          senderId: 'flourish-admin', 
          senderName: 'Flourish',
          senderAvatar: 'F',
          isSeen: false, // Admin message starts as unseen
        });
        setIsTyping(false);
      }, 1500);
    } catch (error) {
      console.error("Error sending welcome message: ", error);
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (user) {
      const appId = 'flourish-flowers-app';
      const messagesRef = collection(db, `artifacts/${appId}/public/data/chats/${user.uid}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
          sendWelcomeMessage();
        }
        
        const fetchedMessages = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate(),
          };
        });
        setMessages(fetchedMessages);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const handleSend = async () => {
    if (newMessage.trim() === '' || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    const appId = 'flourish-flowers-app';
    const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${user.uid}`);
    const messagesRef = collection(chatThreadRef, 'messages');
    
    try {
      await setDoc(chatThreadRef, {
        lastMessage: messageText,
        timestamp: serverTimestamp(),
        userName: userName,
        userAvatar: userName.substring(0, 2).toUpperCase(),
        isRead: false, // Mark as unread for the admin
        isSeenByUser: true, // User is active, so they've seen admin messages
        lastMessageSenderId: user.uid, // Identify user as sender
      }, { merge: true });

      await addDoc(messagesRef, {
        text: messageText,
        timestamp: serverTimestamp(),
        senderId: user.uid,
        senderName: userName,
        senderAvatar: userName.substring(0, 2).toUpperCase(),
        isSeen: false, // Message starts as delivered but not seen
      });
      
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };
  
  const handleDeleteMessage = (messageId) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: async () => {
            const appId = 'flourish-flowers-app';
            const messageDocRef = doc(db, `artifacts/${appId}/public/data/chats/${user.uid}/messages`, messageId);
            try {
              await deleteDoc(messageDocRef);
            } catch (error) {
              console.error("Error deleting message: ", error);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const TypingIndicator = () => (
    <View style={styles.typingContainer}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatarGradient}>
          <Text style={styles.avatarText}>F</Text>
        </View>
      </View>
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );

  const renderMessage = ({ item, index }) => {
    const isUserMessage = item.senderId === user?.uid;
    const isLastMessage = index === messages.length - 1;
    
    return (
      <TouchableOpacity
        onLongPress={() => isUserMessage && handleDeleteMessage(item.id)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.messageRow, 
          { justifyContent: isUserMessage ? 'flex-end' : 'flex-start' },
          isLastMessage && styles.lastMessage
        ]}>
          {!isUserMessage && (
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGradient}>
                <Text style={styles.avatarText}>{item.senderAvatar || 'F'}</Text>
              </View>
            </View>
          )}

          <View style={[
            styles.messageBubble, 
            isUserMessage ? styles.userBubble : styles.adminBubble
          ]}>
            <Text 
              style={isUserMessage ? styles.userBubbleText : styles.adminBubbleText}
            >
              {item.text || 'No message content'}
            </Text>
            <View style={[styles.timestampContainer, isUserMessage && styles.userTimestampContainer]}>
              <Text style={[styles.timestamp, isUserMessage && styles.userTimestamp]}>
                {item.timestamp ? item.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : 'Sending...'}
              </Text>
              {/* --- NEW: Delivery/Seen Status Icon --- */}
              {isUserMessage && (
                <Icon
                  name={item.isSeen ? 'check-all' : 'check'}
                  size={15}
                  color={isDarkMode ? 'rgba(255,255,255,0.8)' : '#FFFFFF'}
                  style={styles.checkIcon}
                />
              )}
            </View>
          </View>

          {isUserMessage && (
            <View style={styles.userAvatarContainer}>
              <View style={styles.userAvatarGradient}>
                <Text style={styles.avatarText}>
                  {userName.substring(0, 1).toUpperCase()}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleImageUpload = () => {
    console.log('Image upload button pressed!');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Enhanced Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatarContainer}>
              <View style={styles.headerAvatarGradient}>
                <Icon name="flower" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Flourish Flowers</Text>
              <Text style={styles.headerSubtitle}>
                {isTyping ? 'typing...' : 'Online • Usually replies instantly'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.moreButton}>
            <Icon name="dots-vertical" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.chatContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />
              {isTyping && <TypingIndicator />}
            </>
          )}
          
          {/* Enhanced Input Container */}
          <View style={[
            styles.inputOuterContainer,
            keyboardVisible && styles.inputOuterContainerKeyboard
          ]}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type your message..."
                placeholderTextColor={colors.subText}
                multiline
              />
              
              <View style={styles.inputActions}>
                <TouchableOpacity 
                  style={styles.attachButton} 
                  onPress={handleImageUpload}
                >
                  <Icon name="attachment" size={22} color={colors.subText} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    newMessage.trim() && styles.sendButtonActive
                  ]} 
                  onPress={handleSend}
                  disabled={!newMessage.trim()}
                >
                  <View style={[
                    styles.sendButtonGradient,
                    newMessage.trim() && styles.sendButtonGradientActive
                  ]}>
                    <Icon 
                      name={newMessage.trim() ? "send" : "send-outline"} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  container: { 
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatarGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 3,
    borderColor: colors.card,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.subText,
    fontWeight: '500',
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  chatContainer: { 
    flex: 1,
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.subText,
    fontSize: 16,
  },
  messageList: { 
    padding: 20, 
    flexGrow: 1,
    paddingBottom: 10,
  },
  messageRow: { 
    flexDirection: 'row', 
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  lastMessage: {
    marginBottom: 10,
  },
  avatarContainer: {
    marginRight: 10,
    marginBottom: 5,
  },
  userAvatarContainer: {
    marginLeft: 10,
    marginBottom: 5,
  },
  avatarGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  userAvatarGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.secondary,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: width * 0.7,
  },
  userBubble: { 
    backgroundColor: colors.userBubble,
    borderBottomRightRadius: 6,
  },
  adminBubble: { 
    backgroundColor: colors.adminBubble,
    borderBottomLeftRadius: 6,
  },
  userBubbleText: { 
    color: colors.userBubbleText, 
    fontSize: 16,
    lineHeight: 22,
  },
  adminBubbleText: { 
    color: colors.adminBubbleText, 
    fontSize: 16,
    lineHeight: 22,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  userTimestampContainer: {
    // No specific styles needed, just aligns items for user
  },
  timestamp: { 
    fontSize: 11, 
    color: colors.subText,
    opacity: 0.7,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.8)',
  },
  checkIcon: {
    marginLeft: 5,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  typingBubble: {
    backgroundColor: colors.adminBubble,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    padding: 16,
    marginLeft: 10,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.subText,
    marginHorizontal: 2,
  },
  dot1: {},
  dot2: {},
  dot3: {},
  inputOuterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.card,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  inputOuterContainerKeyboard: {
    paddingBottom: Platform.OS === 'ios' ? 15 : 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.inputBackground,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 15,
    paddingVertical: 8,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    maxHeight: 100,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
  },
  attachButton: {
    padding: 8,
    marginRight: 5,
  },
  sendButton: {
    padding: 2,
  },
  sendButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.subText,
  },
  sendButtonGradientActive: {
    backgroundColor: colors.primary,
  },
  sendButtonActive: {},
});

export default ChatScreen;