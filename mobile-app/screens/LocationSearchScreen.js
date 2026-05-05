import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const GOOGLE_MAPS_APIKEY = 'AIzaSyC7sThLgCleKTbdOkjdyWbISY89AyoxTvY'; // ⚠️ PUT YOUR GOOGLE KEY HERE!
const BRAND_COLOR = '#00D06C';

export default function LocationSearchScreen({ navigation }) {
  const [pickupObj, setPickupObj] = useState(null);
  const[dropoffObj, setDropoffObj] = useState(null);

  const handleContinue = () => {
    if (!pickupObj || !dropoffObj) return Alert.alert("Hold up!", "Please select both locations from the dropdown list.");
    
    // Pass the exact coordinates AND the text address back to MainScreen!
    navigation.navigate('Main', { 
        selectedPickup: pickupObj, 
        selectedDropoff: dropoffObj 
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Plan your ride</Text>
        <View style={{ width: 30 }} /> 
      </View>

      {/* DROPOFF SEARCH (High zIndex so dropdown list floats above pickup) */}
      <View style={{ flex: 1, padding: 20, zIndex: 2 }}>
        <Text style={styles.label}>🔴 Where to?</Text>
        <GooglePlacesAutocomplete
          placeholder="Search Dropoff Location"
          fetchDetails={true}
          onPress={(data, details = null) => {
            setDropoffObj({ address: data.description, lat: details.geometry.location.lat, lng: details.geometry.location.lng });
          }}
          query={{ key: GOOGLE_MAPS_APIKEY, components: 'country:pk' }} // Restricted to Pakistan for fast results!
          styles={autoCompleteStyles}
        />
      </View>

      {/* PICKUP SEARCH */}
      <View style={{ flex: 1, padding: 20, zIndex: 1, marginTop: -20 }}>
        <Text style={styles.label}>🟢 Pickup from?</Text>
        <GooglePlacesAutocomplete
          placeholder="Search Pickup Location"
          fetchDetails={true}
          onPress={(data, details = null) => {
            setPickupObj({ address: data.description, lat: details.geometry.location.lat, lng: details.geometry.location.lng });
          }}
          query={{ key: GOOGLE_MAPS_APIKEY, components: 'country:pk' }}
          styles={autoCompleteStyles}
        />
      </View>

      <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
        <Text style={styles.continueText}>Confirm Destination</Text>
      </TouchableOpacity>
    </View>
  );
}

const autoCompleteStyles = {
  textInputContainer: { backgroundColor: 'white', borderRadius: 10, elevation: 2 },
  textInput: { height: 50, color: '#000', fontSize: 16, borderRadius: 10 },
  predefinedPlacesDescription: { color: '#1faadb' },
  listView: { backgroundColor: 'white', borderRadius: 10, elevation: 5, position: 'absolute', top: 55, width: '100%', zIndex: 100 }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', elevation: 2, zIndex: 3 },
  backBtn: { fontSize: 30, fontWeight: 'bold', color: '#333' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  continueBtn: { backgroundColor: BRAND_COLOR, margin: 20, padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  continueText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});