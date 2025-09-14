import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth, db } from '../Backend/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import ThemeContext from '../context/ThemeContext'; // Import ThemeContext

const CLOUDINARY_CLOUD_NAME = 'djhtu0rzz';
const CLOUDINARY_UPLOAD_PRESET = 'my_app_preset';

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸' },
  { code: '+44', flag: '🇬🇧' },
  { code: '+91', flag: '🇮🇳' },
  { code: '+63', flag: '🇵🇭' },
  { code: '+69', flag: '🏳️' },
];

const EditProfile = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('+69');
  const [isCountryCodePickerVisible, setIsCountryCodePickerVisible] = useState(false);
  const [selectedGender, setSelectedGender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePicUri, setProfilePicUri] = useState(null);

  // Dynamic styles based on the current theme
  const dynamicStyles = {
    page: {
      backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
    },
    headerTitle: {
      color: isDarkMode ? '#fff' : '#333',
    },
    backIcon: {
      color: isDarkMode ? '#fff' : '#000',
    },
    subHeaderText: {
      color: isDarkMode ? '#ccc' : '#666',
    },
    label: {
      color: isDarkMode ? '#fff' : '#333',
    },
    input: {
      backgroundColor: isDarkMode ? '#2c2c44' : '#fff',
      color: isDarkMode ? '#fff' : '#000',
    },
    phoneInputContainer: {
      backgroundColor: isDarkMode ? '#2c2c44' : '#fff',
    },
    countryCodeText: {
      color: isDarkMode ? '#ccc' : '#666',
      borderRightColor: isDarkMode ? '#3d3d5f' : '#F0F0F0',
    },
    phoneInput: {
      color: isDarkMode ? '#fff' : '#000',
    },
    genderOption: {
      backgroundColor: isDarkMode ? '#2c2c44' : '#fff',
      shadowColor: isDarkMode ? '#fff' : '#000',
    },
    genderText: {
      color: isDarkMode ? '#ccc' : '#666',
    },
    genderTextSelected: {
      color: '#fff',
    },
    genderIcon: {
      color: isDarkMode ? '#ccc' : '#666',
    },
    genderIconSelected: {
      color: '#fff',
    },
    modalContent: {
      backgroundColor: isDarkMode ? '#1a1a2e' : '#fff',
    },
    modalTitle: {
      color: isDarkMode ? '#fff' : '#333',
    },
    modalOption: {
      borderBottomColor: isDarkMode ? '#3d3d5f' : '#F0F0F0',
    },
    modalOptionText: {
      color: isDarkMode ? '#fff' : '#333',
    },
    modalCloseButton: {
      backgroundColor: isDarkMode ? '#2c2c44' : '#F0F0F0',
    },
    modalCloseText: {
      color: isDarkMode ? '#fff' : '#333',
    },
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, 'signup_users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.fullName || '');
            setPhoneNumber(userData.phoneNumber || '');
            setSelectedCountryCode(userData.countryCode || '+69');
            setSelectedGender(userData.gender || null);
            setProfilePicUri(userData.profilePicUrl || null);
          }
        } catch (error) {
          console.error('Error fetching profile data:', error);
        }
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePicUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri) => {
    const data = new FormData();
    data.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile_pic.jpg',
    });
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    data.append('cloud_name', CLOUDINARY_CLOUD_NAME);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: data,
        }
      );
      const cloudinaryData = await response.json();
      return cloudinaryData.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      throw new Error('Image upload failed');
    }
  };

  const handleCompleteProfile = async () => {
    const user = auth.currentUser;
    if (user) {
      setLoading(true);
      try {
        let profilePicUrl = profilePicUri;

        if (profilePicUri && !profilePicUri.startsWith('http')) {
          profilePicUrl = await uploadImage(profilePicUri);
        }

        const userDocRef = doc(db, 'signup_users', user.uid);
        await updateDoc(userDocRef, {
          fullName: username,
          phoneNumber: phoneNumber,
          countryCode: selectedCountryCode,
          gender: selectedGender,
          profilePicUrl: profilePicUrl,
        });

        Alert.alert('Profile Saved', 'Your profile has been updated!');
        navigation.goBack();
      } catch (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to save profile. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectCountryCode = (code) => {
    setSelectedCountryCode(code);
    setIsCountryCodePickerVisible(false);
  };

  const handleSelectGender = (gender) => {
    setSelectedGender(gender);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E6005C" />
      </View>
    );
  }

  const selectedFlag = COUNTRY_CODES.find((c) => c.code === selectedCountryCode)?.flag || '🏳️';

  return (
    <View style={[styles.page, dynamicStyles.page]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Icon name="arrow-left" size={28} color={dynamicStyles.backIcon.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Complete Your Profile</Text>
      </View>

      <Text style={[styles.subHeaderText, dynamicStyles.subHeaderText]}>
        Your personal information is securely stored and will only be accessed by you and the admin for processing and delivering your orders.
      </Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileImageContainer}>
          <Image
            source={profilePicUri ? { uri: profilePicUri } : require('../assets/pic.png')}
            style={styles.profileImage}
          />
          <TouchableOpacity style={styles.editIcon} onPress={handleImagePicker}>
            <Icon name="pencil" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <Text style={[styles.label, dynamicStyles.label]}>Username</Text>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter Username"
            placeholderTextColor={isDarkMode ? '#888' : '#999'}
          />

          <Text style={[styles.label, dynamicStyles.label]}>Phone Number</Text>
          <View style={[styles.phoneInputContainer, dynamicStyles.phoneInputContainer]}>
            <TouchableOpacity style={styles.countryCodeButton} onPress={() => setIsCountryCodePickerVisible(true)}>
              <Text style={styles.flagText}>{selectedFlag}</Text>
              <Icon name="chevron-down" size={20} color={isDarkMode ? '#ccc' : '#666'} style={styles.dropdownIcon} />
            </TouchableOpacity>
            <Text style={[styles.countryCodeText, dynamicStyles.countryCodeText]}>{selectedCountryCode}</Text>
            <TextInput
              style={[styles.phoneInput, dynamicStyles.phoneInput]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter Phone Number"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={[styles.label, dynamicStyles.label]}>Gender</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderOption,
                dynamicStyles.genderOption,
                selectedGender === 'Male' && styles.genderOptionSelected,
              ]}
              onPress={() => handleSelectGender('Male')}
            >
              <Icon
                name="human-male"
                size={30}
                color={selectedGender === 'Male' ? dynamicStyles.genderIconSelected.color : dynamicStyles.genderIcon.color}
              />
              <Text
                style={[
                  styles.genderText,
                  dynamicStyles.genderText,
                  selectedGender === 'Male' && dynamicStyles.genderTextSelected,
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderOption,
                dynamicStyles.genderOption,
                selectedGender === 'Female' && styles.genderOptionSelected,
              ]}
              onPress={() => handleSelectGender('Female')}
            >
              <Icon
                name="human-female"
                size={30}
                color={selectedGender === 'Female' ? dynamicStyles.genderIconSelected.color : dynamicStyles.genderIcon.color}
              />
              <Text
                style={[
                  styles.genderText,
                  dynamicStyles.genderText,
                  selectedGender === 'Female' && dynamicStyles.genderTextSelected,
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.completeButton} onPress={handleCompleteProfile}>
          <Text style={styles.completeButtonText}>Complete Profile</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Country Code Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCountryCodePickerVisible}
        onRequestClose={() => setIsCountryCodePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Country Code</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, dynamicStyles.modalOption]}
                  onPress={() => handleSelectCountryCode(item.code)}
                >
                  <Text style={styles.modalOptionFlag}>{item.flag}</Text>
                  <Text style={[styles.modalOptionText, dynamicStyles.modalOptionText]}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
              onPress={() => setIsCountryCodePickerVisible(false)}
            >
              <Text style={[styles.modalCloseText, dynamicStyles.modalCloseText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  subHeaderText: {
    paddingHorizontal: 20,
    textAlign: 'center',
    marginBottom: 30,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#D81B60',
  },
  editIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#D81B60',
    borderRadius: 15,
    padding: 6,
  },
  formContainer: {
    width: '100%',
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  completeButton: {
    backgroundColor: '#D81B60',
    paddingVertical: 15,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginHorizontal: 5,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  genderOptionSelected: {
    backgroundColor: '#D81B60',
  },
  genderText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#fff',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  flagText: {
    fontSize: 22,
    marginRight: 5,
  },
  dropdownIcon: {
    marginLeft: 5,
  },
  countryCodeText: {
    fontSize: 16,
    borderRightWidth: 1,
    paddingRight: 10,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  modalOptionFlag: {
    fontSize: 20,
    marginRight: 10,
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfile;