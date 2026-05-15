import { useState, useEffect, useContext, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../AuthContext';

const GOOGLE_MAPS_APIKEY = 'AIzaSyA6vt2kalMT_6zW-IW7ZMhpYg0AuGj01Eg'; // ⚠️ PUT YOUR KEY HERE
const BRAND_COLOR = '#00D06C';
const { width, height } = Dimensions.get('window');

const customMapStyle =[
  { elementType: "geometry", stylers:[{ color: "#0A121A" }] },
  { elementType: "labels.text.stroke", stylers:[{ color: "#0A121A" }] },
  { elementType: "labels.text.fill", stylers:[{ color: "#88929E" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: BRAND_COLOR }] },
  { featureType: "poi", stylers:[{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers:[{ color: "#1a2634" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers:[{ color: "#0A121A" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#03060A" }] },
];

export default function LocationSearchScreen({ navigation, route }) {
  const { theme } = useContext(AuthContext);
  const isDarkMap = route.params?.isDarkMap ?? true; 

  const dropoffRef = useRef();

  const [pickupObj, setPickupObj] = useState(null);
  const [dropoffObj, setDropoffObj] = useState(null);
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [pickupText, setPickupText] = useState('Acquiring satellite lock...');

  const [mapMode, setMapMode] = useState(null); 
  const [mapRegion, setMapRegion] = useState({ latitude: 33.6844, longitude: 73.0479, latitudeDelta: 0.01, longitudeDelta: 0.01 });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPickupText('Signal lost - Manual input required');
        setLoadingLoc(false); return;
      }
      try {
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMapRegion({ ...mapRegion, latitude: location.coords.latitude, longitude: location.coords.longitude });
        
        let geocode = await Location.reverseGeocodeAsync({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        if (geocode.length > 0) {
          let address = `${geocode[0].name || geocode[0].street}, ${geocode[0].city}`;
          address = address.replace('undefined, ', '').replace('null, ', '');
          setPickupText(address);
          setPickupObj({ address: address, lat: location.coords.latitude, lng: location.coords.longitude });
        } else {
          setPickupText(`Lat: ${location.coords.latitude.toFixed(4)}, Lng: ${location.coords.longitude.toFixed(4)}`);
        }
      } catch (error) {
        setPickupText('Network failure - Manual input required');
      }
      setLoadingLoc(false);
    })();
  }, new Array());

  useEffect(() => {
    if (!mapMode && dropoffObj && dropoffRef.current) {
      dropoffRef.current.setAddressText(dropoffObj.address);
    }
  }, [mapMode, dropoffObj]);

  const handleContinue = () => {
    if (!pickupObj || !dropoffObj) return Alert.alert("Hold up!", "Please establish both Target and Origin coordinates.");
    navigation.navigate('Main', { selectedPickup: pickupObj, selectedDropoff: dropoffObj });
  };

  const confirmMapLocation = async () => {
    let addressName = `Coordinates Locked`;
    try {
      let geocode = await Location.reverseGeocodeAsync({ latitude: mapRegion.latitude, longitude: mapRegion.longitude });
      if (geocode.length > 0) {
        addressName = `${geocode[0].name || geocode[0].street}, ${geocode[0].city}`;
        addressName = addressName.replace('undefined, ', '').replace('null, ', '');
      }
    } catch(e) {}

    const locObj = { address: addressName, lat: mapRegion.latitude, lng: mapRegion.longitude };
    if (mapMode === 'pickup') { setPickupObj(locObj); setPickupText(addressName); }
    if (mapMode === 'dropoff') { setDropoffObj(locObj); }
    setMapMode(null);
  };

  const styles = getStyles(theme);
  const autoCompleteStyles = getAutoCompleteStyles(theme);

  // --- MAP TARGETING MODE ---
  if (mapMode) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <MapView 
          style={{ flex: 1 }} 
          initialRegion={mapRegion} 
          showsUserLocation={true}
          showsMyLocationButton={false}
          customMapStyle={isDarkMap ? customMapStyle : new Array()} 
          onRegionChangeComplete={(region) => setMapRegion(region)} 
        />
        
        <View style={styles.fixedPinContainer}>
          <MaterialCommunityIcons name="crosshairs-gps" size={60} color={mapMode === 'pickup' ? BRAND_COLOR : '#ff4757'} style={styles.crosshairGlow} />
        </View>

        <View style={styles.mapActionBox}>
          <Text style={styles.mapHelpText}>ALIGN CROSSHAIRS TO ACQUIRE {mapMode.toUpperCase()} TARGET</Text>
          <TouchableOpacity style={styles.continueBtn} onPress={confirmMapLocation}>
            <Text style={styles.continueText}>LOCK COORDINATES</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelMapBtn} onPress={() => setMapMode(null)}>
            <Text style={styles.cancelMapText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- NORMAL SEARCH UI ---
  return (
    // ✨ FIX 1: Replaced ScrollView with KeyboardAvoidingView to stop the crash!
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      
      {theme.isDark && (
        <View style={styles.gridContainer}>
          <View style={[styles.gridLine, { left: width * 0.25 }]} />
          <View style={[styles.gridLine, { left: width * 0.5 }]} />
          <View style={[styles.gridLine, { left: width * 0.75 }]} />
          <View style={[styles.gridLineH, { top: height * 0.25 }]} />
          <View style={[styles.gridLineH, { top: height * 0.5 }]} />
          <View style={[styles.gridLineH, { top: height * 0.75 }]} />
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
          <MaterialCommunityIcons name="chevron-left" size={35} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SET NAVIGATION</Text>
        <View style={{ width: 35 }} /> 
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.dotLine}>
          <View style={styles.dotGreen} />
          <View style={styles.verticalLine} />
          <View style={styles.dotRed} />
        </View>

        <View style={styles.textInputs}>
          
          <View style={[styles.row, { zIndex: 10, elevation: 10, marginTop: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>TARGET LOCATION</Text>
              <GooglePlacesAutocomplete
                ref={dropoffRef}
                placeholder="Where to?"
                placeholderTextColor={theme.subText}
                fetchDetails={true}
                
                // ✨ FIX 2: Added keyboard tap fix directly to Google's internal list!
                keyboardShouldPersistTaps="handled"

                onPress={(data, details = null) => {
                  setDropoffObj({ address: data.description, lat: details.geometry.location.lat, lng: details.geometry.location.lng });
                }}
                query={{ key: GOOGLE_MAPS_APIKEY, components: 'country:pk' }}
                styles={autoCompleteStyles}
                onFail={(error) => Alert.alert("Google API Error", String(error))}
              />
            </View>
            <TouchableOpacity onPress={() => setMapMode('dropoff')} style={styles.mapIconBtn}>
              <MaterialCommunityIcons name="map-marker-radius" size={26} color="#ff4757" />
            </TouchableOpacity>
          </View>

          <View style={[styles.row, { zIndex: 5, elevation: 5, marginTop: 25 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>CURRENT POSITION</Text>
              {loadingLoc ? (
                <View style={[autoCompleteStyles.textInput, { justifyContent: 'center', paddingLeft: 15 }]}>
                  <Text style={{ color: BRAND_COLOR, fontWeight: 'bold' }}>{pickupText}</Text>
                </View>
              ) : (
                <GooglePlacesAutocomplete
                  placeholder={pickupText}
                  placeholderTextColor={BRAND_COLOR}
                  fetchDetails={true}
                  keyboardShouldPersistTaps="handled"
                  onPress={(data, details = null) => {
                    setPickupObj({ address: data.description, lat: details.geometry.location.lat, lng: details.geometry.location.lng });
                  }}
                  query={{ key: GOOGLE_MAPS_APIKEY, components: 'country:pk' }}
                  styles={autoCompleteStyles}
                  onFail={(error) => Alert.alert("Google API Error", String(error))}
                />
              )}
            </View>
            <TouchableOpacity onPress={() => setMapMode('pickup')} style={styles.mapIconBtn}>
              <MaterialCommunityIcons name="map-marker-radius" size={26} color={BRAND_COLOR} />
            </TouchableOpacity>
          </View>

        </View>
      </View>

      <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
        <Text style={styles.continueText}>INITIALIZE ROUTE</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// ✨ DYNAMIC STYLES GENERATOR ✨
const getAutoCompleteStyles = (theme) => ({
  textInputContainer: { backgroundColor: theme.input, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  textInput: { height: 50, color: theme.text, backgroundColor: 'transparent', fontSize: 16, fontWeight: 'bold' },
  predefinedPlacesDescription: { color: BRAND_COLOR },
  listView: { backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginTop: 5, elevation: 15, position: 'absolute', top: 55, width: '100%', zIndex: 100 },
  row: { backgroundColor: theme.card, padding: 13, minHeight: 44, flexDirection: 'row' },
  description: { color: theme.text, fontWeight: '500' },
  separator: { height: 1, backgroundColor: theme.border }
});

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  gridLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: BRAND_COLOR },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: BRAND_COLOR },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'transparent', zIndex: 3 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.text, letterSpacing: 2 },
  backBtn: { fontSize: 30, fontWeight: 'bold', color: theme.text },
  
  inputContainer: { flexDirection: 'row', backgroundColor: 'transparent', margin: 20, zIndex: 10 },
  dotLine: { alignItems: 'center', marginRight: 15, marginTop: 45 },
  verticalLine: { width: 2, height: 90, backgroundColor: theme.border, marginVertical: 8 },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: BRAND_COLOR, shadowColor: BRAND_COLOR, shadowOpacity: 1, shadowRadius: 5 },
  dotRed: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff4757', shadowColor: '#ff4757', shadowOpacity: 1, shadowRadius: 5 },
  
  textInputs: { flex: 1 }, 
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  label: { color: theme.subText, fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  mapIconBtn: { padding: 12, marginLeft: 10, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, elevation: 5, marginTop: 20 },
  
  continueBtn: { backgroundColor: BRAND_COLOR, marginHorizontal: 20, padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20, shadowColor: BRAND_COLOR, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10, zIndex: 1 },
  continueText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  
  // Map Picker Styles
  fixedPinContainer: { position: 'absolute', top: '50%', left: '50%', marginLeft: -30, marginTop: -30, zIndex: 10, alignItems: 'center' },
  crosshairGlow: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 },
  mapActionBox: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: theme.card, padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, borderTopWidth: 2, borderColor: BRAND_COLOR },
  mapHelpText: { textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: theme.subText, marginBottom: 20, letterSpacing: 2 },
  cancelMapBtn: { marginTop: 20, alignItems: 'center' },
  cancelMapText: { color: '#ff4757', fontSize: 14, fontWeight: '900', letterSpacing: 1 }
});