// components/BottomNav.js
import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const lightColors = {
  background: '#F7E9E9', // Keep original background color for light mode
  inactive: '#999999',
  active: '#D81B60',
  activeBackground: '#D81B6015',
  borderColor: '#E0E0E0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  cardBackground: '#FFFFFF',
};

const darkColors = {
  background: '#1a1a2e', // Keep original background color for dark mode
  inactive: '#888888',
  active: '#D81B60',
  activeBackground: '#D81B6020',
  borderColor: '#333333',
  shadow: 'rgba(0, 0, 0, 0.3)',
  cardBackground: '#2A2A3E',
};

const BottomNav = ({ activeTab, iconSize = 24 }) => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = isDarkMode ? darkColors : lightColors;

  // MODIFIED: Replaced the icon names with more modern alternatives.
  const tabs = useMemo(() => [
    { name: 'home', icon: 'home-outline', navigateTo: 'Homepage', label: 'Home' },
    { name: 'bouquet', icon: 'store-outline', navigateTo: 'BrowseProducts', label: 'Browse' },
    { name: 'chat', icon: 'chat-processing-outline', navigateTo: 'Message', label: 'Chat' },
    { name: 'profile', icon: 'account-outline', navigateTo: 'UserProfile', label: 'Profile' },
  ], []);

  const NavItem = ({ tabName, iconName, navigateTo, label }) => {
    const isActive = activeTab === tabName;
    
    return (
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate(navigateTo)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Icon
            name={iconName}
            size={iconSize}
            color={isActive ? colors.active : colors.inactive}
          />
          <Text style={[
            styles.navLabel, 
            { 
              color: isActive ? colors.active : colors.inactive,
              fontWeight: isActive ? '600' : '400'
            }
          ]}>
            {label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[
      styles.bottomNav,
      {
        backgroundColor: colors.background,
        borderTopColor: colors.borderColor,
        shadowColor: colors.shadow,
        paddingBottom: Math.max(insets.bottom, 8), // Respect safe area
      }
    ]}>
      {tabs.map((tab) => (
        <NavItem
          key={tab.name}
          tabName={tab.name}
          iconName={tab.icon}
          navigateTo={tab.navigateTo}
          label={tab.label}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    borderTopWidth: 0.5,
    minHeight: 68,
    paddingTop: 8,
    paddingHorizontal: 12,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 48,
  },
  navLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default BottomNav;