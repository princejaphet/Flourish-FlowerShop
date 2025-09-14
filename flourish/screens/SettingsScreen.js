// screens/SettingsScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';

// (translations object remains the same)
const translations = {
  en: {
    settingsTitle: 'Settings',
    generalSection: 'General',
    themeOption: 'Theme',
    languageOption: 'Language',
    accountSection: 'Account',
    editProfileOption: 'Edit Profile',
    changePasswordOption: 'Change Password',
    manageAddressOption: 'Manage Address',
    notificationsSection: 'Notifications',
    pushNotificationsOption: 'Push Notifications',
    helpSupportSection: 'Help & Support',
    helpCenterOption: 'Help Center',
    contactSupportOption: 'Contact Support',
    appInfoSection: 'App Info',
    aboutAppOption: 'About App',
    termsOfServiceOption: 'Terms of Service',
    lightMode: 'Light',
    darkMode: 'Dark',
    chooseTheme: 'Choose Theme',
    chooseLanguage: 'Choose Language',
    english: 'English',
    spanish: 'Spanish',
    french: 'French',
    german: 'German',
    logout: 'Logout',
  },
};


const SettingsScreen = ({ navigation }) => {
  const { isDarkMode, toggleTheme, theme } = useTheme();
  const styles = getStyles(isDarkMode, theme);

  const [language] = useState('en');
  const [isPushEnabled, setIsPushEnabled] = useState(true);

  // Reusable component for settings sections
  const Section = ({ title, children }) => (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );

  // Reusable component for individual setting options
  const SettingOption = ({ icon, text, value, onPress, hasSwitch, switchValue, onSwitchChange }) => (
    <TouchableOpacity style={styles.option} onPress={onPress} disabled={hasSwitch}>
      <Icon name={icon} size={22} style={styles.optionIcon} />
      <Text style={styles.optionText}>{text}</Text>
      <View style={styles.optionValueContainer}>
        {value && <Text style={styles.optionValue}>{value}</Text>}
        {hasSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: '#767577', true: isDarkMode ? '#FF6B81' : '#D81B60' }}
            thumbColor={isDarkMode ? '#f4f3f4' : '#f4f3f4'}
          />
        ) : (
          onPress && <Icon name="chevron-right" size={22} style={styles.optionValue} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{translations[language].settingsTitle}</Text>

        <Section title={translations[language].generalSection}>
          <SettingOption
            icon="theme-light-dark"
            text={translations[language].themeOption}
            hasSwitch
            switchValue={isDarkMode}
            onSwitchChange={toggleTheme}
          />
        </Section>

        <Section title={translations[language].accountSection}>
          <SettingOption
            icon="account-edit-outline"
            text={translations[language].editProfileOption}
            onPress={() => navigation.navigate('EditProfile')}
          />
          {/* --- CHANGE IS HERE --- */}
          <SettingOption
            icon="lock-outline"
            text={translations[language].changePasswordOption}
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <SettingOption
            icon="map-marker-outline"
            text={translations[language].manageAddressOption}
            onPress={() => navigation.navigate('ManageAddress')}
          />
        </Section>

        <Section title={translations[language].notificationsSection}>
          <SettingOption
            icon="bell-outline"
            text={translations[language].pushNotificationsOption}
            hasSwitch
            switchValue={isPushEnabled}
            onSwitchChange={() => setIsPushEnabled(!isPushEnabled)}
          />
        </Section>

        <Section title={translations[language].helpSupportSection}>
          <SettingOption icon="help-circle-outline" text={translations[language].helpCenterOption} onPress={() => {}} />
          <SettingOption icon="headset" text={translations[language].contactSupportOption} onPress={() => {}} />
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
};


// Enhanced getStyles function using theme colors
const getStyles = (isDarkMode, theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
  },
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
    padding: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 30,
    color: theme.colors.text,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  option: {
    backgroundColor: theme.colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 1,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionIcon: {
    color: theme.colors.primary,
    marginRight: 15,
  },
  optionText: {
    flex: 1,
    fontSize: 17,
    color: theme.colors.text,
  },
  optionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionValue: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    marginRight: 5,
  },
});


export default SettingsScreen;