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
  Image, // Import Image
  Modal, // Import Modal for menu and fullscreen view
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ThemeContext from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// To enable image picking, you need to install expo-image-picker
// Run: npx expo install expo-image-picker
import * as ImagePicker from 'expo-image-picker';


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
  writeBatch,
  updateDoc // Import updateDoc
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

  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false); 
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  // --- START: New state for Header Menu ---
  const [menuVisible, setMenuVisible] = useState(false);
  const [chatThread, setChatThread] = useState(null); // To hold thread data like isMuted
  // --- END: New state for Header Menu ---

  const colors = {
    background: isDarkMode ? '#0F0F23' : '#F8FAFC',
    card: isDarkMode ? '#1E1E3F' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#1E293B',
    subText: isDarkMode ? '#94A3B8' : '#64748B',
    primary: '#EC4899',
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
    menuBackground: isDarkMode ? '#2d3748' : '#ffffff',
  };

  const styles = getStyles(colors);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
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
        setUserName(userDoc.exists() ? userDoc.data().fullName || 'User' : 'User');
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);
  
  // --- START: New useEffect to listen to chat thread data (for mute status) ---
  useEffect(() => {
    if (user) {
        const appId = 'flourish-flowers-app';
        const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${user.uid}`);
        const unsubscribe = onSnapshot(chatThreadRef, (doc) => {
            if (doc.exists()) {
                setChatThread(doc.data());
            }
        });
        return () => unsubscribe();
    }
  }, [user]);
  // --- END: New useEffect to listen to chat thread data ---

  useFocusEffect(
    useCallback(() => {
      if (user) {
        const appId = 'flourish-flowers-app';
        const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${user.uid}`);
        setDoc(chatThreadRef, { isOnline: true, isSeenByUser: true }, { merge: true });

        const markAdminMessagesAsSeen = async () => {
          const messagesRef = collection(db, `artifacts/${appId}/public/data/chats/${user.uid}/messages`);
          const q = query(messagesRef, where("senderId", "==", "flourish-admin"), where("isSeen", "==", false));
          const querySnapshot = await getDocs(q);
          const batch = writeBatch(db);
          querySnapshot.forEach(document => batch.update(document.ref, { isSeen: true }));
          await batch.commit();
        };

        markAdminMessagesAsSeen().catch(error => console.error("Error marking messages as seen: ", error));

        return () => {
          setDoc(chatThreadRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
        };
      }
    }, [user])
  );
  
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
          isSeen: false,
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
        const fetchedMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
        setMessages(fetchedMessages);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const uploadImageToCloudinary = async (uri) => {
    const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/djhtu0rzz/image/upload';
    const UPLOAD_PRESET = 'my_app_preset';
    const formData = new FormData();
    let fileType = uri.substring(uri.lastIndexOf(".") + 1);
    
    formData.append('file', { uri, name: `photo.${fileType}`, type: `image/${fileType}` });
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' } });
        const data = await response.json();
        return data.secure_url || null;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        return null;
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || !user) return;

    setUploading(true);
    const messageText = newMessage.trim();
    let imageUrl = null;

    if (selectedImage) {
        imageUrl = await uploadImageToCloudinary(selectedImage);
        if (!imageUrl) {
            Alert.alert("Upload Failed", "Could not upload image. Please try again.");
            setUploading(false);
            return;
        }
    }
    
    setNewMessage('');
    setSelectedImage(null);

    const appId = 'flourish-flowers-app';
    const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${user.uid}`);
    const messagesRef = collection(chatThreadRef, 'messages');
    
    try {
      const messageData = { timestamp: serverTimestamp(), senderId: user.uid, senderName: userName, isSeen: false };
      if (messageText) messageData.text = messageText;
      if (imageUrl) messageData.imageUrl = imageUrl;
      await addDoc(messagesRef, messageData);
      
      let lastMessage = imageUrl ? (messageText ? `📷 ${messageText}` : '📷 Photo') : messageText;
      
      await setDoc(chatThreadRef, { lastMessage, timestamp: serverTimestamp(), userName, isRead: false, isSeenByUser: true, lastMessageSenderId: user.uid }, { merge: true });
    } catch (error) {
      console.error("Error sending message: ", error);
    } finally {
      setUploading(false);
    }
  };
  
  const handleImageUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 4], quality: 0.8 });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };
  
  // --- START: New Menu Action Handlers ---
  const handleMuteToggle = async () => {
    if (!user || !chatThread) return;
    setMenuVisible(false);
    const appId = 'flourish-flowers-app';
    const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${user.uid}`);
    try {
      await updateDoc(chatThreadRef, { isMuted: !chatThread.isMuted });
    } catch (error) {
      console.error("Error toggling mute: ", error);
      Alert.alert("Error", "Could not update mute status.");
    }
  };

  const handleDeleteConversation = () => {
    setMenuVisible(false);
    Alert.alert(
      "Delete Conversation", "Are you sure you want to permanently delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: 'destructive', onPress: async () => {
            if (!user) return;
            const appId = 'flourish-flowers-app';
            const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${user.uid}`);
            const messagesRef = collection(chatThreadRef, 'messages');

            try {
              const messagesSnapshot = await getDocs(messagesRef);
              const batch = writeBatch(db);
              messagesSnapshot.forEach(doc => batch.delete(doc.ref));
              await batch.commit();
              await deleteDoc(chatThreadRef);
              navigation.goBack();
            } catch (error) {
              console.error("Error deleting conversation: ", error);
              Alert.alert("Error", "Could not delete conversation.");
            }
          }
        }
      ]
    );
  };
  // --- END: New Menu Action Handlers ---

  const openImageModal = (imageUrl) => {
    setViewingImage(imageUrl);
    setImageModalVisible(true);
  };

  const renderMessage = ({ item }) => {
    const isUserMessage = item.senderId === user?.uid;
    return (
      <View style={[ styles.messageRow, { justifyContent: isUserMessage ? 'flex-end' : 'flex-start' }]}>
        {!isUserMessage && <View style={styles.avatarContainer}><View style={styles.avatarGradient}><Text style={styles.avatarText}>{item.senderAvatar || 'F'}</Text></View></View>}
        <View style={[ styles.messageBubble, isUserMessage ? styles.userBubble : styles.adminBubble ]}>
          {item.imageUrl && <TouchableOpacity onPress={() => openImageModal(item.imageUrl)}><Image source={{ uri: item.imageUrl }} style={styles.chatImage} resizeMode="cover" /></TouchableOpacity>}
          {item.text && <Text style={isUserMessage ? styles.userBubbleText : styles.adminBubbleText}>{item.text}</Text>}
          <View style={styles.timestampContainer}>
            <Text style={[styles.timestamp, isUserMessage && styles.userTimestamp]}>{item.timestamp ? item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}</Text>
            {isUserMessage && <Icon name={item.isSeen ? 'check-all' : 'check'} size={15} color={isDarkMode ? 'rgba(255,255,255,0.8)' : '#FFFFFF'} style={styles.checkIcon} />}
          </View>
        </View>
        {isUserMessage && <View style={styles.userAvatarContainer}><View style={styles.userAvatarGradient}><Text style={styles.avatarText}>{userName.substring(0, 1).toUpperCase()}</Text></View></View>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal visible={imageModalVisible} transparent={true} onRequestClose={() => setImageModalVisible(false)} animationType="fade">
        <View style={styles.modalContainer}><TouchableOpacity style={styles.closeButton} onPress={() => setImageModalVisible(false)}><Icon name="close" size={30} color="#fff" /></TouchableOpacity><Image source={{ uri: viewingImage }} style={styles.fullscreenImage} resizeMode="contain" /></View>
      </Modal>
      
      {/* --- START: Menu Modal --- */}
      <Modal visible={menuVisible} transparent={true} onRequestClose={() => setMenuVisible(false)} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setMenuVisible(false)}>
            <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={handleMuteToggle}>
                    <Icon name={chatThread?.isMuted ? "bell" : "bell-off"} size={20} color={colors.text} style={styles.menuIcon}/>
                    <Text style={styles.menuText}>{chatThread?.isMuted ? "Unmute" : "Mute"} Conversation</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleDeleteConversation}>
                    <Icon name="trash-can-outline" size={20} color={colors.primary} style={styles.menuIcon}/>
                    <Text style={[styles.menuText, { color: colors.primary }]}>Delete Conversation</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>
      {/* --- END: Menu Modal --- */}

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Icon name="arrow-left" size={24} color={colors.text} /></TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatarContainer}><View style={styles.headerAvatarGradient}><Icon name="flower" size={20} color="#FFFFFF" /></View><View style={styles.onlineIndicator} /></View>
            <View style={styles.headerTextContainer}><Text style={styles.headerTitle}>Flourish Flowers</Text><Text style={styles.headerSubtitle}>{isTyping ? 'typing...' : 'Online'}</Text></View>
          </View>
          <TouchableOpacity style={styles.moreButton} onPress={() => setMenuVisible(true)}><Icon name="dots-vertical" size={24} color={colors.text} /></TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.chatContainer} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
          {loading ? <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View> : <FlatList ref={flatListRef} data={messages} renderItem={renderMessage} keyExtractor={(item) => item.id} contentContainerStyle={styles.messageList} onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })} onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })} />}
          <View style={[ styles.inputOuterContainer, keyboardVisible && styles.inputOuterContainerKeyboard ]}>
            {selectedImage && <View style={styles.previewContainer}><Image source={{ uri: selectedImage }} style={styles.previewImage} /><TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}><Icon name="close-circle" size={24} color="#000" /></TouchableOpacity></View>}
            <View style={styles.inputContainer}>
              <TextInput style={styles.input} value={newMessage} onChangeText={setNewMessage} placeholder="Type a message..." placeholderTextColor={colors.subText} multiline />
              <View style={styles.inputActions}>
                <TouchableOpacity style={styles.attachButton} onPress={handleImageUpload} disabled={uploading}><Icon name="attachment" size={22} color={colors.subText} /></TouchableOpacity>
                <TouchableOpacity style={[ styles.sendButton, (newMessage.trim() || selectedImage) && styles.sendButtonActive ]} onPress={handleSend} disabled={(!newMessage.trim() && !selectedImage) || uploading}>
                  <View style={[ styles.sendButtonGradient, (newMessage.trim() || selectedImage) && styles.sendButtonGradientActive ]}>{uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name={(newMessage.trim() || selectedImage) ? "send" : "send-outline"} size={20} color="#FFFFFF" />}</View>
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
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: colors.background },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
  headerAvatarContainer: { position: 'relative', marginRight: 12 },
  headerAvatarGradient: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.online, borderWidth: 3, borderColor: colors.card },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 2 },
  headerSubtitle: { fontSize: 13, color: colors.subText, fontWeight: '500' },
  moreButton: { padding: 8, borderRadius: 20, backgroundColor: colors.background },
  chatContainer: { flex: 1, marginTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: 20, flexGrow: 1, paddingBottom: 10 },
  messageRow: { flexDirection: 'row', marginVertical: 4, alignItems: 'flex-end' },
  avatarContainer: { marginRight: 10, marginBottom: 5 },
  userAvatarContainer: { marginLeft: 10, marginBottom: 5 },
  avatarGradient: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  userAvatarGradient: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.secondary },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  messageBubble: { padding: 8, borderRadius: 20, maxWidth: width * 0.7 },
  userBubble: { backgroundColor: colors.userBubble, borderBottomRightRadius: 6 },
  adminBubble: { backgroundColor: colors.adminBubble, borderBottomLeftRadius: 6 },
  userBubbleText: { color: colors.userBubbleText, fontSize: 16, lineHeight: 22, paddingHorizontal: 8, paddingVertical: 4 },
  adminBubbleText: { color: colors.adminBubbleText, fontSize: 16, lineHeight: 22, paddingHorizontal: 8, paddingVertical: 4 },
  timestampContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4, paddingHorizontal: 8 },
  timestamp: { fontSize: 11, color: colors.subText, opacity: 0.7 },
  userTimestamp: { color: 'rgba(255,255,255,0.8)' },
  checkIcon: { marginLeft: 5 },
  inputOuterContainer: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: colors.card, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  inputOuterContainerKeyboard: { paddingBottom: Platform.OS === 'ios' ? 15 : 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.inputBackground, borderRadius: 25, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 15, paddingVertical: 8, minHeight: 50 },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingTop: Platform.OS === 'ios' ? 8 : 0, paddingBottom: Platform.OS === 'ios' ? 8 : 0, maxHeight: 100 },
  inputActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 5 },
  attachButton: { padding: 8, marginRight: 5 },
  sendButton: { padding: 2 },
  sendButtonGradient: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.subText },
  sendButtonGradientActive: { backgroundColor: colors.primary },
  chatImage: { width: width * 0.6, height: width * 0.6, borderRadius: 15, margin: 2 },
  previewContainer: { position: 'relative', marginBottom: 10, alignSelf: 'flex-start' },
  previewImage: { width: 80, height: 80, borderRadius: 10 },
  removeImageButton: { position: 'absolute', top: -10, right: -10, backgroundColor: 'white', borderRadius: 12 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: width, height: height * 0.8 },
  closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 1 },
  // --- START: New Menu Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 60 : 100,
    right: 20,
    backgroundColor: colors.menuBackground,
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 220,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  menuText: {
    color: colors.text,
    fontSize: 16,
    marginLeft: 15,
  },
  menuIcon: {
    width: 24,
  }
  // --- END: New Menu Styles ---
});

export default ChatScreen;

