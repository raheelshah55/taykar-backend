import { useState, useEffect, useContext, useRef } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert, TextInput, FlatList, Platform, Modal } from 'react-native';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../AuthContext';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

const API_URL = 'https://taykar-backend.onrender.com';
const BRAND_COLOR = '#00D06C';

export default function MainScreen({ route, navigation }) {
  const { user, token, logout } = useContext(AuthContext);
  const isDriverMode = user.activeRole === 'driver';
  
  const [showMenu, setShowMenu] = useState(false);
  const[isOnline, setIsOnline] = useState(false);

  const [pickup, setPickup] = useState('');
  const[dropoff, setDropoff] = useState('');
  const [fare, setFare] = useState('');
  const[vehicleType, setVehicleType] = useState('Car');
  const [currentRide, setCurrentRide] = useState(null);
  const [bids, setBids] = useState(new Array());

  const[availableRides, setAvailableRides] = useState(new Array());
  const [bidInputs, setBidInputs] = useState({});
  const [activeRide, setActiveRide] = useState(null);
  const[appSettings, setAppSettings] = useState(null);
  const [calculatedDistance, setCalculatedDistance] = useState(null);

  const mapRef = useRef(null);
  const [userLoc, setUserLoc] = useState(null);

  // ✨ THE FIX: We use Refs to let Sockets safely read our state without crashing React!
  const isOnlineRef = useRef(isOnline);
  const activeRideRef = useRef(activeRide);
  const currentRideRef = useRef(currentRide);

  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);
  useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);
  useEffect(() => { currentRideRef.current = currentRide; }, [currentRide]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setUserLoc(location.coords);
      }
    })();
  }, new Array());

  const centerMap = () => {
    if (userLoc && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLoc.latitude, longitude: userLoc.longitude,
        latitudeDelta: 0.02, longitudeDelta: 0.02,
      });
    }
  };

  useEffect(() => {
    if (route.params?.selectedPickup && route.params?.selectedDropoff) {
      setPickup(route.params.selectedPickup);
      setDropoff(route.params.selectedDropoff);
      const randomDist = (Math.random() * (15 - 3) + 3).toFixed(1);
      setCalculatedDistance(randomDist);
    }
  }, [route.params]);

  useEffect(() => {
    if (calculatedDistance && appSettings) {
      setFare(getCalculatedFare(vehicleType).toString());
    }
  }, [vehicleType, calculatedDistance, appSettings]);

  useEffect(() => {
    fetchActiveRide();
    axios.get(`${API_URL}/api/admin/settings`).then(res => setAppSettings(res.data)).catch(e => {});

    const socket = io(API_URL, { transports: ['websocket'] });

    // ✨ FIXED SOCKETS: Safely reading Refs instead of double-setting state!
    socket.on('newBidUpdate', (data) => {
      if (currentRideRef.current && currentRideRef.current._id === data.rideId) {
        setBids(data.bids);
      }
    });

    socket.on('newRideRequest', (newRide) => {
      if (isDriverMode && isOnlineRef.current) {
        setAvailableRides((prev) => [newRide, ...prev]);
      }
    });

    socket.on('rideAccepted', (acceptedRide) => {
      setAvailableRides((prev) => prev.filter(r => r._id !== acceptedRide._id));
      fetchActiveRide();
    });

    socket.on('rideCompleted', (completedRide) => {
      if (activeRideRef.current && activeRideRef.current._id === completedRide._id) {
        Alert.alert("Ride Finished!", "You have reached your destination.");
        setActiveRide(null);
        setCurrentRide(null); 
        setPickup(''); 
        setDropoff(''); 
        setFare(''); 
        setCalculatedDistance(null);
        navigation.setParams({ selectedPickup: null, selectedDropoff: null });
      }
    });

    return () => socket.disconnect();
  }, new Array());
const toggleRole = async () => {
    if (activeRide) return Alert.alert("Hold up!", "Cannot switch roles during active ride.");
    
    // ✨ NEW LOGIC: If they want to be a driver, but haven't uploaded CNIC yet!
    if (!isDriverMode && (!user.driverProfile || !user.driverProfile.cnicFront)) {
      setShowMenu(false);
      return navigation.navigate('UpgradeDriver');
    }

    const newRole = isDriverMode ? 'rider' : 'driver';
    try {
      const res = await axios.put(`${API_URL}/api/auth/switch-role`, { newRole }, { headers: { Authorization: `Bearer ${token}` } });
      setToken(res.data.token); setUser(res.data.user); 
      setIsDriverMode(newRole === 'driver');
      setShowMenu(false); setIsOnline(false); 
    } catch (error) { Alert.alert("Error", "Could not switch roles."); }
  };
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
    if (!calculatedDistance || !appSettings) return "...";
    const pricing = appSettings[type] || { baseFare: 100, perKmRate: 30 };
    return Math.round(pricing.baseFare + (calculatedDistance * pricing.perKmRate));
  };

  const requestRide = async () => {
    if (!pickup || !dropoff || !fare) return Alert.alert("Hold up!", "Please fill all fields.");
    try {
      const res = await axios.post(`${API_URL}/api/rides/request`, { pickupLocation: pickup, dropoffLocation: dropoff, offeredFare: Number(fare), vehicleType }, { headers: { Authorization: `Bearer ${token}` } });
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
    setCurrentRide(null); setPickup(''); setDropoff(''); setFare(''); setBids(new Array()); setCalculatedDistance(null);
    navigation.setParams({ selectedPickup: null, selectedDropoff: null });
  };

  return (
    <View style={styles.container}>
      
      {/* 🗺️ MAP - HIDE COMPLETELY IF UNAPPROVED DRIVER! */}
      {!(isDriverMode && !user.driverProfile?.isApproved) && (
        Platform.OS === 'web' ? (
          <View style={styles.mapFallback}><Text>Maps require physical phone</Text></View>
        ) : (
          <MapView 
            ref={mapRef} style={StyleSheet.absoluteFillObject} showsUserLocation={true} 
            initialRegion={{ latitude: 33.9900, longitude: 71.4600, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
          >
            {activeRide && (
              <>
                <Marker coordinate={{ latitude: 34.0086, longitude: 71.4930 }} pinColor="green" />
                <Marker coordinate={{ latitude: 33.9706, longitude: 71.4386 }} pinColor="red" />
                <Polyline coordinates={[{ latitude: 34.0086, longitude: 71.4930 }, { latitude: 33.9706, longitude: 71.4386 }]} strokeColor={BRAND_COLOR} strokeWidth={4} />
              </>
            )}
          </MapView>
        )
      )}

      {/* 🎯 RECENTER MAP BUTTON (Hide if unapproved driver) */}
      {!(isDriverMode && !user.driverProfile?.isApproved) && (
        <TouchableOpacity style={styles.recenterBtn} onPress={centerMap}>
          <Text style={{fontSize: 24}}>🎯</Text>
        </TouchableOpacity>
      )}

      {/* ☰ MENU BUTTON (Always show so they can log out or switch to rider!) */}
      <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>
{/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerName}>Hi, {user?.name || user?.firstName || 'User'}</Text>
        <View style={styles.switchContainer}>
          <Text style={styles.modeText}>{isDriverMode ? '👨‍✈️ Driver' : '🙋‍♂️ Rider'}</Text>
          <Switch value={isDriverMode} onValueChange={toggleRole} trackColor={{ false: '#ccc', true: '#00D06C' }} thumbColor={'#fff'} />
        </View>
      </View>
      <Modal visible={showMenu} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.dropdownMenu}>
           <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Text style={{fontSize: 20, color:'white'}}>
                  {(user?.name || user?.firstName || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.menuName}>{user?.name || user?.firstName || 'User'}</Text>
                <Text style={styles.menuPhone}>{user?.phoneNumber}</Text>
              </View>
            </View>
            <View style={{height: 1, backgroundColor: '#eee', marginVertical: 10}} />
            <Text style={{color: '#888', marginBottom: 10, fontWeight: 'bold'}}>Current Mode: {isDriverMode ? '👨‍✈️ Driver' : '🙋‍♂️ Rider'}</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); navigation.navigate('Profile'); }}>
              <Text style={styles.menuItemText}>👤 My Profile & History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={toggleRole}>
              <Text style={styles.menuItemText}>🔄 Switch to {isDriverMode ? 'Rider' : 'Driver'}</Text>
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

      {/* STATE 1: UNAPPROVED DRIVER */}
      {isDriverMode && !user.driverProfile?.isApproved ? (
        <View style={styles.pendingFullScreen}>
          <Text style={{ fontSize: 80, marginBottom: 20 }}>⏳</Text>
          <Text style={styles.pendingTitle}>Verification in Process</Text>
          <Text style={styles.pendingText}>Your documents are currently being reviewed by the admin.</Text>
          <Text style={styles.pendingText}>You cannot view the map or accept rides until you are verified.</Text>
        </View>
      ) : 

      /* STATE 2: ACTIVE RIDE IN PROGRESS */
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

      /* STATE 3: APPROVED DRIVER FEED */
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

      /* STATE 4: RIDER UI */
      <View style={styles.floatingBottomCard}>
        {!pickup || !dropoff ? (
           <TouchableOpacity style={styles.searchBarFake} onPress={() => navigation.navigate('LocationSearch')}>
             <Text style={styles.searchBarText}>🔍 Where to?</Text>
           </TouchableOpacity>
        ) : !currentRide ? (
          <View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
               <Text style={styles.bigText}>Select Vehicle</Text>
               <TouchableOpacity onPress={resetRiderState}><Text style={{color: 'red', fontWeight: 'bold'}}>Reset</Text></TouchableOpacity>
            </View>

            <View style={styles.vehicleRow}>
              <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Car' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Car')}>
                <Text style={styles.vehicleEmoji}>🚗</Text>
                <Text style={[styles.vehicleText, vehicleType === 'Car' && styles.vehicleTextActive]}>Car</Text>
                <Text style={styles.fareEst}>Rs. {getCalculatedFare('Car')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Bike' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Bike')}>
                <Text style={styles.vehicleEmoji}>🏍️</Text>
                <Text style={[styles.vehicleText, vehicleType === 'Bike' && styles.vehicleTextActive]}>Bike</Text>
                <Text style={styles.fareEst}>Rs. {getCalculatedFare('Bike')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Rickshaw' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Rickshaw')}>
                <Text style={styles.vehicleEmoji}>🛺</Text>
                <Text style={[styles.vehicleText, vehicleType === 'Rickshaw' && styles.vehicleTextActive]}>Rickshaw</Text>
                <Text style={styles.fareEst}>Rs. {getCalculatedFare('Rickshaw')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={{color: '#555', marginBottom: 5, fontWeight: 'bold'}}>Offer your fare (Rs.)</Text>
            <TextInput style={styles.input} value={fare} onChangeText={setFare} keyboardType="numeric" color="#000" />
            
            <TouchableOpacity style={styles.requestButton} onPress={requestRide}>
              <Text style={styles.buttonText}>Find a Driver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.bigText}>Searching for {currentRide.vehicleType}...</Text>
            <Text style={styles.subtitle}>Your Offer: Rs. {currentRide.offeredFare}</Text>
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
  
  // New Styles for Pending Approval
  pendingFullScreen: { flex: 1, backgroundColor: '#f4f6f8', justifyContent: 'center', alignItems: 'center', padding: 30 },
  pendingTitle: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  pendingText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 10, lineHeight: 24 },

  menuButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'white', padding: 12, borderRadius: 30, elevation: 5, zIndex: 10 },
  menuIcon: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  recenterBtn: { position: 'absolute', bottom: 350, right: 20, backgroundColor: 'white', padding: 12, borderRadius: 30, elevation: 5, zIndex: 10 }, 
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
  fareEst: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 5 },
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
  completeBtn: { backgroundColor: BRAND_COLOR, padding: 15, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 15 }
});