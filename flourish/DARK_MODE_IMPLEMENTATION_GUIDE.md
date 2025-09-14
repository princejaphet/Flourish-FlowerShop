# Dark Mode Implementation Guide for React Native Screens

This guide shows how to implement dark mode support in all your React Native screens using the enhanced ThemeContext.

## 🚀 Quick Setup

### 1. Import the Theme Hook
```javascript
import { useTheme } from '../context/ThemeContext';
```

### 2. Use the Hook in Your Component
```javascript
const YourScreen = () => {
  const { isDarkMode, theme, toggleTheme } = useTheme();
  const styles = getStyles(isDarkMode, theme);
  
  // Your component logic here
};
```

### 3. Update Your Styles Function
```javascript
const getStyles = (isDarkMode, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  text: {
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
  },
  // Add more styles using theme.colors
});
```

## 🎨 Available Theme Colors

The theme object provides these colors that automatically adapt to dark/light mode:

### Background Colors
- `theme.colors.background` - Main background color
- `theme.colors.surface` - Secondary background color  
- `theme.colors.card` - Card/container background color

### Text Colors
- `theme.colors.text` - Primary text color
- `theme.colors.textSecondary` - Secondary text color
- `theme.colors.textMuted` - Muted/disabled text color

### Primary Colors
- `theme.colors.primary` - Primary brand color (#ef4444)
- `theme.colors.primaryLight` - Light variant of primary
- `theme.colors.primaryDark` - Dark variant of primary

### UI Colors
- `theme.colors.border` - Border color
- `theme.colors.divider` - Divider/separator color
- `theme.colors.shadow` - Shadow color
- `theme.colors.shadowLight` - Light shadow color

### Status Colors
- `theme.colors.success` - Success/positive color
- `theme.colors.warning` - Warning color
- `theme.colors.error` - Error/danger color
- `theme.colors.info` - Info color

### Input Colors
- `theme.colors.inputBackground` - Input field background
- `theme.colors.inputBorder` - Input field border
- `theme.colors.inputText` - Input text color
- `theme.colors.placeholder` - Placeholder text color

### Button Colors
- `theme.colors.buttonBackground` - Button background
- `theme.colors.buttonText` - Button text color

## 📱 Complete Screen Example

Here's a complete example of a screen with dark mode support:

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ExampleScreen = ({ navigation }) => {
  const { isDarkMode, theme, toggleTheme } = useTheme();
  const styles = getStyles(isDarkMode, theme);
  const [inputValue, setInputValue] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Example Screen</Text>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Text style={styles.themeButtonText}>
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card Example */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Card Title</Text>
          <Text style={styles.cardText}>This is some card content that adapts to the theme.</Text>
        </View>

        {/* Input Example */}
        <TextInput
          style={styles.input}
          placeholder="Enter some text..."
          placeholderTextColor={theme.colors.placeholder}
          value={inputValue}
          onChangeText={setInputValue}
        />

        {/* Button Examples */}
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Primary Button</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Secondary Button</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (isDarkMode, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  themeButton: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  themeButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.card,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  input: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.inputText,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: theme.colors.buttonBackground,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExampleScreen;
```

## 🔧 Migration Steps for Existing Screens

### Step 1: Update Imports
Replace any existing theme imports with:
```javascript
import { useTheme } from '../context/ThemeContext';
```

### Step 2: Update Component Hook Usage
Replace:
```javascript
const { isDarkMode } = useContext(ThemeContext);
```

With:
```javascript
const { isDarkMode, theme } = useTheme();
```

### Step 3: Update Styles Function
Change your getStyles function signature from:
```javascript
const getStyles = (isDarkMode) => StyleSheet.create({
```

To:
```javascript
const getStyles = (isDarkMode, theme) => StyleSheet.create({
```

### Step 4: Replace Hard-coded Colors
Replace hard-coded colors with theme colors:

**Before:**
```javascript
backgroundColor: isDarkMode ? '#1a1a2e' : '#F7E9E9',
color: isDarkMode ? '#fff' : '#333',
```

**After:**
```javascript
backgroundColor: theme.colors.background,
color: theme.colors.text,
```

### Step 5: Update StatusBar
Add proper StatusBar styling:
```javascript
<StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
```

## 📋 Screens to Update

Here are all the screens that need dark mode implementation:

### ✅ Already Updated
- [x] SettingsScreen.js
- [x] Homepage.js

### 🔄 Need Updates
- [ ] AboutApp.js
- [ ] BrowseProduct.js
- [ ] ChangePasswordScreen.js
- [ ] ChatScreen.js
- [ ] DeliveryAddress.js
- [ ] EditProfile.js
- [ ] LoginScreen.js
- [ ] ManageAddress.js
- [ ] Message.js
- [ ] MessageChatbot.js
- [ ] MyOrdersScreen.js
- [ ] NotificationsScreen.js
- [ ] OnboardingScreen.js
- [ ] OrderCheckout.js
- [ ] OrderTrackingScreen.js
- [ ] ProductDetail.js
- [ ] SignupScreen.js
- [ ] SplashScreen.js
- [ ] UserProfile.js
- [ ] WelcomeScreen.js

## 🎯 Key Benefits

1. **Consistent Theming**: All screens use the same color palette
2. **Automatic Adaptation**: Colors automatically adjust for dark/light mode
3. **Persistent Preferences**: User's theme choice is saved and restored
4. **System Integration**: Respects system theme preferences
5. **Easy Maintenance**: Centralized theme management

## 🚨 Important Notes

1. **AsyncStorage Dependency**: Make sure you have `@react-native-async-storage/async-storage` installed
2. **Navigation Theme**: The NavigationContainer is already configured with theme support
3. **StatusBar**: Always update StatusBar styling for each screen
4. **Testing**: Test both light and dark modes on different devices
5. **Performance**: Theme changes are optimized and don't cause unnecessary re-renders

## 🔗 Related Files

- `context/ThemeContext.js` - Main theme context
- `App.js` - Theme provider setup
- `screens/SettingsScreen.js` - Example implementation
- `screens/Homepage.js` - Example implementation

Happy theming! 🎨