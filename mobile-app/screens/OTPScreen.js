import { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../AuthContext';

const API_URL = 'https://taykar-backend.onrender.com';

export default function OTPScreen({ navigation, route }) {
  const { phone, selectedRole } = route.params;
  const { login } = useContext(AuthContext);
  const[otp, setOtp] = useState('');

  const verifyOTP = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        phoneNumber: phone, otp, selectedRole
      });

      if (response.data.isRegistered) {
        // They exist! Log them right in!
        login(response.data.token, response.data.user);
      } else {
        // New user! Send them to Register screen with their phone number
        navigation.navigate('Register', { phone, selectedRole });
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Invalid OTP");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>Sent to {phone}</Text>
      <TextInput style={styles.input} placeholder="1234" keyboardType="numeric" maxLength={4} value={otp} onChangeText={setOtp} autoFocus />
      <TouchableOpacity style={styles.button} onPress={verifyOTP}>
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f8', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#777', marginBottom: 30 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, fontSize: 24, marginBottom: 20, textAlign: 'center', letterSpacing: 5, color: '#000' },
  button: { backgroundColor: '#00D06C', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});