import { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import * as ImagePicker from 'expo-image-picker';

// ⚠️ 1. PUT YOUR LIVE RENDER URL HERE!
const API_URL = 'https://taykar-backend.onrender.com';

// ⚠️ 2. PUT YOUR CLOUDINARY DETAILS HERE!
const CLOUD_NAME = 'dgbb1dxxl'; 
const UPLOAD_PRESET = 'ml_default'; 

const BRAND_COLOR = '#00D06C';

export default function RegisterScreen({ route, navigation }) {
  const { phone, selectedRole } = route.params;
  const { login } = useContext(AuthContext);
  
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

  const [cnicFront, setCnicFront] = useState(null);
  const [cnicBack, setCnicBack] = useState(null);
  const [vehicleDocs, setVehicleDocs] = useState(null);

  const pickImage = async (setImage) => {
    let result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (result.status !== 'granted') return Alert.alert("Permission Required", "Please allow gallery access.");

    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, // Compresses image to save user's mobile data!
    });

    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri);
    }
  };

  const handleNext = () => {
    if (!firstName || !lastName || !city || !address) return Alert.alert("Hold up!", "Please fill in all basic information.");
    if (selectedRole === 'driver' && !email) return Alert.alert("Email Required", "Drivers must provide an email address.");
    
    if (selectedRole === 'rider') submitRegistration();
    else setStep(2);
  };

  // --- NEW: CLOUDINARY UPLOAD FUNCTION ---
  const uploadToCloudinary = async (imageUri) => {
    if (!imageUri) return '';
    const data = new FormData();
    let filename = imageUri.split('/').pop();
    let match = /\.(\w+)$/.exec(filename);
    let type = match ? `image/${match[1]}` : `image`;

    data.append('file', { uri: imageUri, name: filename, type });
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' }
      });
      const json = await res.json();
      return json.secure_url; // Returns the live internet URL!
    } catch (err) {
      console.error("Cloudinary Error:", err);
      return '';
    }
  };

  const submitRegistration = async () => {
    if (selectedRole === 'driver' && (!cnicFront || !cnicBack || !vehicleDocs)) {
      return Alert.alert("Documents Required", "Please upload all required documents to continue.");
    }

    setLoading(true);

    try {
      let finalCnicFront = '';
      let finalCnicBack = '';
      let finalVehicleDocs = '';

      // If Driver, upload all 3 images to Cloudinary BEFORE sending to our backend!
      if (selectedRole === 'driver') {
        finalCnicFront = await uploadToCloudinary(cnicFront);
        finalCnicBack = await uploadToCloudinary(cnicBack);
        finalVehicleDocs = await uploadToCloudinary(vehicleDocs);
      }

      // Send the official Live URLs to our Render Backend
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        firstName, lastName, city, address, 
        phoneNumber: phone, 
        email: email || undefined,
        selectedRole,
        cnicFront: finalCnicFront, 
        cnicBack: finalCnicBack,
        vehicleDocs: finalVehicleDocs
      });

      if (selectedRole === 'driver') Alert.alert("Application Submitted!", "An admin will review your documents shortly.");
      else Alert.alert("Welcome to TayKar!", "Your account has been created.");

      login(response.data.token, response.data.user);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Could not register account");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>{step === 1 ? `Join TayKar as a ${selectedRole}` : 'Upload your documents'}</Text>

        {step === 1 && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TextInput style={[styles.input, { flex: 0.48 }]} placeholder="First Name" placeholderTextColor="#888" value={firstName} onChangeText={setFirstName} />
              <TextInput style={[styles.input, { flex: 0.48 }]} placeholder="Last Name" placeholderTextColor="#888" value={lastName} onChangeText={setLastName} />
            </View>
            <TextInput style={styles.input} placeholder="City" placeholderTextColor="#888" value={city} onChangeText={setCity} />
            <TextInput style={styles.input} placeholder="Full Address" placeholderTextColor="#888" value={address} onChangeText={setAddress} multiline />

            <View style={styles.phoneBox}><Text style={styles.phoneText}>📱 {phone} (Verified)</Text></View>

            {selectedRole === 'driver' && (
              <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="#888" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            )}

            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>{selectedRole === 'driver' ? 'Next: Upload Docs' : 'Complete Sign Up'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && selectedRole === 'driver' && (
          <View>
            <Text style={styles.docHelpText}>Please provide clear photos of your original documents.</Text>

            <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickImage(setCnicFront)}>
              {cnicFront ? <Image source={{ uri: cnicFront }} style={styles.uploadedImage} /> : (
                <View style={styles.uploadPlaceholder}><Text style={styles.uploadIcon}>🪪</Text><Text style={styles.uploadText}>CNIC (Front)</Text></View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickImage(setCnicBack)}>
              {cnicBack ? <Image source={{ uri: cnicBack }} style={styles.uploadedImage} /> : (
                <View style={styles.uploadPlaceholder}><Text style={styles.uploadIcon}>🪪</Text><Text style={styles.uploadText}>CNIC (Back)</Text></View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickImage(setVehicleDocs)}>
              {vehicleDocs ? <Image source={{ uri: vehicleDocs }} style={styles.uploadedImage} /> : (
                <View style={styles.uploadPlaceholder}><Text style={styles.uploadIcon}>📄</Text><Text style={styles.uploadText}>Vehicle Docs</Text></View>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#aaa', flex: 0.45 }]} onPress={() => setStep(1)} disabled={loading}>
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.button, { flex: 0.5 }]} onPress={submitRegistration} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Submit App</Text>}
              </TouchableOpacity>
            </View>
            
            {loading && <Text style={{textAlign: 'center', marginTop: 15, color: '#555', fontStyle: 'italic'}}>Uploading documents to cloud... Please wait.</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', paddingTop: 40 },
  title: { fontSize: 36, fontWeight: 'bold', color: BRAND_COLOR, textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 30, textTransform: 'capitalize', fontWeight: 'bold' },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, color: '#000', elevation: 1 },
  phoneBox: { backgroundColor: '#e8f8f5', padding: 15, borderRadius: 10, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: BRAND_COLOR },
  phoneText: { color: BRAND_COLOR, fontWeight: 'bold', fontSize: 16 },
  button: { backgroundColor: BRAND_COLOR, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  docHelpText: { textAlign: 'center', color: '#777', marginBottom: 20 },
  imageUploadBox: { backgroundColor: 'white', height: 120, borderRadius: 15, marginBottom: 15, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  uploadPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  uploadIcon: { fontSize: 30, marginBottom: 5 },
  uploadText: { color: '#888', fontWeight: 'bold' },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' }
});