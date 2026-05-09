import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';

const API_URL = 'https://taykar-backend.onrender.com';

export default function PhoneAuthScreen({ navigation, route }) {
  const { role } = route.params;
  const [phone, setPhone] = useState('');

  const sendOTP = async () => {
    if (!phone) return Alert.alert("Error", "Please enter your mobile number");
    try {
      await axios.post(`${API_URL}/api/auth/send-otp`, { phoneNumber: phone });
      navigation.navigate('OtpVerification', { phone, role }); // Go to next screen
    } catch (error) { Alert.alert("Error", "Could not send code"); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your number</Text>
      <Text style={styles.subtitle}>We will send a 4-digit code to verify</Text>
      <TextInput style={styles.input} placeholder="e.g. 0300123456567" keyboardType="numeric" value={phone} onChangeText={setPhone} autoFocus />
      <TouchableOpacity style={styles.button} onPress={sendOTP}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f8', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  input: { backgroundColor: 'white', padding: 15, fontSize: 18, borderRadius: 10, elevation: 1, marginBottom: 20, color: '#000' },
  button: { backgroundColor: '#00D06C', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});