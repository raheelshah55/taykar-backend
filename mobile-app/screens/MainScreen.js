import { useState, useEffect, useContext, useRef } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert, TextInput, FlatList, Platform, Modal } from 'react-native';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../AuthContext';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';

const API_URL = 'https://taykar-backend.onrender.com'; // ⚠️ PUT YOUR URL HERE
const GOOGLE_MAPS_APIKEY = 'AIzaSyC7sThLgCleKTbdOkjdyWbISY89AyoxTvY'; // ⚠️ PUT YOUR KEY HERE
const BRAND_COLOR = '#00D06C';

// ✨ NEW: UBER-STYLE CLEAN MAP (Hides businesses/clutter)
const customMapStyle = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
];

export default function MainScreen({ route, navigation }) {
  const { user, token, setUser, setToken, logout } = useContext(AuthContext);
  const isDriverMode = user.activeRole === 'driver';
  
  const[showMenu, setShowMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const isDriverRef = useRef(isDriverMode);
  const isOnlineRef = useRef(isOnline);
  const activeRideRef = useRef(null);
  const currentRideRef = useRef(null);

  useEffect(() => { isDriverRef.current = isDriverMode; }, [isDriverMode]);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  const mapRef = useRef(null);
  const [userLoc, setUserLoc] = useState(null);

  const [pickupObj, setPickupObj] = useState(null);
  const [dropoffObj, setDropoffObj] = useState(null);
  const [fare, setFare] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [currentRide, setCurrentRide] = useState(null);
  const [bids, setBids] = useState([]);
const[driverPosition, setDriverPosition] = useState(null); 
  const[availableRides, setAvailableRides] = useState([]);
  const [bidInputs, setBidInputs] = useState({});
  const [activeRide, setActiveRide] = useState(null);
  const[appSettings, setAppSettings] = useState(null);
  const [calculatedDistance, setCalculatedDistance] = useState(null);

  useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);
  useEffect(() => { currentRideRef.current = currentRide; }, [currentRide]);

  // FETCH LIVE LOCATION FOR RECENTER BUTTON
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLoc(location.coords);
      }
    })();
  },[]);

  const centerMap = () => {
    if (userLoc && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLoc.latitude, longitude: userLoc.longitude,
        latitudeDelta: 0.015, longitudeDelta: 0.015,
      });
    }
  };

  // 1. CATCH EXACT COORDINATES FROM SEARCH SCREEN!
  useEffect(() => {
    if (route.params?.selectedPickup && route.params?.selectedDropoff) {
      setPickupObj(route.params.selectedPickup);
      setDropoffObj(route.params.selectedDropoff);
      
      // ✨ FIX: Deleted Math.random()! 
      // Now it waits for the Blue Google Maps line to calculate the real distance!
      setCalculatedDistance("Calculating..."); 
    }
  }, [route.params]);

  // ✨ 2. SAFE SETTINGS GRABBER ✨
  const getSafeSettings = (type) => {
    if (appSettings && appSettings[type]) return appSettings[type];
    if (type === 'Bike') return { baseFare: 50, perKmRate: 15 };
    if (type === 'Rickshaw') return { baseFare: 80, perKmRate: 25 };
    return { baseFare: 150, perKmRate: 40 };
  };

  // ✨ 3. BULLETPROOF MATH FUNCTION ✨
  const getCalculatedFare = (type) => {
    if (!calculatedDistance || calculatedDistance === "Calculating...") return "...";
    const pricing = getSafeSettings(type);
    return Math.round(pricing.baseFare + (Number(calculatedDistance) * pricing.perKmRate));
  };

  // ✨ 4. AUTO-UPDATE THE FARE BOX ✨
  useEffect(() => {
    if (calculatedDistance && calculatedDistance !== "Calculating...") {
      setFare(getCalculatedFare(vehicleType).toString());
    } else {
      setFare("Calculating...");
    }
  },[vehicleType, calculatedDistance, appSettings]);

  // SOCKETS
  useEffect(() => {
    fetchActiveRide();
    axios.get(`${API_URL}/api/admin/settings`).then(res => setAppSettings(res.data)).catch(e => {});

    const socket = io(API_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      if (isDriverRef.current && isOnlineRef.current) fetchAvailableRides();
    });

    socket.on('newBidUpdate', (data) => {
      setCurrentRide((prev) => {
        if (prev && prev._id === data.rideId) setBids(data.bids);
        return prev;
      });
    });

    socket.on('newRideRequest', (newRide) => {
      if (isDriverRef.current && isOnlineRef.current) {
        setAvailableRides((prev) => [newRide, ...prev]);
      }
    });

    socket.on('driverLocationUpdate', (data) => {
      if (activeRideRef.current && activeRideRef.current._id === data.rideId) {
        setDriverPosition({ latitude: data.latitude, longitude: data.longitude });
      }
    });
    socket.on('rideAccepted', (acceptedRide) => {
      setAvailableRides((prev) => prev.filter(r => r._id !== acceptedRide._id));
      fetchActiveRide();
    });

    socket.on('rideCompleted', (completedRide) => {
      if (activeRideRef.current && activeRideRef.current._id === completedRide._id) {
        Alert.alert("Ride Finished!", "You have reached your destination.");
        resetRiderState();
      }
    });

    return () => socket.disconnect();
  },[]);
// ✨ LIVE GPS TRACKING (DRIVER EMITS, RIDER SEES) ✨
  useEffect(() => {
    let locationWatcher;
    (async () => {
      // Only run this if you are a Driver on an Active Ride!
      if (isDriverMode && activeRide && isOnline) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          locationWatcher = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
            (loc) => {
              if (activeRideRef.current) {
                // Beam the exact coordinates to the backend!
                const tempSocket = io(API_URL, { transports: ['websocket'] });
                tempSocket.emit('driverLocation', {
                  rideId: activeRideRef.current._id,
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude
                });
                setTimeout(() => tempSocket.disconnect(), 1000);
              }
            }
          );
        }
      }
    })();
    return () => { if (locationWatcher) locationWatcher.remove(); };
  },[isDriverMode, activeRide, isOnline]);
  const fetchActiveRide = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/rides/active`, { headers: { Authorization: `Bearer ${token}` } });
      setActiveRide(res.data);
    } catch (error) {}
  };

  const fetchAvailableRides = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/rides/available`, { headers: { Authorization: `Bearer ${token}` } });
      setAvailableRides(res.data);
    } catch (error) {}
  };

  const toggleRole = async () => {
    if (activeRide) return Alert.alert("Hold up!", "Cannot switch roles during active ride.");
    if (!isDriverMode && (!user.driverProfile || !user.driverProfile.cnicFront)) {
      setShowMenu(false);
      return navigation.navigate('UpgradeDriver');
    }
    const newRole = isDriverMode ? 'rider' : 'driver';
    try {
      const res = await axios.put(`${API_URL}/api/auth/switch-role`, { newRole }, { headers: { Authorization: `Bearer ${token}` } });
      setToken(res.data.token); setUser(res.data.user); 
      setIsDriverMode(newRole === 'driver'); setShowMenu(false); setIsOnline(false); 
    } catch (error) { Alert.alert("Error", "Could not switch roles."); }
  };

  const requestRide = async () => {
    if (!pickupObj || !dropoffObj || !fare || fare === "Calculating...") return Alert.alert("Hold up!", "Please wait for fare calculation.");
    try {
      const res = await axios.post(`${API_URL}/api/rides/request`, { pickupLocation: pickupObj.address, dropoffLocation: dropoffObj.address, offeredFare: Number(fare), vehicleType }, { headers: { Authorization: `Bearer ${token}` } });
      setCurrentRide(res.data.ride); setBids([]);
    } catch (error) { Alert.alert("Error", "Could not request ride."); }
  };

  const submitBid = async (rideId) => {
    const offerAmount = bidInputs[rideId];
    if (!offerAmount) return Alert.alert("Error", "Please enter a fare amount.");
    try {
      await axios.post(`${API_URL}/api/rides/${rideId}/bid`, { fare: Number(offerAmount) }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert("Bid Sent!");
    } catch (error) { Alert.alert("Error", "Could not send bid."); }
  };

  const acceptBid = async (bid) => {
    try {
      await axios.put(`${API_URL}/api/rides/${currentRideRef.current._id}/accept`, { driverId: bid.driverId, acceptedFare: bid.fare }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) { Alert.alert("Error", "Could not accept driver."); }
  };

  const completeRide = async () => {
    try {
      await axios.put(`${API_URL}/api/rides/${activeRideRef.current._id}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      resetRiderState();
      if (isOnlineRef.current) fetchAvailableRides();
    } catch (error) { Alert.alert("Error", "Could not complete ride."); }
  };

  const resetRiderState = () => { 
    setCurrentRide(null); 
    setPickupObj(null); 
    setDropoffObj(null); 
    setFare(''); 
    setBids(new Array()); 
    setCalculatedDistance(null);
    setActiveRide(null);
    navigation.setParams({ selectedPickup: null, selectedDropoff: null });
  };

  return (
    <View style={styles.container}>
      {/* 🗺️ BACKGROUND MAP */}
      {Platform.OS === 'web' ? (
        <View style={styles.mapFallback}><Text>Maps require physical phone</Text></View>
      ) : (
        <MapView 
          ref={mapRef} style={StyleSheet.absoluteFillObject} showsUserLocation={true} 
          initialRegion={{ latitude: 33.7294, longitude: 73.0931, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        >
          {!activeRide && pickupObj && dropoffObj && (
            <MapViewDirections
              origin={{ latitude: pickupObj.lat, longitude: pickupObj.lng }}
              destination={{ latitude: dropoffObj.lat, longitude: dropoffObj.lng }}
              apikey={GOOGLE_MAPS_APIKEY} strokeWidth={4} strokeColor={BRAND_COLOR} optimizeWaypoints={true}
              onReady={(result) => {
                mapRef.current.fitToCoordinates(result.coordinates, { edgePadding: { right: 50, bottom: 350, left: 50, top: 100 } });
              }}
            />
          )}
          {!activeRide && pickupObj && <Marker key="p1" coordinate={{ latitude: pickupObj.lat, longitude: pickupObj.lng }} pinColor="green" />}
          {!activeRide && dropoffObj && <Marker key="d1" coordinate={{ latitude: dropoffObj.lat, longitude: dropoffObj.lng }} pinColor="red" />}

          {activeRide && (
            <MapViewDirections
              key={`route-${activeRide._id}`}
              origin={activeRide.pickupLocation} 
              destination={activeRide.dropoffLocation}
              apikey={GOOGLE_MAPS_APIKEY} strokeWidth={4} strokeColor={BRAND_COLOR}
              onReady={(result) => mapRef.current.fitToCoordinates(result.coordinates, { edgePadding: { right: 50, bottom: 350, left: 50, top: 100 } })}
            />
          )}
        </MapView>
      )}

      {/* 🎯 RECENTER MAP BUTTON */}
      <TouchableOpacity style={styles.recenterBtn} onPress={centerMap}>
        <Text style={{fontSize: 24}}>🎯</Text>
      </TouchableOpacity>

      {/* ☰ MENU BUTTON */}
      <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>

      {/* 📲 DROPDOWN MENU MODAL */}
      <Modal visible={showMenu} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.dropdownMenu}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}><Text style={{fontSize: 20, color:'white'}}>{user?.name?.charAt(0)}</Text></View>
              <View>
                <Text style={styles.menuName}>{user.name}</Text>
                <Text style={styles.menuPhone}>{user.phoneNumber}</Text>
              </View>
            </View>
            <View style={{height: 1, backgroundColor: '#eee', marginVertical: 10}} />
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); navigation.navigate('Profile'); }}>
              <Text style={styles.menuItemText}>👤 My Profile & History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); Alert.alert("Appearance", "Dark Mode coming in v2.0"); }}>
              <Text style={styles.menuItemText}>🌙 Appearance (Light/Dark)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); Alert.alert("Language", "Urdu pack downloading..."); }}>
              <Text style={styles.menuItemText}>🌐 Language (English/Urdu)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, {marginTop: 10, borderBottomWidth: 0}]} onPress={logout}>
              <Text style={[styles.menuItemText, {color: 'red'}]}>🚪 Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- UI OVERLAYS --- */}

      {isDriverMode && !user.driverProfile?.isApproved ? (
        <View style={styles.pendingFullScreen}>
          <Text style={{ fontSize: 80, marginBottom: 20 }}>⏳</Text>
          <Text style={styles.pendingTitle}>Verification in Process</Text>
          <Text style={styles.pendingText}>Your documents are currently being reviewed by the admin.</Text>
          <Text style={styles.pendingText}>You cannot view the map or accept rides until you are verified.</Text>
        </View>
      ) : 

      activeRide ? (
        <View style={styles.floatingBottomCard}>
          <Text style={styles.bigText}>Ride in Progress</Text>
          <Text style={styles.subtitle}>Agreed Fare: Rs. {activeRide.acceptedFare}</Text>
          <Text style={styles.infoText}>🟢 Pickup: {activeRide.pickupLocation}</Text>
          <Text style={styles.infoText}>🔴 Dropoff: {activeRide.dropoffLocation}</Text>
          {isDriverMode ? (
            <TouchableOpacity style={styles.completeBtn} onPress={completeRide}>
              <Text style={styles.buttonText}>Finish Ride & Collect Rs. {activeRide.acceptedFare}</Text>
            </TouchableOpacity>
          ) : ( <Text style={styles.emptyText}>Enjoy your ride!</Text> )}
        </View>
      ) : 

      isDriverMode ? (
        <>
          <View style={styles.onlineToggleContainer}>
            <Text style={styles.onlineText}>{isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}</Text>
            <Switch value={isOnline} onValueChange={(val) => { setIsOnline(val); if (val) fetchAvailableRides(); }} trackColor={{ false: '#ccc', true: BRAND_COLOR }} thumbColor={'#fff'} />
          </View>
          {isOnline && (
            <View style={styles.driverFeedCard}>
              <Text style={styles.bigText}>Available Requests</Text>
              {availableRides.length === 0 ? (
                <Text style={styles.emptyText}>No requests nearby...</Text>
              ) : (
                <FlatList
                  data={availableRides}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.rideCard}>
                      <View style={{flexDirection: 'row', justifyContent:'space-between'}}>
                        <Text style={styles.riderName}>🙋‍♂️ {item.rider?.name}</Text>
                        <Text style={styles.vehicleBadge}>{item.vehicleType}</Text>
                      </View>
                      <Text style={styles.locationText}>🟢 {item.pickupLocation}</Text>
                      <Text style={styles.locationText}>🔴 {item.dropoffLocation}</Text>
                      <Text style={styles.offeredFareText}>Offered: Rs. {item.offeredFare}</Text>
                      <View style={styles.bidActionRow}>
                        <TextInput style={styles.bidInput} placeholder="Counter Offer" keyboardType="numeric" color="#000" value={bidInputs[item._id] || ''} onChangeText={(text) => setBidInputs({...bidInputs,[item._id]: text})} />
                        <TouchableOpacity style={styles.submitBidBtn} onPress={() => submitBid(item._id)}>
                          <Text style={styles.buttonText}>Bid</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          )}
        </>
      ) : (
        <View style={styles.floatingBottomCard}>
          {!pickupObj || !dropoffObj ? (
             <TouchableOpacity style={styles.searchBarFake} onPress={() => navigation.navigate('LocationSearch')}>
               <Text style={styles.searchBarText}>🔍 Where to?</Text>
             </TouchableOpacity>
          ) : !currentRide ? (
            <View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                 <Text style={styles.bigText}>Select Vehicle</Text>
                 <TouchableOpacity onPress={resetRiderState}><Text style={{color: 'red', fontWeight: 'bold'}}>Reset</Text></TouchableOpacity>
              </View>

              <Text style={styles.distanceText}>
                {calculatedDistance === "Calculating..." ? "Google is calculating exact distance..." : `Route Distance: ${calculatedDistance} km`}
              </Text>

              <View style={styles.vehicleRow}>
                <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Car' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Car')}>
                  <Text style={styles.vehicleEmoji}>🚗</Text>
                  <Text style={[styles.vehicleText, vehicleType === 'Car' && styles.vehicleTextActive]}>Car</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Bike' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Bike')}>
                  <Text style={styles.vehicleEmoji}>🏍️</Text>
                  <Text style={[styles.vehicleText, vehicleType === 'Bike' && styles.vehicleTextActive]}>Bike</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Rickshaw' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Rickshaw')}>
                  <Text style={styles.vehicleEmoji}>🛺</Text>
                  <Text style={[styles.vehicleText, vehicleType === 'Rickshaw' && styles.vehicleTextActive]}>Rickshaw</Text>
                </TouchableOpacity>
              </View>

              {/* ✨ LOCKED AUTO-FARE TEXTBOX SO RIDERS CANNOT TYPE ✨ */}
              <Text style={{color: '#555', marginBottom: 5, fontWeight: 'bold'}}>Calculated Fare (Rs.)</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: '#e8f8f5', color: '#00D06C' }]} 
                value={fare} 
                editable={false} 
              />
              
              <TouchableOpacity style={styles.requestButton} onPress={requestRide}>
                <Text style={styles.buttonText}>Find a Driver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.waitingContainer}>
              <Text style={styles.bigText}>Searching for {currentRide.vehicleType}...</Text>
              <Text style={styles.subtitle}>Your Fare: Rs. {currentRide.offeredFare}</Text>
              
              <Text style={styles.bidHeader}>Driver Offers ({bids.length})</Text>
              {bids.length === 0 ? (
                <Text style={styles.emptyText}>Waiting for drivers to bid...</Text>
              ) : (
                <View style={{maxHeight: 200, width: '100%'}}>
                  <FlatList data={bids} keyExtractor={(item, index) => index.toString()} renderItem={({ item }) => (
                    <View style={styles.bidCard}>
                      <View><Text style={styles.driverName}>{item.driverName}</Text><Text style={styles.bidFare}>Rs. {item.fare}</Text></View>
                      <TouchableOpacity style={styles.acceptBidButton} onPress={() => acceptBid(item)}><Text style={styles.buttonText}>Accept</Text></TouchableOpacity>
                    </View>
                  )}/>
                </View>
              )}
              <TouchableOpacity style={styles.cancelButton} onPress={resetRiderState}>
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  mapFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ddd' },
  menuButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'white', padding: 12, borderRadius: 30, elevation: 5, zIndex: 10 },
  menuIcon: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  recenterBtn: { position: 'absolute', top: 120, right: 20, backgroundColor: 'white', padding: 12, borderRadius: 30, elevation: 5, zIndex: 10 }, 
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start' },
  dropdownMenu: { backgroundColor: 'white', marginTop: 100, marginHorizontal: 20, padding: 20, borderRadius: 15, elevation: 10 },
  menuHeader: { flexDirection: 'row', alignItems: 'center' },
  menuAvatar: { width: 50, height: 50, backgroundColor: BRAND_COLOR, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuName: { fontSize: 18, fontWeight: 'bold' },
  menuPhone: { color: '#777' },
  menuItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  menuItemText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  onlineToggleContainer: { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, flexDirection: 'row', alignItems: 'center', elevation: 5, zIndex: 10 },
  onlineText: { fontWeight: 'bold', marginRight: 10, fontSize: 16 },
  floatingBottomCard: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 15 },
  driverFeedCard: { position: 'absolute', bottom: 0, width: '100%', height: '50%', backgroundColor: 'white', padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 15 },
  searchBarFake: { backgroundColor: '#f4f6f8', padding: 18, borderRadius: 15, elevation: 2, marginBottom: 10 },
  searchBarText: { fontSize: 20, color: '#777', fontWeight: 'bold' },
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  vehicleBox: { flex: 1, alignItems: 'center', padding: 10, backgroundColor: '#f4f6f8', borderRadius: 10, marginHorizontal: 5, borderWidth: 2, borderColor: 'transparent' },
  vehicleBoxActive: { borderColor: BRAND_COLOR, backgroundColor: '#e8f8f5' },
  vehicleEmoji: { fontSize: 30, marginBottom: 5 },
  vehicleText: { fontWeight: 'bold', color: '#777' },
  vehicleTextActive: { color: BRAND_COLOR },
  bigText: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 10 },
  input: { backgroundColor: '#f4f6f8', padding: 12, borderRadius: 10, marginBottom: 10, fontSize: 18, fontWeight: 'bold', color: '#000' },
  requestButton: { backgroundColor: BRAND_COLOR, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#777', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
  rideCard: { backgroundColor: '#f4f6f8', padding: 15, borderRadius: 15, marginBottom: 15 },
  riderName: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  vehicleBadge: { backgroundColor: BRAND_COLOR, color: 'white', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  locationText: { fontSize: 14, color: '#555', marginBottom: 2 },
  offeredFareText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 5 },
  bidActionRow: { flexDirection: 'row', marginTop: 10 },
  bidInput: { flex: 1, backgroundColor: 'white', padding: 10, borderRadius: 8, marginRight: 10, color: '#000' },
  submitBidBtn: { backgroundColor: BRAND_COLOR, paddingHorizontal: 15, justifyContent: 'center', borderRadius: 8 },
  waitingContainer: { width: '100%', alignItems: 'center' },
  bidHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  bidCard: { width: '100%', backgroundColor: '#f4f6f8', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  driverName: { fontSize: 16, fontWeight: 'bold' },
  bidFare: { fontSize: 16, color: BRAND_COLOR, fontWeight: 'bold' },
  acceptBidButton: { backgroundColor: BRAND_COLOR, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  cancelButton: { marginTop: 15, padding: 15, alignItems: 'center' },
  cancelButtonText: { color: 'red', fontWeight: 'bold', fontSize: 16 },
  infoText: { fontSize: 16, color: '#333', marginBottom: 8, fontWeight: '500' },
  completeBtn: { backgroundColor: BRAND_COLOR, padding: 15, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 15 },
  pendingFullScreen: { flex: 1, backgroundColor: '#f4f6f8', justifyContent: 'center', alignItems: 'center', padding: 30 },
  pendingTitle: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  pendingText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 10, lineHeight: 24 },
  distanceText: { textAlign: 'center', color: '#555', marginBottom: 10, fontStyle: 'italic' },
});