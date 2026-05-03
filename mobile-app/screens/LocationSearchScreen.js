import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import MapView from 'react-native-maps'; // Added Maps for Pin Dropping!

const BRAND_COLOR = '#00D06C';

export default function LocationSearchScreen({ navigation }) {
  const [pickup, setPickup] = useState('Fetching live location...');
  const [dropoff, setDropoff] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(true);

  // --- MAP PIN PICKER STATES ---
  const [mapMode, setMapMode] = useState(null); // 'pickup' or 'dropoff'
  const [mapRegion, setMapRegion] = useState({ latitude: 33.99, longitude: 71.46, latitudeDelta: 0.01, longitudeDelta: 0.01 });

  // Auto-fetch Live GPS Location!
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPickup('Permission denied - Tap to type');
        setLoadingLoc(false);
        return;
      }
      try {
        let location = await Location.getCurrentPositionAsync({});
        setMapRegion({ ...mapRegion, latitude: location.coords.latitude, longitude: location.coords.longitude });
        setPickup(`Lat: ${location.coords.latitude.toFixed(4)}, Lng: ${location.coords.longitude.toFixed(4)}`);
      } catch (error) {
        setPickup('Could not fetch - Tap to type');
      }
      setLoadingLoc(false);
    })();
  },[]);

  const handleContinue = () => {
    if (!dropoff) return Alert.alert("Hold up!", "Please enter your drop-off destination.");
    navigation.navigate('Main', { selectedPickup: pickup, selectedDropoff: dropoff });
  };

  const confirmMapLocation = () => {
    const locString = `Lat: ${mapRegion.latitude.toFixed(4)}, Lng: ${mapRegion.longitude.toFixed(4)}`;
    if (mapMode === 'pickup') setPickup(locString);
    if (mapMode === 'dropoff') setDropoff(locString);
    setMapMode(null); // Close map
  };

  // --- IF MAP MODE IS ACTIVE, SHOW FULL SCREEN MAP PICKER ---
  if (mapMode) {
    return (
      <View style={{ flex: 1 }}>
        <MapView 
          style={{ flex: 1 }} 
          initialRegion={mapRegion} 
          showsUserLocation={true}
          onRegionChangeComplete={(region) => setMapRegion(region)} 
        />
        {/* Fixed Pin in the center of the screen */}
        <View style={styles.fixedPinContainer}>
          <Text style={{ fontSize: 50, marginTop: -50 }}>📍</Text>
        </View>
        <View style={styles.mapActionBox}>
          <Text style={styles.mapHelpText}>Drag map to set {mapMode} location</Text>
          <TouchableOpacity style={styles.continueBtn} onPress={confirmMapLocation}>
            <Text style={styles.continueText}>Confirm Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelMapBtn} onPress={() => setMapMode(null)}>
            <Text style={styles.cancelMapText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- NORMAL TEXT INPUT UI ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Plan your ride</Text>
        <View style={{ width: 30 }} /> 
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.dotLine}>
          <Text style={{color: BRAND_COLOR, fontSize: 18}}>●</Text>
          <View style={styles.verticalLine} />
          <Text style={{color: 'red', fontSize: 18}}>●</Text>
        </View>

        <View style={styles.textInputs}>
          {/* PICKUP ROW */}
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.pickupInput]} value={pickup} onChangeText={setPickup} editable={!loadingLoc} />
            {loadingLoc ? <ActivityIndicator size="small" color={BRAND_COLOR} style={styles.loader} /> : 
              <TouchableOpacity onPress={() => setMapMode('pickup')} style={styles.mapIconBtn}><Text style={{fontSize: 20}}>🗺️</Text></TouchableOpacity>
            }
          </View>
          
          {/* DROPOFF ROW */}
          <View style={styles.row}>
            <TextInput style={styles.input} placeholder="Where to?" placeholderTextColor="#888" value={dropoff} onChangeText={setDropoff} autoFocus />
            <TouchableOpacity onPress={() => setMapMode('dropoff')} style={styles.mapIconBtn}><Text style={{fontSize: 20}}>🗺️</Text></TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', elevation: 2 },
  backBtn: { fontSize: 30, fontWeight: 'bold', color: '#333' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  inputContainer: { flexDirection: 'row', backgroundColor: 'white', margin: 20, padding: 15, borderRadius: 15, elevation: 3 },
  dotLine: { alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  verticalLine: { width: 2, height: 35, backgroundColor: '#ddd', marginVertical: 5 },
  textInputs: { flex: 1, justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  input: { flex: 1, backgroundColor: '#f4f6f8', padding: 12, borderRadius: 8, fontSize: 16, color: '#000' },
  pickupInput: { color: BRAND_COLOR, fontWeight: 'bold', backgroundColor: '#e8f8f5' },
  loader: { position: 'absolute', right: 15 },
  mapIconBtn: { padding: 10, marginLeft: 5, backgroundColor: '#eee', borderRadius: 8 },
  continueBtn: { backgroundColor: BRAND_COLOR, marginHorizontal: 20, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  continueText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  // Map Picker Styles
  fixedPinContainer: { position: 'absolute', top: '50%', left: '50%', marginLeft: -25, marginTop: -25, zIndex: 10 },
  mapActionBox: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10 },
  mapHelpText: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 15 },
  cancelMapBtn: { marginTop: 15, alignItems: 'center' },
  cancelMapText: { color: 'red', fontSize: 16, fontWeight: 'bold' }
});