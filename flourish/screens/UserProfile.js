// screens/UserProfile.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomNav from '../components/BottomNav';
import defaultProfilePic from '../assets/pic.png';
import ThemeContext from '../context/ThemeContext';

import { auth, db } from '../Backend/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const UserProfile = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [userName, setUserName] = useState('Loading...');
  const [userEmail, setUserEmail] = useState('Loading...');
  const [profilePicUri, setProfilePicUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const dynamicStyles = {
    page: {
      backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
    },
    headerTitle: {
      color: isDarkMode ? '#fff' : '#333',
    },
    profileName: {
      color: isDarkMode ? '#fff' : '#333',
    },
    profileUsername: {
      color: isDarkMode ? '#ccc' : '#666',
    },
    menuContainer: {
      backgroundColor: isDarkMode ? '#2c2c44' : '#fff',
      shadowColor: isDarkMode ? '#fff' : '#000',
    },
    menuItemText: {
      color: isDarkMode ? '#fff' : '#333',
    },
    divider: {
      borderBottomColor: isDarkMode ? '#3d3d5f' : '#F0F0F0',
    },
    modalContent: {
      backgroundColor: isDarkMode ? '#2c2c44' : '#fff',
    },
    modalTitle: {
      color: isDarkMode ? '#fff' : '#333',
    },
    modalMessage: {
      color: isDarkMode ? '#ccc' : '#666',
    },
    cancelButton: {
      backgroundColor: isDarkMode ? '#3d3d5f' : '#E0E0E0',
    },
    cancelButtonText: {
      color: isDarkMode ? '#D81B60' : '#D81B60',
    },
  };

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        setLoading(true);
        const userDocRef = doc(db, 'signup_users', user.uid);

        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUserName(userData.fullName || 'User');
            setUserEmail(user.email || 'No email');
            setProfilePicUri(userData.profilePicUrl || null);
          } else {
            setUserName('User');
            setUserEmail(user.email || 'No email');
            setProfilePicUri(null);
            console.log("No such user document in Firestore!");
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
          setUserName('User');
          setUserEmail(user.email || 'No email');
          setProfilePicUri(null);
          setLoading(false);
        });
      } else {
        setUserName('Guest');
        setUserEmail('Not logged in');
        setProfilePicUri(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const handleMenuItemPress = (item) => {
    if (item === 'Edit Profile') {
      navigation.navigate('EditProfile');
    } else if (item === 'Manage Address') {
      navigation.navigate('ManageAddress');
    } else if (item === 'My Order') {
      navigation.navigate('MyOrders');
    } else if (item === 'About App') {
      navigation.navigate('AboutApp');
    } else if (item === 'Settings') {
      navigation.navigate('Settings');
    } else {
      Alert.alert('Menu Item Tapped', `You pressed "${item}"`);
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // CORRECT: Just sign out. The StackNavigator will handle the screen change.
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert('Logout Failed', 'An error occurred during logout. Please try again.');
       // Hide the modal and reset the logging out state only if an error occurs.
      setLogoutModalVisible(false);
      setIsLoggingOut(false);
    }
  };

  const menuItems = [
    { id: '1', title: 'Edit Profile', icon: 'account-edit-outline', color: '#FFD700', action: () => handleMenuItemPress('Edit Profile') },
    { id: '2', title: 'Manage Address', icon: 'map-marker-outline', color: '#6495ED', action: () => handleMenuItemPress('Manage Address') },
    { id: '3', title: 'My Order', icon: 'file-document-outline', color: '#BA55D3', action: () => handleMenuItemPress('My Order') },
    { id: '4', title: 'About App', icon: 'information-outline', color: '#FF8C00', action: () => handleMenuItemPress('About App') },
    { id: '5', title: 'Settings', icon: 'cog-outline', color: '#4CAF50', action: () => handleMenuItemPress('Settings') },
  ];

  const LogoutModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isLogoutModalVisible}
      onRequestClose={() => setLogoutModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, dynamicStyles.modalContent]}>
          <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Logout</Text>
          <Text style={[styles.modalMessage, dynamicStyles.modalMessage]}>Are you sure you want to logout?</Text>
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, dynamicStyles.cancelButton]}
              onPress={() => setLogoutModalVisible(false)}
              disabled={isLoggingOut}
            >
              <Text style={[styles.cancelButtonText, dynamicStyles.cancelButtonText]}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutModalButton}
              onPress={confirmLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.logoutModalButtonText}>LOGOUT</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.page, dynamicStyles.page]}>
      <LogoutModal />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E6005C" />
          </View>
        ) : (
          <>
            <View style={styles.profileSection}>
              <Image
                source={profilePicUri ? { uri: profilePicUri } : defaultProfilePic}
                style={styles.profileImage}
              />
              <Text style={[styles.profileName, dynamicStyles.profileName]}>{userName}</Text>
              <Text style={[styles.profileUsername, dynamicStyles.profileUsername]}>{userEmail}</Text>
            </View>

            <View style={[styles.menuContainer, dynamicStyles.menuContainer]}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index === menuItems.length - 1 && styles.lastMenuItem,
                    index < menuItems.length - 1 && dynamicStyles.divider,
                  ]}
                  onPress={item.action}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                      <Icon name={item.icon} size={24} color="#fff" />
                    </View>
                    <Text style={[styles.menuItemText, dynamicStyles.menuItemText]}>{item.title}</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={isDarkMode ? '#bbb' : "#C0C0C0"} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <BottomNav activeTab="profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 0,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#D81B60',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileUsername: {
    fontSize: 16,
  },
  menuContainer: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
  logoutButton: {
    backgroundColor: '#D81B60',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#D81B60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutModalButton: {
    backgroundColor: '#D81B60',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  logoutModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
});

export default UserProfile;

