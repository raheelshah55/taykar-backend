import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Animated, Dimensions, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = 'https://taykar-backend.onrender.com';
const BRAND_COLOR = '#00D06C';
const DARK_BG = '#03060A';
const CARD_BG = '#0A121A';

const { width, height } = Dimensions.get('window');

export default function PhoneScreen({ navigation, route }) {
  const selectedRole = route.params?.selectedRole || 'rider';
  const [phone, setPhone] = useState('');

  // --- ANIMATION ENGINES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();
  }, new Array()); // Safe array to prevent text-generator bugs!

  const sendOTP = async () => {
    if (phone.length < 10) return Alert.alert("Error", "Enter a valid phone number.");
    try {
      await axios.post(`${API_URL}/api/auth/send-otp`, { phoneNumber: phone });
      navigation.navigate('OTP', { phone, selectedRole });
    } catch (error) {
      // ✨ FIX: THIS WILL NOW REVEAL THE EXACT ERROR! ✨
      Alert.alert("Network Error", error.response?.data?.message || error.message);
    }
  };

  return (
    // ✨ FIX 1: KeyboardAvoidingView stops Android from crashing the layout! ✨
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
          <MaterialCommunityIcons 
            name={selectedRole === 'driver' ? 'steering' : 'map-marker-path'} 
            size={40} color={BRAND_COLOR} style={{ marginBottom: 10 }} 
          />
          <Text style={styles.systemText}>AUTHENTICATION REQUIRED</Text>
          <Text style={styles.title}>Enter Mobile Number</Text>
          <Text style={styles.subtitle}>We will send a secure 6-digit access code to verify your identity.</Text>
        </View>

        {/* INPUT FIELD (✨ FIX 2: State change removed, permanently neon green!) */}
        <View style={styles.inputWrapper}>
          <MaterialCommunityIcons name="phone" size={24} color={BRAND_COLOR} style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="03XX XXXXXXX" 
            placeholderTextColor="#444" 
            keyboardType="phone-pad" // ✨ FIX 3: phone-pad is safer than numeric on Android
            value={phone} 
            onChangeText={setPhone} 
            autoFocus={true} // Automatically opens the keyboard safely now!
          />
        </View>

        {/* NEON BUTTON */}
        <TouchableOpacity style={styles.button} activeOpacity={0.7} onPress={sendOTP}>
          <Text style={styles.buttonText}>SEND OTP</Text>
          <MaterialCommunityIcons name="send" size={20} color="white" style={{ marginLeft: 10 }} />
        </TouchableOpacity>

      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG, padding: 20 },
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  gridLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: BRAND_COLOR },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: BRAND_COLOR },
  backBtn: { position: 'absolute', top: 50, left: 15, zIndex: 10 },
  content: { flex: 1, justifyContent: 'center', zIndex: 5 },
  headerBox: { marginBottom: 40 },
  systemText: { color: BRAND_COLOR, fontSize: 12, fontWeight: 'bold', letterSpacing: 4, marginBottom: 5, opacity: 0.8 },
  title: { fontSize: 36, fontWeight: '900', color: 'white', letterSpacing: 1, textShadowColor: BRAND_COLOR, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#88929E', lineHeight: 22 },
  
  // Input Styles (Permanently glowing)
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 15, borderWidth: 1, borderColor: BRAND_COLOR, marginBottom: 30, paddingHorizontal: 15, shadowColor: BRAND_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 18, fontSize: 22, color: 'white', fontWeight: 'bold', letterSpacing: 2 },
  
  // Button Styles
  button: { backgroundColor: BRAND_COLOR, flexDirection: 'row', padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: BRAND_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 2 }
});