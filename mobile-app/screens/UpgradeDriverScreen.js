import { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import * as ImagePicker from 'expo-image-picker';

// ⚠️ PUT YOUR LIVE RENDER URL & CLOUDINARY DETAILS HERE!
const API_URL = 'https://taykar-backend.onrender.com';
const CLOUD_NAME = 'dgbb1dxxl'; 
const UPLOAD_PRESET = 'ml_default'; 
const BRAND_COLOR = '#00D06C';

export default function UpgradeDriverScreen({ navigation }) {
  const { token, user, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [cnicFront, setCnicFront] = useState(null);
  const[cnicBack, setCnicBack] = useState(null);
  const [vehicleDocs, setVehicleDocs] = useState(null);

  const pickImage = async (setImage) => {
    let result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (result.status !== 'granted') return Alert.alert("Permission Required", "Please allow gallery access.");
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5,
    });
    if (!pickerResult.canceled) setImage(pickerResult.assets[0].uri);
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
    // ✨ THE FIX: Stitch the name together before saving to memory!
      let updatedUser = response.data.user;
      if (!updatedUser.name && updatedUser.firstName) {
        updatedUser.name = `${updatedUser.firstName} ${updatedUser.lastName}`;
      }
      setUser(updatedUser); // Update local memory safely!
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST', body: data, headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' }
      });
      const json = await res.json();
      return json.secure_url;
    } catch (err) { return ''; }
  };

  const submitUpgrade = async () => {
    if (!email || !cnicFront || !cnicBack || !vehicleDocs) {
      return Alert.alert("Required", "Please provide your email and all documents.");
    }
    setLoading(true);
    try {
      const finalCnicFront = await uploadToCloudinary(cnicFront);
      const finalCnicBack = await uploadToCloudinary(cnicBack);
      const finalVehicleDocs = await uploadToCloudinary(vehicleDocs);

      const response = await axios.put(`${API_URL}/api/auth/upload-docs`, {
        email, cnicFront: finalCnicFront, cnicBack: finalCnicBack, vehicleDocs: finalVehicleDocs
      }, { headers: { Authorization: `Bearer ${token}` } });

      setUser(response.data.user); // Update local memory!
      Alert.alert("Documents Submitted!", "An admin will review them shortly.");
      navigation.goBack(); // Send them back to Main Screen
    } catch (error) {
      Alert.alert("Error", "Could not submit documents.");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Become a Driver</Text>
        <Text style={styles.subtitle}>Upload your documents to start earning.</Text>

        <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="#888" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickImage(setCnicFront)}>
          {cnicFront ? <Image source={{ uri: cnicFront }} style={styles.uploadedImage} /> : <Text style={styles.uploadText}>🪪 Upload CNIC (Front)</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickImage(setCnicBack)}>
          {cnicBack ? <Image source={{ uri: cnicBack }} style={styles.uploadedImage} /> : <Text style={styles.uploadText}>🪪 Upload CNIC (Back)</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickImage(setVehicleDocs)}>
          {vehicleDocs ? <Image source={{ uri: vehicleDocs }} style={styles.uploadedImage} /> : <Text style={styles.uploadText}>📄 Upload Vehicle Docs</Text>}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#aaa', flex: 0.45 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { flex: 0.5 }]} onPress={submitUpgrade} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Submit</Text>}
          </TouchableOpacity>
        </View>
        {loading && <Text style={{textAlign: 'center', marginTop: 10, color: '#555'}}>Uploading securely to cloud...</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', paddingTop: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#00D06C', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, color: '#000', elevation: 1 },
  button: { backgroundColor: '#00D06C', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  imageUploadBox: { backgroundColor: 'white', height: 120, borderRadius: 15, marginBottom: 15, justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', overflow: 'hidden' },
  uploadText: { color: '#888', fontWeight: 'bold', fontSize: 16 },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' }
});