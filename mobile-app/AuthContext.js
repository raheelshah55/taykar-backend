import { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('userToken');
        const savedUser = await AsyncStorage.getItem('userData');
        if (savedToken && savedUser) {
          
          let parsedUser = JSON.parse(savedUser);
          
          // ✨ THE FIX: Stitch the first and last name together so the UI doesn't crash!
          // We do this when they open the app from memory.
          if (!parsedUser.name && parsedUser.firstName) {
            parsedUser.name = `${parsedUser.firstName} ${parsedUser.lastName}`;
          }

          setToken(savedToken);
          setUser(parsedUser);
        }
      } catch (e) { 
        console.log("Failed to fetch token"); 
      }
      setIsLoading(false);
    };
    checkLogin();
  }, []); 

  const login = async (newToken, newUser) => {
    // ✨ THE FIX: We also do it here for when they login/register fresh!
    if (!newUser.name && newUser.firstName) {
      newUser.name = `${newUser.firstName} ${newUser.lastName}`;
    }

    setToken(newToken);
    setUser(newUser);
    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userData', JSON.stringify(newUser));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
  };

  if (isLoading) return null;
//update
  return (
    <AuthContext.Provider value={{ token, user, setToken, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};