import { useState, useContext, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator, Animated, Dimensions, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ⚠️ 1. PUT YOUR LIVE RENDER URL HERE!
const API_URL = 'https://taykar-backend.onrender.com';

// ⚠️ 2. PUT YOUR CLOUDINARY DETAILS HERE!
const CLOUD_NAME = 'dgbb1dxxl'; 
const UPLOAD_PRESET = 'ml_default'; 

const BRAND_COLOR = '#00D06C';
const DARK_BG = '#03060A';
const CARD_BG = '#0A121A';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen({ route, navigation }) {
  const { phone, selectedRole } = route.params;
  const { login } = useContext(AuthContext);
  
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);

  const[firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const[city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const[email, setEmail] = useState('');

  const [cnicFront, setCnicFront] = useState(null);
  const [cnicBack, setCnicBack] = useState(null);
  const[vehicleDocs, setVehicleDocs] = useState(null);

  // --- ANIMATION ENGINES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();
  }, new Array());

  const pickImage = async (setImage) => {
    let result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (result.status !== 'granted') return Alert.alert("Access Denied", "Camera roll access is required.");

    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri);
    }
  };

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
      return json.secure_url; 
    } catch (err) {
      console.error("Cloud Error:", err);
      return '';
    }
  };

  const handleNext = () => {
    if (!firstName || !lastName || !city || !address) return Alert.alert("Hold up!", "Please fill in all basic information.");
    if (selectedRole === 'driver' && !email) return Alert.alert("Email Required", "Drivers must provide an email address.");
    
    if (selectedRole === 'rider') submitRegistration();
    else setStep(2);
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

      if (selectedRole === 'driver') {
        finalCnicFront = await uploadToCloudinary(cnicFront);
        finalCnicBack = await uploadToCloudinary(cnicBack);
        finalVehicleDocs = await uploadToCloudinary(vehicleDocs);
      }

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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      
      {/* 🗺️ CYBER-GRID BACKGROUND */}
      <View style={styles.gridContainer}>
        <View style={[styles.gridLine, { left: width * 0.25 }]} />
        <View style={[styles.gridLine, { left: width * 0.5 }]} />
        <View style={[styles.gridLine, { left: width * 0.75 }]} />
        <View style={[styles.gridLineH, { top: height * 0.25 }]} />
        <View style={[styles.gridLineH, { top: height * 0.5 }]} />
        <View style={[styles.gridLineH, { top: height * 0.75 }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
        
        <Animated.View style={{ opacity: fadeAnim, transform:[{ translateY: slideAnim }] }}>
          
          {/* HEADER */}
          <View style={styles.headerBox}>
            <MaterialCommunityIcons name="account-plus-outline" size={45} color={BRAND_COLOR} style={{ marginBottom: 10 }} />
            <Text style={styles.systemText}>NEW PROTOCOL</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>{step === 1 ? `Join TayKar as a ${selectedRole}` : 'Secure Document Upload'}</Text>
          </View>

          {/* --- STEP 1: BASIC INFO --- */}
          {step === 1 && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={[styles.inputWrapper, { flex: 0.48 }]}>
                  <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#666" value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={[styles.inputWrapper, { flex: 0.48 }]}>
                  <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#666" value={lastName} onChangeText={setLastName} />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="city-variant-outline" size={20} color={BRAND_COLOR} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="City" placeholderTextColor="#666" value={city} onChangeText={setCity} />
              </View>

              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="map-marker-outline" size={20} color={BRAND_COLOR} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Full Address" placeholderTextColor="#666" value={address} onChangeText={setAddress} />
              </View>

              <View style={styles.phoneBox}>
                <MaterialCommunityIcons name="check-decagram" size={20} color={BRAND_COLOR} style={{ marginRight: 10 }} />
                <Text style={styles.phoneText}>{phone} (Verified)</Text>
              </View>

              {selectedRole === 'driver' && (
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="email-outline" size={20} color={BRAND_COLOR} style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="#666" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                </View>
              )}

              <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>{selectedRole === 'driver' ? 'NEXT: UPLOAD DOCS' : 'INITIALIZE ACCOUNT'}</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="white" style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* --- STEP 2: DRIVER DOCUMENTS --- */}
          {step === 2 && selectedRole === 'driver' && (
            <View>
              <Text style={styles.docHelpText}>Provide clear scans of original documents.</Text>

              <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickImage(setCnicFront)}>
                {cnicFront ? <Image source={{ uri: cnicFront }} style={styles.uploadedImage} /> : (
                  <View style={styles.uploadPlaceholder}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={35} color={BRAND_COLOR} style={{marginBottom: 5}}/>
                    <Text style={styles.uploadText}>CNIC (Front)</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickImage(setCnicBack)}>
                {cnicBack ? <Image source={{ uri: cnicBack }} style={styles.uploadedImage} /> : (
                  <View style={styles.uploadPlaceholder}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={35} color={BRAND_COLOR} style={{marginBottom: 5}}/>
                    <Text style={styles.uploadText}>CNIC (Back)</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickImage(setVehicleDocs)}>
                {vehicleDocs ? <Image source={{ uri: vehicleDocs }} style={styles.uploadedImage} /> : (
                  <View style={styles.uploadPlaceholder}>
                    <MaterialCommunityIcons name="file-document-outline" size={35} color={BRAND_COLOR} style={{marginBottom: 5}}/>
                    <Text style={styles.uploadText}>Vehicle Documents</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: CARD_BG, borderColor: '#333', borderWidth: 1, flex: 0.45, elevation: 0 }]} onPress={() => setStep(1)} disabled={loading}>
                  <Text style={[styles.buttonText, { color: '#888' }]}>BACK</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.button, { flex: 0.5 }]} onPress={submitRegistration} disabled={loading}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>SUBMIT</Text>}
                </TouchableOpacity>
              </View>
              
              {loading && <Text style={{textAlign: 'center', marginTop: 15, color: BRAND_COLOR, fontWeight: 'bold'}}>Transmitting securely to cloud...</Text>}
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  
  // Cyber Grid
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  gridLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: BRAND_COLOR },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: BRAND_COLOR },

  headerBox: { marginBottom: 30, alignItems: 'center', marginTop: 40 },
  systemText: { color: BRAND_COLOR, fontSize: 12, fontWeight: 'bold', letterSpacing: 4, marginBottom: 5, opacity: 0.8 },
  title: { fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: 1, textShadowColor: BRAND_COLOR, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#88929E', textTransform: 'capitalize', fontWeight: 'bold' },

  // Inputs
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 12, borderWidth: 1, borderColor: '#222', marginBottom: 15, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: 'white', fontWeight: 'bold' },
  
  // Phone Verified Box
  phoneBox: { flexDirection: 'row', backgroundColor: 'rgba(0, 208, 108, 0.1)', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 208, 108, 0.4)' },
  phoneText: { color: BRAND_COLOR, fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },

  // Buttons
  button: { backgroundColor: BRAND_COLOR, flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: BRAND_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '900', letterSpacing: 1 },

  // Document Uploads
  docHelpText: { textAlign: 'center', color: '#88929E', marginBottom: 20 },
  imageUploadBox: { backgroundColor: CARD_BG, height: 110, borderRadius: 15, marginBottom: 15, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: BRAND_COLOR, borderStyle: 'dashed' },
  uploadPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  uploadText: { color: '#88929E', fontWeight: 'bold', fontSize: 14 },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' }
});