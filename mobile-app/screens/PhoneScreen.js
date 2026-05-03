import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';

const API_URL = 'https://taykar-backend.onrender.com';

export default function PhoneScreen({ navigation, route }) {
  const selectedRole = route.params?.selectedRole || 'rider';
  const [phone, setPhone] = useState('');

  const sendOTP = async () => {
    if (phone.length < 10) return Alert.alert("Error", "Enter a valid phone number.");
    try {
      await axios.post(`${API_URL}/api/auth/send-otp`, { phoneNumber: phone });
      Alert.alert("OTP Sent!", "Use code 1234 for testing.");
      navigation.navigate('OTP', { phone, selectedRole });
    } catch (error) {
      Alert.alert("Error", "Could not send OTP.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your number</Text>
      <Text style={styles.subtitle}>We will send a verification code</Text>
      <TextInput style={styles.input} placeholder="03XX XXXXXXX" keyboardType="numeric" value={phone} onChangeText={setPhone} autoFocus />
      <TouchableOpacity style={styles.button} onPress={sendOTP}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f8', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#777', marginBottom: 30 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, fontSize: 20, marginBottom: 20, letterSpacing: 2, color: '#000' },
  button: { backgroundColor: '#00D06C', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});