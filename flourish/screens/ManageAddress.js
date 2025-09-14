import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import ThemeContext from '../context/ThemeContext';

// CORRECT IMPORT: Import core Firebase Auth functions directly from the Firebase SDK
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

// CORRECT IMPORT: Import your custom Firebase configuration variables from your local file
import { auth, db, appId } from '../Backend/firebaseConfig';

const ManageAddress = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [addresses, setAddresses] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

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
    addAddressContainer: {
      borderColor: isDarkMode ? '#D81B60' : '#D81B60',
    },
    addAddressText: {
      color: isDarkMode ? '#D81B60' : '#D81B60',
    },
    addressCard: {
      backgroundColor: isDarkMode ? '#2c2c44' : '#fff',
      shadowColor: isDarkMode ? '#fff' : '#000',
    },
    selectedAddressCard: {
      borderColor: '#D81B60',
    },
    addressLabelText: {
      color: isDarkMode ? '#fff' : '#333',
    },
    addressText: {
      color: isDarkMode ? '#ccc' : '#666',
    },
    addressDetailsText: {
      color: isDarkMode ? '#888' : '#999',
    },
    labelIcon: {
      color: isDarkMode ? '#fff' : '#333',
    },
    deleteIcon: {
      color: isDarkMode ? '#D81B60' : '#D81B60',
    },
    noAddressText: {
      color: isDarkMode ? '#888' : '#999',
    },
    applyButton: {
      backgroundColor: '#D81B60',
    },
    applyButtonDisabled: {
      backgroundColor: '#999',
    },
    applyButtonText: {
      color: '#fff',
    },
  };

  // Effect to handle Firebase authentication and get the user ID
  useEffect(() => {
    // This listener must use the `onAuthStateChanged` function imported from `firebase/auth`.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          // Sign in anonymously if no user is found
          const anonUserCredential = await signInAnonymously(auth);
          setUserId(anonUserCredential.user.uid);
        } catch (error) {
          console.error("Failed to sign in anonymously:", error);
          setLoading(false);
          Alert.alert("Authentication Error", "Could not sign in. Please check your connection.");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Effect to fetch addresses from Firestore once the user ID is available
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // The collection path must match the one used in DeliveryAddress.js
    const addressesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/addresses`);

    // Use onSnapshot to listen for real-time updates to the addresses
    const unsubscribeSnapshot = onSnapshot(addressesCollectionRef, (snapshot) => {
      const addressesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAddresses(addressesList);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch addresses:", error);
      Alert.alert("Error", "Failed to load addresses. Please try again.");
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [userId]); // Depend on userId to re-run when the auth state changes

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleAddDeliveryAddress = () => {
    navigation.navigate('DeliveryAddress');
  };

  const handleApply = () => {
    if (selectedAddressId) {
      const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
      Alert.alert('Address Applied', `The address "${selectedAddress.label}" has been applied.`);
      // You would typically pass this selected address back to the previous screen here.
    } else {
      Alert.alert('No Address Selected', 'Please select an address to apply.');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this address?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              if (!userId) {
                Alert.alert("Error", "User not authenticated.");
                return;
              }
              const addressDocRef = doc(db, `artifacts/${appId}/users/${userId}/addresses`, addressId);
              await deleteDoc(addressDocRef);
              Alert.alert("Success", "Address deleted successfully.");
            } catch (error) {
              console.error("Failed to delete address:", error);
              Alert.alert("Error", "Failed to delete address. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.page, dynamicStyles.page]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Icon name="arrow-left" size={28} color={dynamicStyles.backIcon.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Manage Address</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#D81B60" style={styles.loadingIndicator} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Add a new address button */}
          <TouchableOpacity
            style={[styles.addAddressContainer, dynamicStyles.addAddressContainer]}
            onPress={handleAddDeliveryAddress}
          >
            <Text style={[styles.addAddressText, dynamicStyles.addAddressText]}>+ Add Delivery Address</Text>
          </TouchableOpacity>

          {/* List of addresses */}
          {addresses.length > 0 ? (
            addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.addressCard,
                  dynamicStyles.addressCard,
                  selectedAddressId === address.id && dynamicStyles.selectedAddressCard,
                ]}
                onPress={() => setSelectedAddressId(address.id)}
              >
                <View style={styles.addressInfo}>
                  <View style={styles.addressLabelContainer}>
                    <Icon
                      name={address.label.toLowerCase() === 'home' ? 'home' : 'map-marker'}
                      size={20}
                      color={dynamicStyles.labelIcon.color}
                      style={styles.labelIcon}
                    />
                    <Text style={[styles.addressLabelText, dynamicStyles.addressLabelText]}>{address.label}</Text>
                  </View>
                  <Text style={[styles.addressText, dynamicStyles.addressText]}>{address.address}</Text>
                  {address.floor && <Text style={[styles.addressDetailsText, dynamicStyles.addressDetailsText]}>Floor: {address.floor}</Text>}
                  <Text style={[styles.addressDetailsText, dynamicStyles.addressDetailsText]}>Landmark: {address.landmark}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteAddress(address.id)}
                  style={styles.deleteButton}
                >
                  <Icon name="trash-can-outline" size={24} color={dynamicStyles.deleteIcon.color} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.noAddressText, dynamicStyles.noAddressText]}>No addresses found. Add a new one!</Text>
          )}
        </ScrollView>
      )}

      {/* "Apply" button at the bottom */}
      <TouchableOpacity
        style={[styles.applyButton, !selectedAddressId && dynamicStyles.applyButtonDisabled]}
        onPress={handleApply}
        disabled={!selectedAddressId}
      >
        <Text style={[styles.applyButtonText, dynamicStyles.applyButtonText]}>Apply</Text>
      </TouchableOpacity>
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  addAddressContainer: {
    width: '100%',
    padding: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  addAddressText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  selectedAddressCard: {
    borderWidth: 2,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  labelIcon: {
    marginRight: 5,
  },
  addressLabelText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addressText: {
    fontSize: 16,
  },
  addressDetailsText: {
    fontSize: 14,
    marginTop: 2,
  },
  deleteButton: {
    marginLeft: 10,
    padding: 5,
  },
  noAddressText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 50,
  },
  applyButton: {
    paddingVertical: 15,
    borderRadius: 25,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonDisabled: {
  },
  applyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ManageAddress;