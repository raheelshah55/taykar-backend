import { useState, useEffect, useContext, useRef } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert, TextInput, FlatList, Platform, Modal } from 'react-native';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../AuthContext';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
// ✨ NEW: PROFESSIONAL ICONS INSTEAD OF EMOJIS!
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const API_URL = 'https://taykar-backend.onrender.com'; // ⚠️ PUT YOUR URL HERE
const GOOGLE_MAPS_APIKEY = 'AIzaSyC7sThLgCleKTbdOkjdyWbISY89AyoxTvY'; // ⚠️ PUT YOUR KEY HERE
const BRAND_COLOR = '#00D06C';

// ✨ NEW: UBER-STYLE CLEAN MAP (Hides businesses/clutter)
const customMapStyle = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
];

export default function MainScreen({ route, navigation }) {
  const { user, token, logout } = useContext(AuthContext);
  const isDriverMode = user.activeRole === 'driver';
  
  const [showMenu, setShowMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const isOnlineRef = useRef(isOnline);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  const mapRef = useRef(null);
  const [userLoc, setUserLoc] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLoc(location.coords);
      }
    })();
  }, new Array());

  const centerMap = () => {
    if (userLoc && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLoc.latitude, longitude: userLoc.longitude,
        latitudeDelta: 0.015, longitudeDelta: 0.015,
      });
    }
  };

  const [pickupObj, setPickupObj] = useState(null);
  const [dropoffObj, setDropoffObj] = useState(null);
  const [fare, setFare] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [currentRide, setCurrentRide] = useState(null);
  const [bids, setBids] = useState(new Array());

  const[availableRides, setAvailableRides] = useState(new Array());
  const [bidInputs, setBidInputs] = useState({});
  const [activeRide, setActiveRide] = useState(null);
  const [appSettings, setAppSettings] = useState(null);
  const [calculatedDistance, setCalculatedDistance] = useState(null);

  useEffect(() => {
    if (route.params?.selectedPickup && route.params?.selectedDropoff) {
      setPickupObj(route.params.selectedPickup);
      setDropoffObj(route.params.selectedDropoff);
      setCalculatedDistance("Calculating..."); 
    }
  }, [route.params]);

  useEffect(() => {
    if (calculatedDistance && calculatedDistance !== "Calculating..." && appSettings) {
      setFare(getCalculatedFare(vehicleType).toString());
    }
  },[vehicleType, calculatedDistance, appSettings]);

  useEffect(() => {
    fetchActiveRide();
    axios.get(`${API_URL}/api/admin/settings`).then(res => setAppSettings(res.data)).catch(e => {});

    const socket = io(API_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      if (isDriverMode && isOnlineRef.current) fetchAvailableRides();
    });

    socket.on('newBidUpdate', (data) => {
      setCurrentRide((prev) => {
        if (prev && prev._id === data.rideId) setBids(data.bids);
        return prev;
      });
    });

    socket.on('newRideRequest', (newRide) => {
      if (isDriverMode && isOnlineRef.current) setAvailableRides((prev) =>[newRide, ...prev]);
    });

    socket.on('rideAccepted', (acceptedRide) => {
      setAvailableRides((prev) => prev.filter(r => r._id !== acceptedRide._id));
      fetchActiveRide();
    });

    socket.on('rideCompleted', (completedRide) => {
      setActiveRide((prevActive) => {
        if (prevActive && prevActive._id === completedRide._id) {
          Alert.alert("Ride Finished", "You have reached your destination.");
          setCurrentRide(null); setPickupObj(null); setDropoffObj(null); setFare(''); setCalculatedDistance(null);
          navigation.setParams({ selectedPickup: null, selectedDropoff: null });
          return null; 
        }
        return prevActive;
      });
    });

    return () => socket.disconnect();
  }, new Array());

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

  const getCalculatedFare = (type) => {
    if (!calculatedDistance || calculatedDistance === "Calculating..." || !appSettings) return "...";
    const pricing = appSettings[type] || { baseFare: 100, perKmRate: 30 };
    return Math.round(pricing.baseFare + (Number(calculatedDistance) * pricing.perKmRate));
  };

  const requestRide = async () => {
    if (!pickupObj || !dropoffObj || !fare) return Alert.alert("Hold up!", "Please select locations.");
    try {
      const res = await axios.post(`${API_URL}/api/rides/request`, { pickupLocation: pickupObj.address, dropoffLocation: dropoffObj.address, offeredFare: Number(fare), vehicleType }, { headers: { Authorization: `Bearer ${token}` } });
      setCurrentRide(res.data.ride); setBids(new Array());
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
      await axios.put(`${API_URL}/api/rides/${currentRide._id}/accept`, { driverId: bid.driverId, acceptedFare: bid.fare }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) { Alert.alert("Error", "Could not accept driver."); }
  };

  const completeRide = async () => {
    try {
      await axios.put(`${API_URL}/api/rides/${activeRide._id}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setActiveRide(null);
      if (isOnlineRef.current) fetchAvailableRides();
    } catch (error) { Alert.alert("Error", "Could not complete ride."); }
  };

  const resetRiderState = () => { 
    setCurrentRide(null); setPickupObj(null); setDropoffObj(null); setFare(''); setBids(new Array()); setCalculatedDistance(null);
    navigation.setParams({ selectedPickup: null, selectedDropoff: null });
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.mapFallback}><Text>Maps require physical phone</Text></View>
      ) : (
        <MapView 
          ref={mapRef} style={StyleSheet.absoluteFillObject} showsUserLocation={true} 
          customMapStyle={customMapStyle} // ✨ NEW CLEAN MAP STYLE
          initialRegion={{ latitude: 33.7294, longitude: 73.0931, latitudeDelta: 0.05, longitudeDelta: 0.05 }} // Islamabad center
        >
          {!activeRide && pickupObj && dropoffObj && (
            <Polyline coordinates={[{ latitude: pickupObj.lat, longitude: pickupObj.lng }, { latitude: dropoffObj.lat, longitude: dropoffObj.lng }]} strokeWidth={3} strokeColor="#222" lineDashPattern={[5, 5]} />
          )}
          
          {/* CUSTOM PINS */}
          {!activeRide && pickupObj && (
            <Marker coordinate={{ latitude: pickupObj.lat, longitude: pickupObj.lng }}>
              <View style={styles.customPinGreen}><View style={styles.pinDot} /></View>
            </Marker>
          )}
          {!activeRide && dropoffObj && (
            <Marker coordinate={{ latitude: dropoffObj.lat, longitude: dropoffObj.lng }}>
              <View style={styles.customPinRed}><View style={styles.pinDot} /></View>
            </Marker>
          )}

          {activeRide && (
            <Polyline coordinates={[{ latitude: 33.7294, longitude: 73.0931 }, { latitude: 33.7000, longitude: 73.0500 }]} strokeColor={BRAND_COLOR} strokeWidth={4} />
          )}
        </MapView>
      )}

      {/* 🎯 FLOATING ACTION BUTTONS */}
      <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
        <Ionicons name="menu" size={28} color="#333" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.recenterBtn} onPress={centerMap}>
        <MaterialIcons name="my-location" size={24} color="#333" />
      </TouchableOpacity>

      {/* 📲 PREMIUM DROPDOWN MENU */}
      <Modal visible={showMenu} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.dropdownMenu}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}><Text style={{fontSize: 22, color:'white', fontWeight: 'bold'}}>{user?.name?.charAt(0)}</Text></View>
              <View>
                <Text style={styles.menuName}>{user.name}</Text>
                <Text style={styles.menuPhone}>{user.phoneNumber}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); navigation.navigate('Profile'); }}>
              <Ionicons name="person-outline" size={22} color="#555" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Profile & History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); Alert.alert("Settings", "Appearance coming soon!"); }}>
              <Ionicons name="moon-outline" size={22} color="#555" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Appearance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); Alert.alert("Language", "Urdu pack downloading..."); }}>
              <Ionicons name="globe-outline" size={22} color="#555" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Language</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0, marginTop: 10 }]} onPress={logout}>
              <Ionicons name="log-out-outline" size={22} color="#ff4757" style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, {color: '#ff4757'}]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- UI OVERLAYS --- */}
      {isDriverMode && !user.driverProfile?.isApproved ? (
        <View style={styles.pendingFullScreen}>
          <MaterialIcons name="pending-actions" size={80} color="#bbb" style={{marginBottom: 20}} />
          <Text style={styles.pendingTitle}>Verification Pending</Text>
          <Text style={styles.pendingText}>Your documents are being reviewed by TayKar admins. This usually takes 24 hours.</Text>
        </View>
      ) : 

      activeRide ? (
        <View style={styles.floatingBottomCard}>
          <View style={styles.dragHandle} />
          <Text style={styles.bigText}>Ride in Progress</Text>
          <Text style={styles.fareHighlight}>Rs. {activeRide.acceptedFare}</Text>
          
          <View style={styles.addressBox}>
            <View style={styles.addressRow}>
              <View style={styles.dotGreen} /><Text style={styles.addressText}>{activeRide.pickupLocation}</Text>
            </View>
            <View style={styles.verticalLineSmall} />
            <View style={styles.addressRow}>
              <View style={styles.dotRed} /><Text style={styles.addressText}>{activeRide.dropoffLocation}</Text>
            </View>
          </View>

          {isDriverMode ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={completeRide}>
              <Text style={styles.primaryBtnText}>Finish Ride & Collect Cash</Text>
            </TouchableOpacity>
          ) : ( 
            <View style={styles.waitingBadge}><Text style={styles.waitingBadgeText}>Enjoy your ride!</Text></View> 
          )}
        </View>
      ) : 

      isDriverMode ? (
        <>
          <View style={styles.onlineToggleContainer}>
            <Text style={styles.onlineText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
            <Switch value={isOnline} onValueChange={(val) => { setIsOnline(val); if (val) fetchAvailableRides(); }} trackColor={{ false: '#e0e0e0', true: BRAND_COLOR }} thumbColor={'#fff'} />
          </View>

          {isOnline && (
            <View style={styles.driverFeedCard}>
              <View style={styles.dragHandle} />
              <Text style={styles.bigText}>Ride Requests</Text>
              {availableRides.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="radar-outline" size={50} color="#ddd" />
                  <Text style={styles.emptyText}>Scanning for nearby riders...</Text>
                </View>
              ) : (
                <FlatList
                  data={availableRides}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.rideCard}>
                      <View style={styles.rideCardHeader}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <FontAwesome5 name="user-circle" size={18} color="#777" style={{marginRight: 8}} />
                          <Text style={styles.riderName}>{item.rider?.name}</Text>
                        </View>
                        <Text style={styles.offeredFareText}>Rs. {item.offeredFare}</Text>
                      </View>
                      
                      <View style={styles.addressRow}><View style={styles.dotGreen} /><Text style={styles.addressText} numberOfLines={1}>{item.pickupLocation}</Text></View>
                      <View style={styles.addressRow}><View style={styles.dotRed} /><Text style={styles.addressText} numberOfLines={1}>{item.dropoffLocation}</Text></View>
                      
                      <View style={styles.bidActionRow}>
                        <TextInput style={styles.bidInput} placeholder="Your Offer (Rs.)" keyboardType="numeric" placeholderTextColor="#aaa" value={bidInputs[item._id] || ''} onChangeText={(text) => setBidInputs({...bidInputs,[item._id]: text})} />
                        <TouchableOpacity style={styles.primaryBtnSmall} onPress={() => submitBid(item._id)}>
                          <Text style={styles.primaryBtnText}>Send Bid</Text>
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
          <View style={styles.dragHandle} />
          {!pickupObj || !dropoffObj ? (
             <TouchableOpacity style={styles.searchBarFake} onPress={() => navigation.navigate('LocationSearch')}>
               <Ionicons name="search" size={20} color="#777" style={{marginRight: 10}} />
               <Text style={styles.searchBarText}>Where to?</Text>
             </TouchableOpacity>
          ) : !currentRide ? (
            <View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                 <Text style={styles.bigText}>Choose a ride</Text>
                 <TouchableOpacity onPress={resetRiderState}><Text style={{color: '#ff4757', fontWeight: 'bold'}}>Reset</Text></TouchableOpacity>
              </View>

              <View style={styles.vehicleRow}>
                <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Car' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Car')}>
                  <Ionicons name="car-sport" size={32} color={vehicleType === 'Car' ? BRAND_COLOR : '#555'} />
                  <Text style={[styles.vehicleText, vehicleType === 'Car' && styles.vehicleTextActive]}>Ride</Text>
                  <Text style={styles.fareEst}>Rs. {getCalculatedFare('Car')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Bike' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Bike')}>
                  <MaterialIcons name="two-wheeler" size={32} color={vehicleType === 'Bike' ? BRAND_COLOR : '#555'} />
                  <Text style={[styles.vehicleText, vehicleType === 'Bike' && styles.vehicleTextActive]}>Moto</Text>
                  <Text style={styles.fareEst}>Rs. {getCalculatedFare('Bike')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Rickshaw' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Rickshaw')}>
                  <FontAwesome5 name="car-side" size={28} color={vehicleType === 'Rickshaw' ? BRAND_COLOR : '#555'} />
                  <Text style={[styles.vehicleText, vehicleType === 'Rickshaw' && styles.vehicleTextActive]}>Auto</Text>
                  <Text style={styles.fareEst}>Rs. {getCalculatedFare('Rickshaw')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.offerBox}>
                <Text style={{color: '#777', fontWeight: 'bold', fontSize: 16}}>Offer your fare</Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={{fontSize: 20, fontWeight: 'bold', color: '#333', marginRight: 5}}>Rs.</Text>
                  <TextInput style={styles.fareInputRaw} value={fare} onChangeText={setFare} keyboardType="numeric" />
                </View>
              </View>
              
              <TouchableOpacity style={styles.primaryBtn} onPress={requestRide}>
                <Text style={styles.primaryBtnText}>Find a Driver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="large" color={BRAND_COLOR} style={{marginBottom: 10}} />
              <Text style={styles.bigText}>Looking for drivers...</Text>
              <Text style={styles.subtitle}>Your Offer: Rs. {currentRide.offeredFare}</Text>
              
              {bids.length > 0 && <Text style={styles.bidHeader}>Driver Offers ({bids.length})</Text>}
              
              <View style={{maxHeight: 200, width: '100%'}}>
                <FlatList data={bids} keyExtractor={(item, index) => index.toString()} renderItem={({ item }) => (
                  <View style={styles.bidCard}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                       <FontAwesome5 name="user-circle" size={30} color="#ccc" style={{marginRight: 10}} />
                       <View>
                         <Text style={styles.driverName}>{item.driverName}</Text>
                         <Text style={styles.bidFare}>Rs. {item.fare}</Text>
                       </View>
                    </View>
                    <TouchableOpacity style={styles.primaryBtnSmall} onPress={() => acceptBid(item)}>
                      <Text style={styles.primaryBtnText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                )}/>
              </View>
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
  mapFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef2f5' },
  
  // Custom Map Pins
  customPinGreen: { width: 20, height: 20, backgroundColor: 'rgba(0,208,108,0.3)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#00D06C' },
  customPinRed: { width: 20, height: 20, backgroundColor: 'rgba(255,71,87,0.3)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ff4757' },
  pinDot: { width: 8, height: 8, backgroundColor: '#333', borderRadius: 4 },

  // Floating Buttons
  menuButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'white', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, zIndex: 10 },
  recenterBtn: { position: 'absolute', bottom: '45%', right: 20, backgroundColor: 'white', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, zIndex: 10 }, 
  
  // Dropdown Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start' },
  dropdownMenu: { backgroundColor: 'white', marginTop: 100, marginHorizontal: 20, padding: 20, borderRadius: 20, elevation: 10 },
  menuHeader: { flexDirection: 'row', alignItems: 'center' },
  menuAvatar: { width: 55, height: 55, backgroundColor: BRAND_COLOR, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuName: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  menuPhone: { color: '#777', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  menuItemIcon: { marginRight: 15 },
  menuItemText: { fontSize: 16, fontWeight: '600', color: '#333' },
  
  // Driver Online Toggle
  onlineToggleContainer: { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: 'white', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 30, flexDirection: 'row', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, zIndex: 10 },
  onlineText: { fontWeight: '900', marginRight: 12, fontSize: 14, letterSpacing: 1, color: '#333' },
  
  // Bottom Sheets
  floatingBottomCard: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 10 },
  driverFeedCard: { position: 'absolute', bottom: 0, width: '100%', height: '55%', backgroundColor: 'white', padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 10 },
  dragHandle: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 5, alignSelf: 'center', marginBottom: 20 },
  
  // Rider Search State
  searchBarFake: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5', padding: 18, borderRadius: 15, marginBottom: 10 },
  searchBarText: { fontSize: 20, color: '#888', fontWeight: 'bold' },
  
  // Vehicle Selector
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  vehicleBox: { flex: 1, alignItems: 'center', padding: 15, backgroundColor: '#f8f9fa', borderRadius: 15, marginHorizontal: 5, borderWidth: 2, borderColor: 'transparent' },
  vehicleBoxActive: { borderColor: BRAND_COLOR, backgroundColor: '#eafaf1' },
  vehicleText: { fontWeight: 'bold', color: '#777', marginTop: 8 },
  vehicleTextActive: { color: BRAND_COLOR },
  fareEst: { fontSize: 13, fontWeight: '900', color: '#333', marginTop: 4 },

  // Typography & Layout
  bigText: { fontSize: 24, fontWeight: '900', color: '#111', marginBottom: 15 },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 10 },
  
  // Fare Input
  offerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, marginBottom: 15 },
  fareInputRaw: { fontSize: 24, fontWeight: '900', color: '#111', minWidth: 80 },
  
  // Buttons
  primaryBtn: { backgroundColor: BRAND_COLOR, padding: 18, borderRadius: 15, alignItems: 'center', width: '100%', marginTop: 5 },
  primaryBtnSmall: { backgroundColor: BRAND_COLOR, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, justifyContent: 'center' },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  
  // Bidding & Waiting
  waitingContainer: { width: '100%', alignItems: 'center' },
  bidHeader: { fontSize: 16, fontWeight: 'bold', color: '#777', marginTop: 15, marginBottom: 10, alignSelf: 'flex-start' },
  emptyStateBox: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5 },
  emptyText: { color: '#777', fontWeight: '600', marginTop: 10 },
  
  // Cards
  rideCard: { backgroundColor: '#fff', padding: 18, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  riderName: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  vehicleBadge: { backgroundColor: '#eafaf1', color: BRAND_COLOR, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontWeight: '900', overflow: 'hidden' },
  offeredFareText: { fontSize: 22, fontWeight: '900', color: '#111', marginTop: 15, marginBottom: 5 },
  bidActionRow: { flexDirection: 'row', marginTop: 10 },
  bidInput: { flex: 1, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 10, marginRight: 10, color: '#111', fontSize: 16, fontWeight: 'bold' },

  bidCard: { backgroundColor: '#fff', padding: 15, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  driverName: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 2 },
  bidFare: { fontSize: 18, color: BRAND_COLOR, fontWeight: '900' },
  
  cancelButton: { marginTop: 20, padding: 15, alignItems: 'center' },
  cancelButtonText: { color: '#ff4757', fontWeight: 'bold', fontSize: 16 },
  
  // Active Ride Info
  addressBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, marginVertical: 15 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND_COLOR, marginRight: 10 },
  dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4757', marginRight: 10 },
  verticalLineSmall: { width: 2, height: 15, backgroundColor: '#ddd', marginLeft: 4 },
  addressText: { fontSize: 15, color: '#333', fontWeight: '500', flex: 1 },
  fareHighlight: { fontSize: 32, fontWeight: '900', color: BRAND_COLOR, marginVertical: 5 },
  waitingBadge: { backgroundColor: '#eafaf1', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  waitingBadgeText: { color: BRAND_COLOR, fontWeight: 'bold', fontSize: 16 },

  pendingFullScreen: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', padding: 30 },
  pendingTitle: { fontSize: 24, fontWeight: '900', color: '#222', marginBottom: 10 },
  pendingText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 }
});