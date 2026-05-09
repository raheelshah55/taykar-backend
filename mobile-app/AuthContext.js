import { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const[user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ✨ NEW: Global Theme State!
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const checkMemory = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('userToken');
        const savedUser = await AsyncStorage.getItem('userData');
        const savedTheme = await AsyncStorage.getItem('appTheme');
        
        // Remember their Light/Dark choice!
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
  },[]);

  const login = async (newToken, newUser) => {
    if (!newUser.name && newUser.firstName) newUser.name = `${newUser.firstName} ${newUser.lastName}`;
    setToken(newToken); setUser(newUser);
    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userData', JSON.stringify(newUser));
  };

  const logout = async () => {
    setToken(null); setUser(null);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
  };

  // ✨ NEW: Theme Toggle Function
  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem('appTheme', newMode ? 'dark' : 'light');
  };

  // ✨ NEW: The Dynamic Color Palette!
  const theme = {
    isDark: isDarkMode,
    brand: '#00D06C', // TayKar Green stays the same
    bg: isDarkMode ? '#03060A' : '#F4F6F8',       // Space Black vs Light Grey
    card: isDarkMode ? '#0A121A' : '#FFFFFF',     // Dark Glass vs Pure White
    text: isDarkMode ? '#FFFFFF' : '#111111',     // White vs Dark Grey
    subText: isDarkMode ? '#88929E' : '#777777',  // Muted Grey for both
    border: isDarkMode ? '#222222' : '#E0E0E0',   // Subtle borders
    input: isDarkMode ? '#111111' : '#F4F6F8',    // Input backgrounds
  };

  if (isLoading) return null;

  return (
    <AuthContext.Provider value={{ token, user, setToken, setUser, login, logout, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};