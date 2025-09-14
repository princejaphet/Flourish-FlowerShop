// screens/Message.js - Updated version with chatbot navigation

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ThemeContext from '../context/ThemeContext';
import BottomNav from '../components/BottomNav';

// Assuming you have a seller avatar image in your assets
const sellerAvatar = require('../assets/picss.jpg'); 

const Message = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('Seller'); // Default to Seller tab
  const navigation = useNavigation();

  const colors = {
    background: isDarkMode ? '#1a1a2e' : '#FFF6F0',
    headerBg: isDarkMode ? '#1a1a2e' : '#D81B60',
    headerText: '#FFFFFF',
    card: isDarkMode ? '#2c2c44' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    subText: isDarkMode ? '#AAAAAA' : '#555555',
    activeTabText: isDarkMode ? '#FFFFFF' : '#D81B60',
    inactiveTabText: isDarkMode ? '#888' : '#A0A0A0',
    activeTabUnderline: '#D81B60',
    online: '#2ECC71',
  };
  const styles = getStyles(colors);

  const handleStartChat = () => {
    // This navigates to the separate ChatScreen
    navigation.navigate('ChatScreen');
  };

  const handleChatbotPress = () => {
    // Navigate to MessageChatbot screen
    navigation.navigate('MessageChatbot');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('Chatbot')}>
            <Text style={[styles.tabText, activeTab === 'Chatbot' && styles.activeTabText]}>Chatbot</Text>
            {activeTab === 'Chatbot' && <View style={styles.activeTabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('Seller')}>
            <Text style={[styles.tabText, activeTab === 'Seller' && styles.activeTabText]}>Seller</Text>
            {activeTab === 'Seller' && <View style={styles.activeTabUnderline} />}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {activeTab === 'Seller' && (
            <TouchableOpacity style={styles.messageCard} onPress={handleStartChat}>
              <Image source={sellerAvatar} style={styles.avatar} />
              <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                  <Text style={styles.senderName}>Christy Lou Bacus</Text>
                  <Text style={styles.timestamp}></Text>
                </View>
                <Text style={styles.messagePreview}>Chat with us about your orders or any questions!</Text>
              </View>
            </TouchableOpacity>
          )}
          {activeTab === 'Chatbot' && (
            <TouchableOpacity style={styles.messageCard} onPress={handleChatbotPress}>
              <View style={styles.chatbotAvatar}>
                <Text style={styles.chatbotAvatarText}>🌸</Text>
              </View>
              <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                  <Text style={styles.senderName}>Flourish AI</Text>
                  <View style={styles.onlineStatus}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Online</Text>
                  </View>
                </View>
                <Text style={styles.messagePreview}>Hello, How can I help?</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
      <BottomNav activeTab="chat" />
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.headerBg },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.headerBg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 10,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.inactiveTabText,
  },
  activeTabText: {
    color: colors.activeTabText,
  },
  activeTabUnderline: {
    marginTop: 8,
    height: 3,
    width: '50%',
    backgroundColor: colors.activeTabUnderline,
    borderRadius: 2,
  },
  scrollView: {
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  messageCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatbotAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  chatbotAvatarText: {
    fontSize: 24,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: colors.subText,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.online,
    marginRight: 4,
  },
  onlineText: {
    fontSize: 12,
    color: colors.online,
    fontWeight: '500',
  },
  messagePreview: {
    fontSize: 14,
    color: colors.subText,
    marginTop: 4,
  },
});

export default Message;