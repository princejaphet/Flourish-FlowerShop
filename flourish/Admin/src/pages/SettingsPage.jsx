import React from 'react';
import {
  Settings, User, Shield, Bell, Palette, Globe, Mail, Store,
  Lock, Eye, EyeOff, Save, AlertTriangle, CheckCircle, Info, Sun,
  Clock, MapPin, Phone, Building, Loader2
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

// --- Firebase Initialization ---
// NOTE: __firebase_config is a global variable provided in the execution environment.
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };

// Prevent re-initialization error
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- HELPER COMPONENTS (Moved Outside of SettingsPage) ---

const SettingCard = ({ title, description, children, icon: Icon }) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-red-600" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
            {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  const InputField = ({ label, type = 'text', value, onChange, placeholder, icon: Icon, ...props }) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-slate-400" />
          </div>
        )}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200`}
          {...props}
        />
      </div>
    </div>
  );

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${enabled ? 'bg-red-600' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`}/>
      </button>
    </div>
  );
  

const SettingsPage = () => {
  const [activeTab, setActiveTab] = React.useState('profile');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState({
    email: true,
    push: true,
    orders: true,
    inventory: true,
    customers: false
  });
  const [businessInfo, setBusinessInfo] = React.useState({
    name: 'Flourish Flower Shop',
    email: 'admin@flourish.com',
    phone: '+1 (555) 123-4567',
    address: '123 Garden Street, Bloom City, BC 12345',
    website: 'www.flourish.com',
    description: 'Premium flower arrangements and gifts for every occasion'
  });

  const [profileImageFile, setProfileImageFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [currentUser, setCurrentUser] = React.useState(null);
  
  const [userProfile, setUserProfile] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    fullName: ''
  });

  // Effect to get current user and profile data from Firebase
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            
            if (userData.profileImageUrl) setPreviewUrl(userData.profileImageUrl);
            
            setUserProfile({
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              email: userData.email || user.email || '',
              phone: userData.phone || '',
              businessName: userData.businessName || '',
              fullName: userData.fullName || ''
            });

            if (userData.notifications) {
              setNotifications(prevSettings => ({ ...prevSettings, ...userData.notifications }));
            }
            
            if (userData.businessInfo) {
              setBusinessInfo(prevInfo => ({ ...prevInfo, ...userData.businessInfo }));
            }
          } else {
            setUserProfile(prev => ({ ...prev, email: user.email || '' }));
          }
        });
        return () => unsubSnapshot();
      } else {
        setCurrentUser(null);
        setUserProfile({ firstName: '', lastName: '', email: '', phone: '', businessName: '', fullName: '' });
      }
    });
    return () => unsubscribe();
  }, []);
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setSuccess('');
    }
  };

  const handleProfileChange = (field, value) => {
    setUserProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleBusinessInfoChange = (field, value) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSaveChanges = async () => {
    if (!currentUser) {
      setError("You must be logged in to save changes.");
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      let updateData = {};

      if (activeTab === 'profile' && profileImageFile) {
        const formData = new FormData();
        formData.append('file', profileImageFile);
        formData.append('upload_preset', 'my_app_preset');
        const response = await fetch('https://api.cloudinary.com/v1_1/djhtu0rzz/image/upload', {
          method: 'POST', body: formData,
        });
        if (!response.ok) throw new Error('Image upload failed');
        const data = await response.json();
        updateData.profileImageUrl = data.secure_url;
        setProfileImageFile(null);
      }

      if (activeTab === 'profile') {
        updateData = { ...updateData, ...userProfile };
      }

      if (activeTab === 'business') {
        updateData.businessInfo = businessInfo;
      }
      if (activeTab === 'notifications') {
        updateData.notifications = notifications;
      }

      updateData.updatedAt = new Date().toISOString();
      await setDoc(userDocRef, updateData, { merge: true });
      
      setSuccess('Changes saved successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const settingsTabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'business', name: 'Business', icon: Store },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <SettingCard title="System Preferences" description="Configure basic system settings" icon={Settings}>
        <div className="space-y-4">
          <ToggleSwitch enabled={isDarkMode} onChange={setIsDarkMode} label="Dark Mode" description="Switch between light and dark themes"/>
          <ToggleSwitch enabled={true} onChange={() => {}} label="Auto-save Changes" description="Automatically save changes as you type"/>
          <ToggleSwitch enabled={false} onChange={() => {}} label="Maintenance Mode" description="Put the system in maintenance mode"/>
        </div>
      </SettingCard>
    </div>
  );

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <SettingCard title="Personal Information" description="Update your personal details and profile picture" icon={User}>
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center overflow-hidden">
                {previewUrl ? <img src={previewUrl} alt="Profile Preview" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-red-600" />}
            </div>
            <div>
                <label htmlFor="file-upload" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-medium cursor-pointer">Change Photo</label>
                <input id="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                <p className="text-xs text-slate-500 mt-1">JPG, PNG up to 5MB</p>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 flex items-center gap-2 mb-4"><AlertTriangle size={16}/> {error}</p>}
          {success && <p className="text-sm text-green-600 flex items-center gap-2 mb-4"><CheckCircle size={16}/> {success}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="First Name" value={userProfile.firstName} onChange={(e) => handleProfileChange('firstName', e.target.value)} placeholder="Enter first name"/>
            <InputField label="Last Name" value={userProfile.lastName} onChange={(e) => handleProfileChange('lastName', e.target.value)} placeholder="Enter last name"/>
          </div>
          <InputField label="Full Name / Display Name" value={userProfile.fullName} onChange={(e) => handleProfileChange('fullName', e.target.value)} placeholder="Enter full name or preferred display name" icon={User}/>
          <InputField label="Business/Shop Name" value={userProfile.businessName} onChange={(e) => handleProfileChange('businessName', e.target.value)} placeholder="Enter your business or shop name" icon={Store}/>
          <InputField label="Email Address" type="email" value={userProfile.email} onChange={(e) => handleProfileChange('email', e.target.value)} placeholder="Enter email" icon={Mail}/>
          <InputField label="Phone Number" value={userProfile.phone} onChange={(e) => handleProfileChange('phone', e.target.value)} placeholder="Enter phone number" icon={Phone}/>
        </div>
      </SettingCard>
      <SettingCard title="Change Password" description="Update your account password" icon={Lock}>
        <div className="space-y-4">
          <InputField label="Current Password" type="password" placeholder="Enter current password" icon={Lock}/>
          <InputField label="New Password" type={showPassword ? 'text' : 'password'} placeholder="Enter new password" icon={Lock}/>
          <InputField label="Confirm New Password" type={showPassword ? 'text' : 'password'} placeholder="Confirm new password" icon={Lock}/>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPassword(!showPassword)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
              {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>} {showPassword ? 'Hide' : 'Show'} passwords
            </button>
          </div>
        </div>
      </SettingCard>
    </div>
  );

  const renderBusinessSettings = () => (
    <div className="space-y-6">
      <SettingCard title="Shop Information" description="Manage your flower shop details" icon={Store}>
        <div className="space-y-4">
          <InputField label="Business Name" value={businessInfo.name} onChange={(e) => handleBusinessInfoChange('name', e.target.value)} placeholder="Enter business name" icon={Building}/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Business Email" type="email" value={businessInfo.email} onChange={(e) => handleBusinessInfoChange('email', e.target.value)} placeholder="Enter business email" icon={Mail}/>
            <InputField label="Business Phone" value={businessInfo.phone} onChange={(e) => handleBusinessInfoChange('phone', e.target.value)} placeholder="Enter business phone" icon={Phone}/>
          </div>
          <InputField label="Business Address" value={businessInfo.address} onChange={(e) => handleBusinessInfoChange('address', e.target.value)} placeholder="Enter full address" icon={MapPin}/>
          <InputField label="Website" value={businessInfo.website} onChange={(e) => handleBusinessInfoChange('website', e.target.value)} placeholder="Enter website URL" icon={Globe}/>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Business Description</label>
            <textarea value={businessInfo.description} onChange={(e) => handleBusinessInfoChange('description', e.target.value)} placeholder="Describe your flower shop" rows={3} className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 resize-none"/>
          </div>
        </div>
      </SettingCard>
      <SettingCard title="Operating Hours" description="Set your shop's operating schedule" icon={Clock}>
        <div className="space-y-4">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
            <div key={day} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 w-20">{day}</span>
                <ToggleSwitch enabled={day !== 'Sunday'} onChange={() => {}} label=""/>
              </div>
              {day !== 'Sunday' && (
                <div className="flex items-center gap-2">
                  <input type="time" defaultValue="09:00" className="px-2 py-1 border border-slate-300 rounded text-sm"/>
                  <span className="text-slate-500">to</span>
                  <input type="time" defaultValue="18:00" className="px-2 py-1 border border-slate-300 rounded text-sm"/>
                </div>
              )}
            </div>
          ))}
        </div>
      </SettingCard>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <SettingCard title="Notification Channels" description="Choose how you want to receive notifications" icon={Bell}>
        <div className="space-y-4">
          <ToggleSwitch enabled={notifications.email} onChange={(value) => setNotifications({...notifications, email: value})} label="Email Notifications" description="Receive notifications via email"/>
          <ToggleSwitch enabled={notifications.push} onChange={(value) => setNotifications({...notifications, push: value})} label="Push Notifications" description="Browser and mobile push notifications"/>
        </div>
      </SettingCard>
      <SettingCard title="Notification Types" description="Select which events trigger notifications" icon={AlertTriangle}>
        <div className="space-y-4">
          <ToggleSwitch enabled={notifications.orders} onChange={(value) => setNotifications({...notifications, orders: value})} label="New Orders" description="Get notified when new orders are placed"/>
          <ToggleSwitch enabled={notifications.inventory} onChange={(value) => setNotifications({...notifications, inventory: value})} label="Low Inventory" description="Alert when products are running low"/>
          <ToggleSwitch enabled={notifications.customers} onChange={(value) => setNotifications({...notifications, customers: value})} label="New Customers" description="Notification for new customer registrations"/>
        </div>
      </SettingCard>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings();
      case 'profile': return renderProfileSettings();
      case 'business': return renderBusinessSettings();
      case 'notifications': return renderNotificationSettings();
      default: return renderGeneralSettings();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
            <p className="text-slate-500 mt-1"></p>
          </div>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-2">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${ activeTab === tab.id ? 'bg-red-100 text-red-700 border border-red-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
            >
              <tab.icon size={16} />
              <span className="font-medium text-sm">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {renderTabContent()}
          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleSaveChanges}
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 font-medium disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              {uploading ? (<><Loader2 className="animate-spin" size={16}/>Saving...</>) : (<><Save size={16}/>Save Changes</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;