import { useState, useEffect, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './AuthContext';
import LocationSearchScreen from './screens/LocationSearchScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import RoleSelectionScreen from './screens/RoleSelectionScreen';
import PhoneScreen from './screens/PhoneScreen';
import OTPScreen from './screens/OTPScreen';
import RegisterScreen from './screens/RegisterScreen';

import MainScreen from './screens/MainScreen';
import ProfileScreen from './screens/ProfileScreen';
// import LocationSearchScreen from './screens/LocationSearchScreen'; // We will build this in Phase 3!

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { token } = useContext(AuthContext);
  const [showSplash, setShowSplash] = useState(true);

  // Show the Welcome Screen for 3 seconds EVERY time the app opens!
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  },[]);

  if (showSplash) {
    return <WelcomeScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token === null ? (
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="PhoneAuth" component={PhoneScreen} />
            <Stack.Screen name="OTP" component={OTPScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="LocationSearch" component={LocationSearchScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}