// screens/SignupScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Animated,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import signupBg from '../assets/flowers3.png';

import { auth, db } from '../Backend/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// A reusable component for the floating label input effect
const FloatingLabelInput = ({ label, value, icon, rightIcon, onFocus, onBlur, hasError, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = useRef(new Animated.Value(value === '' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: isFocused || value !== '' ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) onBlur();
  };

  const labelStyle = {
    position: 'absolute',
    left: 42,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, -10],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 12],
    }),
    color: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: ['#888', '#000'],
    }),
    backgroundColor: '#FFF6EF',
    paddingHorizontal: 4,
    zIndex: 1,
  };

  const containerStyle = [
    styles.floatingInputContainer,
    { borderColor: hasError ? '#D32F2F' : isFocused ? '#E6005C' : '#EFEFEF' },
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.icon}>{icon}</View>
      <Animated.Text style={labelStyle}>{label}</Animated.Text>
      <TextInput
        {...props}
        value={value}
        style={styles.floatingInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {rightIcon && <View style={styles.eyeIcon}>{rightIcon}</View>}
    </View>
  );
};

const ValidationItem = ({ isValid, text }) => (
    <View style={styles.validationItem}>
        <Ionicons
            name={isValid ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={isValid ? '#2ECC71' : '#888'}
        />
        <Text style={[styles.validationText, { color: isValid ? '#2ECC71' : '#888' }]}>
            {text}
        </Text>
    </View>
);

const TermsAndAgreementModal = ({ visible, onClose, onAgree }) => {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isCloseToEnd) {
      setScrolledToEnd(true);
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
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Terms & Agreements</Text>
          <ScrollView
            style={styles.termsScrollView}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <Text style={styles.termsModalText}>
              Please read these terms and conditions carefully before using Our Service.
              {'\n\n'}
              1. Introduction
              {'\n'}
              Welcome to our application. By creating an account, you agree to be bound by these Terms and Conditions.
              {'\n\n'}
              2. User Accounts
              {'\n'}
              When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
              {'\n\n'}
              3. Privacy Policy
              {'\n'}
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and share your personal information. By using our Service, you agree to the collection and use of information in accordance with our Privacy Policy.
              {'\n\n'}
              4. Termination
              {'\n'}
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              {'\n\n'}
              5. Governing Law
              {'\n'}
              These Terms shall be governed and construed in accordance with the laws of our Country, without regard to its conflict of law provisions.
              {'\n\n'}
              By continuing, you acknowledge that you have read, understood, and agree to these terms.
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={[styles.modalButton, !scrolledToEnd && styles.modalButtonDisabled]}
            onPress={onAgree}
            disabled={!scrolledToEnd}
          >
            <Text style={styles.modalButtonText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};


export default function SignupScreen() {
  const navigation = useNavigation();
  
  const [step, setStep] = useState(1);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);


  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordValidations, setPasswordValidations] = useState({
    length: false,
    letter: false,
    number: false,
    special: false,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = (text) => {
    setPassword(text);
    setPasswordValidations({
      length: text.length >= 12,
      letter: /[a-zA-Z]/.test(text),
      number: /\d/.test(text),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(text),
    });
  };

  const handleBirthDateChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formattedDate = '';

    if (cleaned.length > 0) {
      formattedDate = cleaned.substring(0, 2);
    }
    if (cleaned.length >= 3) {
      formattedDate = `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    if (cleaned.length >= 5) {
      formattedDate = `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}/${cleaned.substring(4, 8)}`;
    }

    setBirthDate(formattedDate);
    if (errors.birthDate) {
        const newErrors = { ...errors };
        delete newErrors.birthDate;
        setErrors(newErrors);
    }
  };

  const handlePhoneNumberChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const limited = cleaned.substring(0, 11);
    setPhoneNumber(limited);

    if (errors.phoneNumber) {
        const newErrors = { ...errors };
        delete newErrors.phoneNumber;
        setErrors(newErrors);
    }
  };

  const handleNextStep = () => {
    const newErrors = {};

    if (step === 1) {
        if (!firstName) newErrors.firstName = true;
        if (!lastName) newErrors.lastName = true;
        if (!gender) newErrors.gender = true;
        if (!birthDate) newErrors.birthDate = true;
    } else if (step === 2) {
        if (!email) newErrors.email = true;
        if (!phoneNumber) newErrors.phoneNumber = true;
        if (!address) newErrors.address = true;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            newErrors.email = true;
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            setErrors(newErrors);
            return;
        }
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    setErrors({});
    if (step === 1) {
        setStep(2);
    } else if (step === 2) {
        setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
        setStep(step - 1);
    }
  };

  const handleHeaderBackPress = () => {
      if (step > 1) {
          handlePrevStep();
      } else {
          navigation.goBack();
      }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 12 characters long and include a letter, number, and special character.'
      );
      return;
    }
    
    if (!agreedToTerms) {
        Alert.alert('Agreement Required', 'Please agree to the Terms and Conditions to continue.');
        return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;
      
      await sendEmailVerification(user);
      
      const fullName = `${firstName} ${middleInitial} ${lastName}`.replace(/\s+/g, ' ').trim();

      await setDoc(doc(db, 'signup_users', user.uid), {
        firstName: firstName,
        lastName: lastName,
        middleInitial: middleInitial,
        fullName: fullName,
        gender: gender,
        birthDate: birthDate,
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber,
        address: address,
        createdAt: new Date(),
      });

      console.log('User account created, verification email sent!');

      Alert.alert(
        'Registration Successful',
        'A verification link has been sent to your email address. Please check your inbox.',
        // --- MODIFICATION START ---
        // Navigate to Login screen with credentials
        [{ text: 'OK', onPress: () => navigation.navigate('Login', { email: email.trim().toLowerCase(), password: password }) }]
        // --- MODIFICATION END ---
      );

    } catch (error) {
      console.error("SIGN UP ERROR:", error); 
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email address already exists.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid. Please enter a correct email.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak. Please choose a stronger one.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          errorMessage = `An error occurred: ${error.message}`;
          break;
      }
      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const onAgreeToTerms = () => {
    setAgreedToTerms(true);
    setIsTermsModalVisible(false);
    handleSignUp();
  };

  const renderStepContent = () => {
    const onInputChange = (setter, fieldName) => (value) => {
        setter(value);
        if (errors[fieldName]) {
            const newErrors = { ...errors };
            delete newErrors[fieldName];
            setErrors(newErrors);
        }
    };

    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.subtitle}>Basic Information</Text>
            <FloatingLabelInput label="First Name *" value={firstName} onChangeText={onInputChange(setFirstName, 'firstName')} icon={<Ionicons name="person-outline" size={20} color="#333" />} hasError={!!errors.firstName}/>
            <FloatingLabelInput label="Last Name *" value={lastName} onChangeText={onInputChange(setLastName, 'lastName')} icon={<Ionicons name="person-outline" size={20} color="#333" />} hasError={!!errors.lastName}/>
            <FloatingLabelInput label="M.I. (Optional)" value={middleInitial} onChangeText={setMiddleInitial} icon={<Ionicons name="person-outline" size={20} color="#333" />} />
            
            <View style={styles.genderSelectorContainer}>
              <Text style={styles.genderLabel}>Gender *</Text>
              <View style={[styles.genderOptionsContainer, errors.gender && styles.errorBorder]}>
                <TouchableOpacity
                  style={[styles.genderOptionButton, styles.genderOptionLeft, gender === 'Male' && styles.genderOptionButtonActive]}
                  onPress={() => onInputChange(setGender, 'gender')('Male')}
                >
                  <Ionicons name="male" size={20} color={gender === 'Male' ? '#fff' : '#888'} style={styles.genderIcon} />
                  <Text style={[styles.genderOptionText, gender === 'Male' && styles.genderOptionTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderOptionButton, styles.genderOptionRight, gender === 'Female' && styles.genderOptionButtonActive]}
                  onPress={() => onInputChange(setGender, 'gender')('Female')}
                >
                  <Ionicons name="female" size={20} color={gender === 'Female' ? '#fff' : '#888'} style={styles.genderIcon} />
                  <Text style={[styles.genderOptionText, gender === 'Female' && styles.genderOptionTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            <FloatingLabelInput label="Birth Date (DD/MM/YYYY) *" value={birthDate} onChangeText={handleBirthDateChange} icon={<Ionicons name="calendar-outline" size={20} color="#333" />} keyboardType="numeric" maxLength={10} hasError={!!errors.birthDate}/>
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.subtitle}>Contact & Address</Text>
            <FloatingLabelInput label="Email Address *" value={email} onChangeText={onInputChange(setEmail, 'email')} keyboardType="email-address" autoCapitalize="none" icon={<MaterialCommunityIcons name="email-outline" size={20} color="#333" />} hasError={!!errors.email} />
            <FloatingLabelInput label="Phone Number *" value={phoneNumber} onChangeText={handlePhoneNumberChange} keyboardType="phone-pad" icon={<Ionicons name="call-outline" size={20} color="#333" />} hasError={!!errors.phoneNumber} maxLength={11}/>
            <FloatingLabelInput label="Address *" value={address} onChangeText={onInputChange(setAddress, 'address')} icon={<Ionicons name="location-outline" size={20} color="#333" />} hasError={!!errors.address}/>
          </>
        );
      case 3:
          return (
            <>
              <Text style={styles.subtitle}>Password</Text>
              <FloatingLabelInput label="Create Password *" value={password} onChangeText={handlePasswordChange} secureTextEntry={!isPasswordVisible} onFocus={() => setIsPasswordFocused(true)} icon={<MaterialCommunityIcons name="lock-outline" size={20} color="#333" />} rightIcon={<TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}><Ionicons name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="#333" /></TouchableOpacity>} />
              {isPasswordFocused && (
                <View style={styles.validationContainer}>
                  <ValidationItem isValid={passwordValidations.length} text="At least 12 characters" />
                  <ValidationItem isValid={passwordValidations.letter} text="Contains a letter (a-z, A-Z)" />
                  <ValidationItem isValid={passwordValidations.number} text="Contains a number (0-9)" />
                  <ValidationItem isValid={passwordValidations.special} text="Contains a special character (!@#...)" />
                </View>
              )}
              <FloatingLabelInput label="Confirm Password *" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!isConfirmPasswordVisible} icon={<MaterialCommunityIcons name="lock-check-outline" size={20} color="#333" />} rightIcon={<TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}><Ionicons name={isConfirmPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="#333" /></TouchableOpacity>} />
              <View style={styles.termsContainer}>
                <TouchableOpacity style={styles.checkbox} onPress={() => setAgreedToTerms(!agreedToTerms)}>
                  <MaterialCommunityIcons name={agreedToTerms ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={agreedToTerms ? '#E6005C' : '#888'} />
                </TouchableOpacity>
                <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink} onPress={() => setIsTermsModalVisible(true)}>Terms and Conditions *</Text></Text>
              </View>
            </>
          );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.imageContainer}>
            <Image source={signupBg} style={styles.topImage} resizeMode="cover" />
            <TouchableOpacity style={styles.backButton} onPress={handleHeaderBackPress}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <View style={styles.card}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Register</Text>
                
                {renderStepContent()}
                
                <View style={styles.paginationContainer}>
                    <View style={[styles.paginationDot, step === 1 && styles.paginationDotActive]} />
                    <View style={[styles.paginationDot, step === 2 && styles.paginationDotActive]} />
                    <View style={[styles.paginationDot, step === 3 && styles.paginationDotActive]} />
                </View>

                <View style={styles.buttonContainer}>
                    {step < 3 ? (
                        <TouchableOpacity style={styles.button} onPress={handleNextStep}>
                            <Text style={styles.buttonText}>Next</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.button, isLoading && styles.buttonDisabled]} 
                            onPress={() => setIsTermsModalVisible(true)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
            </View>
        </KeyboardAvoidingView>

        <TermsAndAgreementModal
          visible={isTermsModalVisible}
          onClose={() => setIsTermsModalVisible(false)}
          onAgree={onAgreeToTerms}
        />

        <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF6EF',
  },
  imageContainer: {
    height: 180,
    overflow: 'hidden',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  topImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 25,
    padding: 8,
  },
  card: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  floatingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF6EF',
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 55,
  },
  icon: {
    marginRight: 10,
  },
  floatingInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    height: '100%',
  },
  eyeIcon: {
    padding: 5,
  },
  validationContainer: {
    marginTop: -10,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  validationText: {
    marginLeft: 8,
    fontSize: 12,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 15,
    alignSelf: 'center',
  },
  checkbox: {
    marginRight: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#555',
  },
  termsLink: {
    color: '#E6005C',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#E6005C',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFF6EF',
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  loginText: {
    fontSize: 14,
    color: '#555',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E6005C',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D3D3D3',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#E6005C',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
    paddingBottom: 20,
  },
  errorBorder: {
    borderColor: '#D32F2F',
  },
  genderSelectorContainer: {
    marginBottom: 20,
    marginTop: 5,
  },
  genderLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
    paddingLeft: 16,
  },
  genderOptionsContainer: {
    flexDirection: 'row',
    height: 55,
    borderWidth: 2,
    borderColor: '#EFEFEF',
    borderRadius: 10,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  genderOptionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderOptionLeft: {
    borderRightWidth: 1,
    borderColor: '#EFEFEF',
  },
  genderOptionRight: {
    borderLeftWidth: 1,
    borderColor: '#EFEFEF',
  },
  genderOptionButtonActive: {
    backgroundColor: '#E6005C',
  },
  genderIcon: {
    marginRight: 8,
  },
  genderOptionText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  genderOptionTextActive: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFF6EF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  termsScrollView: {
    width: '100%',
    marginBottom: 16,
  },
  termsModalText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#E6005C',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
  },
  modalButtonDisabled: {
    backgroundColor: '#E6005C',
    opacity: 0.5,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});