import { useState, useEffect, useRef, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Animated, Dimensions, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = 'https://taykar-backend.onrender.com';
const BRAND_COLOR = '#00D06C';
const DARK_BG = '#03060A';
const CARD_BG = '#0A121A';

const { width, height } = Dimensions.get('window');

export default function OTPScreen({ navigation, route }) {
  const { phone, selectedRole } = route.params;
  const { login } = useContext(AuthContext);
  const [otp, setOtp] = useState('');

  // --- ANIMATION ENGINES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();
  }, new Array()); // Safe array!

  const verifyOTP = async () => {
    if (otp.length !== 6) return Alert.alert("Error", "Please enter the full 6-digit code.");
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        phoneNumber: phone, otp, selectedRole
      });

      if (response.data.isRegistered) {
        // Automatically login if they already exist!
        login(response.data.token, response.data.user);
      } else {
        // If they are new, send them to the futuristic Register screen!
        navigation.navigate('Register', { phone, selectedRole });
      }
    } catch (error) {
      Alert.alert("Access Denied", error.response?.data?.message || "Invalid Security Code");
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      {/* 🗺️ CYBER-GRID BACKGROUND */}
      <View style={styles.gridContainer}>
        <View style={[styles.gridLine, { left: width * 0.25 }]} />
        <View style={[styles.gridLine, { left: width * 0.5 }]} />
        <View style={[styles.gridLine, { left: width * 0.75 }]} />
        <View style={[styles.gridLineH, { top: height * 0.25 }]} />
        <View style={[styles.gridLineH, { top: height * 0.5 }]} />
        <View style={[styles.gridLineH, { top: height * 0.75 }]} />
      </View>

      {/* 🔙 BACK BUTTON */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="chevron-left" size={35} color="white" />
      </TouchableOpacity>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        
        {/* HEADER */}
        <View style={styles.headerBox}>
          <MaterialCommunityIcons name="shield-lock-outline" size={45} color={BRAND_COLOR} style={{ marginBottom: 10 }} />
          <Text style={styles.systemText}>SECURITY PROTOCOL</Text>
          <Text style={styles.title}>Enter Access Code</Text>
          <Text style={styles.subtitle}>Secure transmission sent to:{"\n"}<Text style={{color: 'white', fontWeight: 'bold'}}>{phone}</Text></Text>
        </View>

        {/* NEON PASSCODE INPUT */}
        <View style={styles.inputWrapper}>
          <TextInput 
            style={styles.input} 
            placeholder="● ● ● ● ● ●" 
            placeholderTextColor="#333" 
            keyboardType="number-pad" 
            maxLength={6} 
            value={otp} 
            onChangeText={setOtp} 
            autoFocus={true} // Safe to use here because of KeyboardAvoidingView!
          />
        </View>

        {/* NEON VERIFY BUTTON */}
        <TouchableOpacity style={styles.button} activeOpacity={0.7} onPress={verifyOTP}>
          <Text style={styles.buttonText}>VERIFY IDENTITY</Text>
          <MaterialCommunityIcons name="fingerprint" size={22} color="white" style={{ marginLeft: 10 }} />
        </TouchableOpacity>

      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG, padding: 20 },
  
  // Cyber Grid
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  gridLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: BRAND_COLOR },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: BRAND_COLOR },

  backBtn: { position: 'absolute', top: 50, left: 15, zIndex: 10 },
  content: { flex: 1, justifyContent: 'center', zIndex: 5 },

  // Header
  headerBox: { marginBottom: 40, alignItems: 'center' },
  systemText: { color: BRAND_COLOR, fontSize: 12, fontWeight: 'bold', letterSpacing: 4, marginBottom: 5, opacity: 0.8 },
  title: { fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: 1, textShadowColor: BRAND_COLOR, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#88929E', lineHeight: 22, textAlign: 'center' },

  // Passcode Input (Glowing, centered, spaced out)
  inputWrapper: { backgroundColor: CARD_BG, borderRadius: 15, borderWidth: 1, borderColor: BRAND_COLOR, marginBottom: 30, paddingHorizontal: 15, shadowColor: BRAND_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  input: { paddingVertical: 20, fontSize: 32, color: BRAND_COLOR, fontWeight: '900', letterSpacing: 15, textAlign: 'center' },
  
  // Button
  button: { backgroundColor: BRAND_COLOR, flexDirection: 'row', padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: BRAND_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 2 }
});