import { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✨ HERE ARE THE IMPORTS I WAS TALKING ABOUT! ✨
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const checkMemory = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('userToken');
        const savedUser = await AsyncStorage.getItem('userData');
        const savedTheme = await AsyncStorage.getItem('appTheme');
        
        if (savedTheme === 'light') setIsDarkMode(false);

        if (savedToken && savedUser) {
          let parsedUser = JSON.parse(savedUser);
          if (!parsedUser.name && parsedUser.firstName) {
            parsedUser.name = `${parsedUser.firstName} ${parsedUser.lastName}`;
          }
          setToken(savedToken);
          setUser(parsedUser);
        }
      } catch (e) { console.log("Memory error", e); }
      setIsLoading(false);
    };
    checkMemory();
  }, []); // Safe empty brackets!

  // ✨ THE UPDATED LOGIN FUNCTION THAT SAVES THE PUSH TOKEN ✨
  const login = async (newToken, newUser) => {
    if (!newUser.name && newUser.firstName) newUser.name = `${newUser.firstName} ${newUser.lastName}`;
    
    setToken(newToken);
    setUser(newUser);
    
    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userData', JSON.stringify(newUser));

    // Ask for Notification Permissions!
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus === 'granted') {
        // Get the phone's unique token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        
        try {
          const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          
          // Send it securely to our Backend!
          await axios.put(`https://taykar-backend.onrender.com/api/auth/push-token`, 
            { token: pushTokenData.data }, 
            { headers: { Authorization: `Bearer ${newToken}` } }
          );
          console.log("Push Token saved:", pushTokenData.data);
        } catch (e) { 
          console.log("Failed to save push token", e); 
        }
      }
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
  };

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem('appTheme', newMode ? 'dark' : 'light');
  };

  const theme = {
    isDark: isDarkMode,
    brand: '#00D06C',
    bg: isDarkMode ? '#03060A' : '#F4F6F8',
    card: isDarkMode ? '#0A121A' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#111111',
    subText: isDarkMode ? '#88929E' : '#777777',
    border: isDarkMode ? '#222222' : '#E0E0E0',
    input: isDarkMode ? '#111111' : '#F4F6F8',
  };

  if (isLoading) return null;

  return (
    <AuthContext.Provider value={{ token, user, setToken, setUser, login, logout, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};