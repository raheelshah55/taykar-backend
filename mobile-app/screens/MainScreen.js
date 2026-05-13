import { useState, useEffect, useContext, useRef } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert, TextInput, FlatList, Platform, Modal, Animated, Easing, KeyboardAvoidingView } from 'react-native';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../AuthContext';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons'; // ✨ Added FontAwesome for Stars

const API_URL = 'https://taykar-backend.onrender.com'; // ⚠️ PUT YOUR URL HERE
const GOOGLE_MAPS_APIKEY = 'AIzaSyC7sThLgCleKTbdOkjdyWbISY89AyoxTv'; // ⚠️ PUT YOUR KEY HERE
const BRAND_COLOR = '#00D06C';
const DARK_BG = '#03060A';
const CARD_BG = '#0A121A';

const customMapStyle =[
  { elementType: "geometry", stylers:[{ color: "#0A121A" }] },
  { elementType: "labels.text.stroke", stylers:[{ color: "#0A121A" }] },
  { elementType: "labels.text.fill", stylers:[{ color: "#88929E" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers:[{ color: BRAND_COLOR }] },
  { featureType: "poi", stylers:[{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers:[{ color: "#1a2634" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers:[{ color: "#0A121A" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#03060A" }] },
];

export default function MainScreen({ route, navigation }) {
  const { user, token, setUser, setToken, logout, theme, toggleTheme } = useContext(AuthContext);
  const isDriverMode = user.activeRole === 'driver';
  
  const [showMenu, setShowMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const isDriverRef = useRef(isDriverMode);
  const isOnlineRef = useRef(isOnline);
  const activeRideRef = useRef(null);
  const currentRideRef = useRef(null);

  useEffect(() => { isDriverRef.current = isDriverMode; }, [isDriverMode]);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  const mapRef = useRef(null);
  const [userLoc, setUserLoc] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);

  const [pickupObj, setPickupObj] = useState(null);
  const [dropoffObj, setDropoffObj] = useState(null);
  const [fare, setFare] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [currentRide, setCurrentRide] = useState(null);
  const [bids, setBids] = useState(new Array());

  const [availableRides, setAvailableRides] = useState(new Array());
  const [bidInputs, setBidInputs] = useState({});
  const [activeRide, setActiveRide] = useState(null);
  const [activeRideCoords, setActiveRideCoords] = useState(null);
  const [appSettings, setAppSettings] = useState(null);
  const [calculatedDistance, setCalculatedDistance] = useState(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState(new Array());

  // ✨ NEW: MODAL STATES FOR END OF RIDE ✨
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rideToRate, setRideToRate] = useState(null);
  const [rating, setRating] = useState(0);

  const [showCollectCash, setShowCollectCash] = useState(false);
  const [cashToCollect, setCashToCollect] = useState(0);

  const radarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(radarAnim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true })
    ).start();
  }, new Array());

  const radarScale = radarAnim.interpolate({ inputRange:[0, 1], outputRange: [1, 2] });
  const radarOpacity = radarAnim.interpolate({ inputRange:[0, 1], outputRange: [0.5, 0] });

  useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);
  useEffect(() => { currentRideRef.current = currentRide; }, [currentRide]);

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
      mapRef.current.animateToRegion({ latitude: userLoc.latitude, longitude: userLoc.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 });
    }
  };

  useEffect(() => {
    if (route.params?.selectedPickup && route.params?.selectedDropoff) {
      setPickupObj(route.params.selectedPickup);
      setDropoffObj(route.params.selectedDropoff);
      setCalculatedDistance("Calculating...");
      setTimeout(() => {
        setCalculatedDistance((prev) => {
          if (prev === "Calculating...") return (Math.random() * (15 - 3) + 3).toFixed(1);
          return prev;
        });
      }, 5000);
    }
  }, [route.params]);

  const getSafeSettings = (type) => {
    if (appSettings && appSettings[type]) return appSettings[type];
    if (type === 'Bike') return { baseFare: 50, perKmRate: 15 };
    if (type === 'Rickshaw') return { baseFare: 80, perKmRate: 25 };
    return { baseFare: 150, perKmRate: 40 };
  };

  const getCalculatedFare = (type) => {
    if (!calculatedDistance || calculatedDistance === "Calculating...") return "...";
    const pricing = getSafeSettings(type);
    return Math.round(pricing.baseFare + (Number(calculatedDistance) * pricing.perKmRate));
  };

  useEffect(() => {
    if (calculatedDistance && calculatedDistance !== "Calculating...") setFare(getCalculatedFare(vehicleType).toString());
    else setFare("Calculating...");
  }, [vehicleType, calculatedDistance, appSettings]);

  // --- MAIN SOCKET LISTENER ---
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

    // ✨ NEW: Tells the specific driver they got rejected!
    socket.on(`bidRejected-${user._id}`, () => {
      Alert.alert("Bid Rejected", "The rider declined your offer. You can submit a new bid!");
    });

    // ✨ NEW: Tells the specific driver they WON!
    socket.on(`youWonTheBid-${user._id}`, () => {
      fetchActiveRide();
    });

    socket.on('newRideRequest', (newRide) => {
      if (isDriverRef.current && isOnlineRef.current) setAvailableRides((prev) => [newRide, ...prev]);
    });

   // 1. Tell all other drivers the ride is off the market
    socket.on('rideAcceptedGlobal', (acceptedRide) => {
      setAvailableRides((prev) => prev.filter(r => r._id !== acceptedRide._id));
    });

    // 2. Tell the WINNING driver to transition to the Map!
    socket.on(`youWonTheBid-${user._id}`, () => {
      fetchActiveRide(); 
    });

    // 3. Tell rejected drivers they can try again
    socket.on(`bidRejected-${user._id}`, () => {
      Alert.alert("Bid Rejected", "The rider declined your offer. You can submit a new bid!");
    });

    socket.on('driverLocationUpdate', (data) => {
      if (activeRideRef.current && activeRideRef.current._id === data.rideId) {
        setDriverPosition({ latitude: data.latitude, longitude: data.longitude });
      }
    });

    socket.on('receiveMessage', (msg) => {
      if (activeRideRef.current && activeRideRef.current._id === msg.rideId) {
        setChatMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.disconnect();
  }, new Array());

  // --- ✨ SECOND SOCKET FOR LIVE RIDE STATUS ✨ ---
  useEffect(() => {
    if (!activeRide) return;
    const rideSocket = io(API_URL, { transports: ['websocket'] });

    rideSocket.on(`rideStatusUpdate-${activeRide._id}`, (updatedRide) => {
      if (updatedRide.status === 'completed') {
        if (isDriverMode) {
          // Driver gets Cash Modal
          setCashToCollect(updatedRide.acceptedFare);
          setShowCollectCash(true);
        } else {
          // Rider gets Rating Modal
          setRideToRate(updatedRide);
          setShowRatingModal(true);
        }
        // Don't reset state yet, let the modal closing handle it
        setActiveRide(null);
      } else {
        // Just update the status UI (Arrived, In Progress)
        setActiveRide(updatedRide);
      }
    });

    return () => rideSocket.disconnect();
  }, [activeRide?._id, isDriverMode]);

  useEffect(() => {
    let locationWatcher;
    (async () => {
      if (isDriverMode && activeRide && isOnline) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          locationWatcher = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
            (loc) => {
              if (activeRideRef.current) {
                const tempSocket = io(API_URL, { transports: ['websocket'] });
                tempSocket.emit('driverLocation', { rideId: activeRideRef.current._id, latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                setTimeout(() => tempSocket.disconnect(), 1000);
              }
            }
          );
        }
      }
    })();
    return () => { if (locationWatcher) locationWatcher.remove(); };
  }, [isDriverMode, activeRide, isOnline]);

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
      setShowMenu(false); return navigation.navigate('UpgradeDriver');
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

  // ✨ NEW: REJECT A BID ✨
  const rejectBid = async (driverId) => {
    try {
      await axios.put(`${API_URL}/api/rides/${currentRide._id}/bid/reject`, { driverId }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) { Alert.alert("Error", "Could not reject bid."); }
  };

  const acceptBid = async (bid) => {
    try {
      await axios.put(`${API_URL}/api/rides/${currentRideRef.current._id}/accept`, { 
        driverId: bid.driverId, 
        acceptedFare: bid.fare 
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      // ✨ THE FIX: Instantly fetch the active ride to force the Rider's screen to transition!
      fetchActiveRide(); 

    } catch (error) { Alert.alert("Error", "Could not accept driver."); }
  };
  // ✨ NEW: DRIVER UPDATES STATUS (Arrived, In Progress, Completed) ✨
  const updateRideStatus = async (status) => {
    try {
      await axios.put(`${API_URL}/api/rides/${activeRide._id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      if (status === 'completed') {
         setCashToCollect(activeRide.acceptedFare);
         setShowCollectCash(true);
         setActiveRide(null);
      } else {
         setActiveRide({ ...activeRide, status }); // Local update just to be fast
      }
    } catch (error) { Alert.alert("Error", "Could not update ride status."); }
  };

  // ✨ NEW: SUBMIT RATING ✨
  const submitRating = async () => {
    try {
      await axios.post(`${API_URL}/api/rides/${rideToRate._id}/rate`, { rating }, { headers: { Authorization: `Bearer ${token}` } });
      setShowRatingModal(false);
      setRideToRate(null);
      resetRiderState();
      Alert.alert("Thank You!", "Your feedback helps keep TayKar safe.");
    } catch (error) { Alert.alert("Error", "Could not submit rating."); }
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    const msgData = {
      rideId: activeRide._id, text: chatMessage, senderId: user._id, senderName: user.name || user.firstName,
      time: new Date().toLocaleTimeString(new Array(), { hour: '2-digit', minute: '2-digit' })
    };
    const tempSocket = io(API_URL, { transports: ['websocket'] });
    tempSocket.emit('sendMessage', msgData);
    setChatMessage('');
    setTimeout(() => tempSocket.disconnect(), 1000);
  };

  const resetRiderState = () => { 
    setCurrentRide(null); setPickupObj(null); setDropoffObj(null); setFare(''); setBids(new Array()); setCalculatedDistance(null);
    setActiveRide(null); setActiveRideCoords(null); setDriverPosition(null); setIsChatOpen(false); setChatMessages(new Array());
    navigation.setParams({ selectedPickup: null, selectedDropoff: null });
  };

  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.mapFallback}><Text style={{color: theme.text}}>Maps require physical phone</Text></View>
      ) : (
        <MapView 
          ref={mapRef} style={StyleSheet.absoluteFillObject} showsUserLocation={true} 
          showsMyLocationButton={false} toolbarEnabled={false}
          customMapStyle={theme.isDark ? darkMapStyle : new Array()} 
          initialRegion={{ latitude: 33.7294, longitude: 73.0931, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        >
          {!activeRide && pickupObj && dropoffObj && (
            <MapViewDirections
              origin={{ latitude: pickupObj.lat, longitude: pickupObj.lng }} destination={{ latitude: dropoffObj.lat, longitude: dropoffObj.lng }}
              apikey={GOOGLE_MAPS_APIKEY} strokeWidth={4} strokeColor={BRAND_COLOR} optimizeWaypoints={true}
              onReady={(result) => {
                setCalculatedDistance(result.distance.toFixed(1)); 
                mapRef.current.fitToCoordinates(result.coordinates, { edgePadding: { right: 50, bottom: 400, left: 50, top: 100 } });
              }}
            />
          )}
          {!activeRide && pickupObj && <Marker key="p1" coordinate={{ latitude: pickupObj.lat, longitude: pickupObj.lng }}><View style={styles.customPinGreen}><View style={styles.pinDot} /></View></Marker>}
          {!activeRide && dropoffObj && <Marker key="d1" coordinate={{ latitude: dropoffObj.lat, longitude: dropoffObj.lng }}><View style={styles.customPinRed}><View style={styles.pinDot} /></View></Marker>}

          {activeRide && (
            <MapViewDirections
              key={`route-${activeRide._id}`}
              origin={activeRide.pickupLocation} destination={activeRide.dropoffLocation}
              apikey={GOOGLE_MAPS_APIKEY} strokeWidth={4} strokeColor={BRAND_COLOR}
              onReady={(result) => {
                setActiveRideCoords({ pickup: result.coordinates[0], dropoff: result.coordinates[result.coordinates.length - 1] });
                mapRef.current.fitToCoordinates(result.coordinates, { edgePadding: { right: 50, bottom: 400, left: 50, top: 100 } });
              }}
            />
          )}
          {activeRide && activeRideCoords && (
            <>
              <Marker key="p2" coordinate={activeRideCoords.pickup}><View style={styles.customPinGreen}><View style={styles.pinDot}/></View></Marker>
              <Marker key="d2" coordinate={activeRideCoords.dropoff}><View style={styles.customPinRed}><View style={styles.pinDot}/></View></Marker>
            </>
          )}
          {activeRide && !isDriverMode && driverPosition && (
            <Marker coordinate={driverPosition} anchor={{ x: 0.5, y: 0.5 }}>
              <MaterialCommunityIcons name="car-sports" size={35} color={BRAND_COLOR} style={{ textShadowColor: '#000', textShadowRadius: 10 }} />
            </Marker>
          )}
        </MapView>
      )}

      <TouchableOpacity style={styles.recenterBtn} onPress={centerMap}>
        <MaterialIcons name="my-location" size={24} color={theme.text} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
        <Ionicons name="apps" size={24} color={theme.text} />
      </TouchableOpacity>

      {/* MENU MODAL */}
      <Modal visible={showMenu} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.dropdownMenu}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}><Text style={{fontSize: 22, color: DARK_BG, fontWeight: '900'}}>{user?.name?.charAt(0) || '?'}</Text></View>
              <View>
                <Text style={styles.menuName}>{user?.name}</Text>
                <Text style={styles.menuPhone}>{user?.phoneNumber}</Text>
              </View>
            </View>
            <View style={styles.neonDivider} />
            <Text style={styles.systemStatusText}>SYSTEM: {isDriverMode ? 'DRIVER PROTOCOL' : 'RIDER PROTOCOL'}</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); navigation.navigate('Profile'); }}>
              <Ionicons name="person-outline" size={22} color={theme.text} style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Profile & History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={toggleRole}>
              <Ionicons name="swap-vertical" size={22} color={BRAND_COLOR} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, {color: BRAND_COLOR}]}>Switch to {isDriverMode ? 'Rider' : 'Driver'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleTheme(); setShowMenu(false); }}>
              <Ionicons name={theme.isDark ? "sunny-outline" : "moon-outline"} size={22} color={theme.text} style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Switch to {theme.isDark ? "Light" : "Dark"} Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0, marginTop: 10 }]} onPress={logout}>
              <Ionicons name="power" size={22} color="#ff4757" style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, {color: '#ff4757'}]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CHAT MODAL */}
      <Modal visible={isChatOpen} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatModalContainer}>
          <View style={styles.chatBox}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Secure Comm-Link</Text>
              <TouchableOpacity onPress={() => setIsChatOpen(false)}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
            </View>
            <FlatList
              data={chatMessages} keyExtractor={(item, index) => index.toString()} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}
              renderItem={({ item }) => {
                const isMe = item.senderId === user._id;
                return (
                  <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleThem]}>
                    <Text style={styles.chatSender}>{isMe ? 'You' : item.senderName}</Text>
                    <Text style={styles.chatText}>{item.text}</Text>
                    <Text style={styles.chatTime}>{item.time}</Text>
                  </View>
                );
              }}
            />
            <View style={styles.chatInputRow}>
              <TextInput style={styles.chatInput} value={chatMessage} onChangeText={setChatMessage} placeholder="Type a message..." placeholderTextColor={theme.subText} />
              <TouchableOpacity style={styles.chatSendBtn} onPress={sendChatMessage}><Ionicons name="send" size={20} color="white" /></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ✨ RATING MODAL (RIDER) ✨ */}
      <Modal visible={showRatingModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingTitle}>You arrived!</Text>
            <Text style={styles.ratingSubtitle}>How was your trip with {rideToRate?.driver?.firstName || 'your driver'}?</Text>
            
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <FontAwesome name={star <= rating ? "star" : "star-o"} size={45} color="#f1c40f" style={{ marginHorizontal: 5 }} />
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={[styles.primaryBtn, {marginTop: 20}]} onPress={submitRating} disabled={rating === 0}>
              <Text style={styles.primaryBtnText}>SUBMIT RATING</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✨ COLLECT CASH MODAL (DRIVER) ✨ */}
      <Modal visible={showCollectCash} transparent={true} animationType="slide">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.cashBox}>
            <MaterialCommunityIcons name="cash-multiple" size={80} color={BRAND_COLOR} style={{marginBottom: 10}} />
            <Text style={styles.ratingSubtitle}>Please collect cash from the rider</Text>
            <Text style={styles.cashAmountText}>Rs. {cashToCollect}</Text>
            <TouchableOpacity style={[styles.primaryBtn, {marginTop: 30}]} onPress={() => { setShowCollectCash(false); setCashToCollect(0); resetRiderState(); if (isOnlineRef.current) fetchAvailableRides(); }}>
              <Text style={styles.primaryBtnText}>CASH COLLECTED</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- UI OVERLAYS --- */}

      {isDriverMode && !user.driverProfile?.isApproved ? (
        <View style={styles.pendingFullScreen}>
          <MaterialCommunityIcons name="shield-lock-outline" size={80} color={BRAND_COLOR} style={{marginBottom: 20}} />
          <Text style={styles.pendingTitle}>Clearance Pending</Text>
          <Text style={styles.pendingText}>Your documents are being processed by the TayKar Central Authority.</Text>
        </View>
      ) : 

      activeRide ? (
        <View style={styles.floatingBottomCard}>
          <View style={styles.dragHandle} />
          
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <View>
              <Text style={styles.bigText}>Transit Active</Text>
              {!isDriverMode && activeRide.driver?.driverProfile && (
                <View style={{marginTop: -10, marginBottom: 10}}>
                  <Text style={{color: theme.subText, fontWeight: 'bold'}}>🚗 {activeRide.driver.driverProfile.vehicleInfo}</Text>
                  <Text style={{color: theme.subText, fontWeight: 'bold'}}>🏷️ Plate: {activeRide.driver.driverProfile.licensePlate}</Text>
                </View>
              )}
            </View>
            <Text style={styles.fareHighlight}>Rs. {activeRide.acceptedFare}</Text>
          </View>
          
          <View style={styles.addressBox}>
            <View style={styles.addressRow}><View style={styles.dotGreen} /><Text style={styles.addressText} numberOfLines={1}>{activeRide.pickupLocation}</Text></View>
            <View style={styles.verticalLineSmall} />
            <View style={styles.addressRow}><View style={styles.dotRed} /><Text style={styles.addressText} numberOfLines={1}>{activeRide.dropoffLocation}</Text></View>
          </View>

          <View style={styles.commRow}>
            <TouchableOpacity style={styles.chatBtn} onPress={() => setIsChatOpen(true)}>
              <Ionicons name="chatbubbles" size={20} color={BRAND_COLOR} />
              <Text style={styles.chatBtnText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.callBtn} onPress={() => Alert.alert("Secure Call", "Connecting via Proxy...")}>
              <Ionicons name="call" size={20} color="white" />
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          </View>

          {/* ✨ THE NEW DRIVER LIFECYCLE BUTTONS! ✨ */}
          {isDriverMode ? (
            <>
              {activeRide.status === 'accepted' && (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => updateRideStatus('arrived')}>
                  <Text style={styles.primaryBtnText}>I HAVE ARRIVED</Text>
                </TouchableOpacity>
              )}
              {activeRide.status === 'arrived' && (
                <TouchableOpacity style={[styles.primaryBtn, {backgroundColor: '#3498db', shadowColor: '#3498db'}]} onPress={() => updateRideStatus('in_progress')}>
                  <Text style={styles.primaryBtnText}>START RIDE</Text>
                </TouchableOpacity>
              )}
              {activeRide.status === 'in_progress' && (
                <TouchableOpacity style={[styles.primaryBtn, {backgroundColor: '#ff4757', shadowColor: '#ff4757'}]} onPress={() => updateRideStatus('completed')}>
                  <Text style={styles.primaryBtnText}>END RIDE</Text>
                </TouchableOpacity>
              )}
            </>
          ) : ( 
            <View style={styles.waitingBadge}>
              <Text style={styles.waitingBadgeText}>
                 {activeRide.status === 'accepted' ? 'Driver is on the way' :
                  activeRide.status === 'arrived' ? 'Driver has arrived at pickup!' :
                  'Ride in progress...'}
              </Text>
            </View> 
          )}
        </View>
      ) : 

      isDriverMode ? (
        <>
          <View style={styles.onlineToggleContainer}>
            {isOnline && <Animated.View style={[styles.radarRing, { transform: [{ scale: radarScale }], opacity: radarOpacity }]} />}
            <MaterialCommunityIcons name="radar" size={20} color={isOnline ? BRAND_COLOR : theme.subText} style={{marginRight: 10}} />
            <Text style={[styles.onlineText, { color: isOnline ? (theme.isDark ? 'white' : '#333') : theme.subText }]}>{isOnline ? 'TRANSMITTING' : 'OFFLINE'}</Text>
            <Switch value={isOnline} onValueChange={(val) => { setIsOnline(val); if (val) fetchAvailableRides(); }} trackColor={{ false: theme.border, true: 'rgba(0, 208, 108, 0.4)' }} thumbColor={isOnline ? BRAND_COLOR : '#888'} />
          </View>

          {isOnline && (
            <View style={styles.driverFeedCard}>
              <View style={styles.dragHandle} />
              <Text style={styles.bigText}>Local Broadcasts</Text>
              {availableRides.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="radar-outline" size={50} color={theme.border} />
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
                          <FontAwesome5 name="user-circle" size={18} color={theme.subText} style={{marginRight: 8}} />
                          <Text style={styles.riderName}>{item.rider?.name}</Text>
                        </View>
                        <Text style={styles.offeredFareText}>Rs. {item.offeredFare}</Text>
                      </View>
                      
                      <View style={styles.addressRow}><View style={styles.dotGreen} /><Text style={styles.addressText} numberOfLines={1}>{item.pickupLocation}</Text></View>
                      <View style={styles.addressRow}><View style={styles.dotRed} /><Text style={styles.addressText} numberOfLines={1}>{item.dropoffLocation}</Text></View>
                      
                      <View style={styles.bidActionRow}>
                        <TextInput style={styles.bidInput} placeholder="Counter Offer (Rs.)" keyboardType="numeric" placeholderTextColor={theme.subText} value={bidInputs[item._id] || ''} onChangeText={(text) => setBidInputs({...bidInputs,[item._id]: text})} />
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
             <TouchableOpacity style={styles.searchBarFake} onPress={() => navigation.navigate('LocationSearch', { isDarkMap: theme.isDark })}>
               <Ionicons name="search" size={20} color={theme.subText} style={{marginRight: 10}} />
               <Text style={styles.searchBarText}>Initialize Route...</Text>
             </TouchableOpacity>
          ) : !currentRide ? (
            <View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                 <Text style={styles.bigText}>Select Transport</Text>
                 <TouchableOpacity onPress={resetRiderState}><Text style={{color: '#ff4757', fontWeight: 'bold'}}>ABORT</Text></TouchableOpacity>
              </View>

              <View style={styles.vehicleRow}>
                <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Car' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Car')}>
                  <Ionicons name="car-sport" size={32} color={vehicleType === 'Car' ? BRAND_COLOR : theme.subText} />
                  <Text style={[styles.vehicleText, vehicleType === 'Car' && styles.vehicleTextActive]}>Alpha</Text>
                  <Text style={styles.fareEst}>Rs. {getCalculatedFare('Car')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Bike' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Bike')}>
                  <MaterialCommunityIcons name="motorbike" size={32} color={vehicleType === 'Bike' ? BRAND_COLOR : theme.subText} />
                  <Text style={[styles.vehicleText, vehicleType === 'Bike' && styles.vehicleTextActive]}>Beta</Text>
                  <Text style={styles.fareEst}>Rs. {getCalculatedFare('Bike')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.vehicleBox, vehicleType === 'Rickshaw' && styles.vehicleBoxActive]} onPress={() => setVehicleType('Rickshaw')}>
                  <FontAwesome5 name="car-side" size={28} color={vehicleType === 'Rickshaw' ? BRAND_COLOR : theme.subText} />
                  <Text style={[styles.vehicleText, vehicleType === 'Rickshaw' && styles.vehicleTextActive]}>Delta</Text>
                  <Text style={styles.fareEst}>Rs. {getCalculatedFare('Rickshaw')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.offerBox}>
                <Text style={{color: theme.subText, fontWeight: 'bold', fontSize: 14}}>COMPUTED FARE</Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={{fontSize: 20, fontWeight: 'bold', color: theme.text, marginRight: 5}}>Rs.</Text>
                  <TextInput style={styles.fareInputRaw} value={fare} editable={false} />
                </View>
              </View>
              
              <TouchableOpacity style={styles.primaryBtn} onPress={requestRide}>
                <Text style={styles.primaryBtnText}>BROADCAST REQUEST</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.waitingContainer}>
              <View style={styles.iconWrapper}>
                <Animated.View style={[styles.pulseRing, { transform:[{ scale: radarScale }], opacity: radarOpacity }]} />
                <MaterialCommunityIcons name="radar" size={40} color={BRAND_COLOR} />
              </View>
              <Text style={styles.bigText}>Scanning Network...</Text>
              <Text style={styles.subtitle}>Broadcasting: Rs. {currentRide.offeredFare}</Text>
              
              {bids.length > 0 && <Text style={styles.bidHeader}>INCOMING SIGNALS ({bids.length})</Text>}
              
              <View style={{maxHeight: 200, width: '100%'}}>
                <FlatList data={bids} keyExtractor={(item, index) => index.toString()} renderItem={({ item }) => (
                  <View style={styles.bidCard}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                       <View style={styles.driverAvatar}><Text style={{color: DARK_BG, fontWeight: 'bold'}}>{item.driverName.charAt(0)}</Text></View>
                       <View>
                         <Text style={styles.driverName}>{item.driverName}</Text>
                         <Text style={styles.bidFare}>Rs. {item.fare}</Text>
                       </View>
                    </View>
                    {/* ✨ NEW: REJECT AND ACCEPT BUTTONS! ✨ */}
                    <View style={{flexDirection: 'row', gap: 10}}>
                      <TouchableOpacity style={[styles.acceptBidButton, {backgroundColor: '#ff4757', paddingHorizontal: 12}]} onPress={() => rejectBid(item.driverId)}>
                        <Text style={styles.buttonText}>X</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.acceptBidButton} onPress={() => acceptBid(item)}>
                        <Text style={styles.buttonText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}/>
              </View>
              <TouchableOpacity style={styles.cancelButton} onPress={resetRiderState}>
                <Text style={styles.cancelButtonText}>ABORT MISSION</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  mapFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  
  customPinGreen: { width: 16, height: 16, backgroundColor: 'rgba(0,208,108,0.4)', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.brand, shadowColor: theme.brand, shadowOpacity: 1, shadowRadius: 10 },
  customPinRed: { width: 16, height: 16, backgroundColor: 'rgba(255,71,87,0.4)', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ff4757', shadowColor: '#ff4757', shadowOpacity: 1, shadowRadius: 10 },
  pinDot: { width: 6, height: 6, backgroundColor: theme.isDark ? 'white' : '#333', borderRadius: 3 },

  menuButton: { position: 'absolute', top: 50, left: 20, backgroundColor: theme.card, width: 45, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, zIndex: 10, borderWidth: 1, borderColor: theme.border },
  recenterBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: theme.card, width: 45, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, zIndex: 10, borderWidth: 1, borderColor: theme.border }, 
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }, // For Rating/Cash modals
  dropdownMenu: { backgroundColor: theme.card, marginTop: 100, marginHorizontal: 20, padding: 20, borderRadius: 15, borderWidth: 1, borderColor: theme.border, shadowColor: theme.brand, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  menuHeader: { flexDirection: 'row', alignItems: 'center' },
  menuAvatar: { width: 55, height: 55, backgroundColor: theme.brand, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuName: { fontSize: 20, fontWeight: 'bold', color: theme.text },
  menuPhone: { color: theme.subText, marginTop: 2 },
  neonDivider: { height: 1, backgroundColor: theme.brand, marginVertical: 15, opacity: theme.isDark ? 0.3 : 0.1 },
  systemStatusText: { color: theme.brand, fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
  menuItemIcon: { marginRight: 15 },
  menuItemText: { fontSize: 16, fontWeight: '600', color: theme.text },
  
  onlineToggleContainer: { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: theme.card, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 30, flexDirection: 'row', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, zIndex: 10, borderWidth: 1, borderColor: theme.border },
  onlineText: { fontWeight: '900', marginRight: 12, fontSize: 14, letterSpacing: 1, color: theme.text },
  
  floatingBottomCard: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: theme.card, padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 10, borderTopWidth: theme.isDark ? 2 : 0, borderColor: theme.brand },
  driverFeedCard: { position: 'absolute', bottom: 0, width: '100%', height: '55%', backgroundColor: theme.card, padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 10, borderTopWidth: theme.isDark ? 2 : 0, borderColor: theme.brand },
  dragHandle: { width: 40, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  
  searchBarFake: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.input, padding: 18, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  searchBarText: { fontSize: 18, color: theme.subText, fontWeight: 'bold' },
  
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  vehicleBox: { flex: 1, alignItems: 'center', padding: 15, backgroundColor: theme.input, borderRadius: 12, marginHorizontal: 5, borderWidth: 1, borderColor: theme.border },
  vehicleBoxActive: { borderColor: theme.brand, backgroundColor: 'rgba(0,208,108,0.1)' },
  vehicleText: { fontWeight: 'bold', color: theme.subText, marginTop: 8 },
  vehicleTextActive: { color: theme.text },
  fareEst: { fontSize: 13, fontWeight: '900', color: theme.subText, marginTop: 4 },

  bigText: { fontSize: 24, fontWeight: '900', color: theme.text, marginBottom: 15, letterSpacing: 1 },
  subtitle: { fontSize: 14, color: theme.subText, marginBottom: 10 },
  offerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.input, padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
  fareInputRaw: { fontSize: 24, fontWeight: '900', color: theme.text, minWidth: 80 },
  
  primaryBtn: { backgroundColor: theme.brand, padding: 18, borderRadius: 12, alignItems: 'center', width: '100%', marginTop: 5, shadowColor: theme.brand, shadowOpacity: 0.4, shadowRadius: 10 },
  primaryBtnSmall: { backgroundColor: theme.brand, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  primaryBtnText: { color: 'white', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  
  waitingContainer: { width: '100%', alignItems: 'center' },
  iconWrapper: { justifyContent: 'center', alignItems: 'center', marginBottom: 20, height: 60, width: 60 },
  pulseRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: theme.brand },
  bidHeader: { fontSize: 14, fontWeight: 'bold', color: theme.brand, marginTop: 15, marginBottom: 10, alignSelf: 'flex-start', letterSpacing: 2 },
  emptyStateBox: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5 },
  emptyText: { color: theme.subText, fontWeight: '600', marginTop: 10, letterSpacing: 1 },
  
  rideCard: { backgroundColor: theme.input, padding: 18, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
  rideCardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  riderName: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  vehicleBadge: { backgroundColor: 'rgba(0,208,108,0.1)', color: theme.brand, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, fontSize: 12, fontWeight: '900', overflow: 'hidden' },
  offeredFareText: { fontSize: 22, fontWeight: '900', color: theme.text, marginTop: 15, marginBottom: 5 },
  bidActionRow: { flexDirection: 'row', marginTop: 10 },
  bidInput: { flex: 1, backgroundColor: theme.bg, padding: 10, borderRadius: 8, marginRight: 10, color: theme.text, fontSize: 16, fontWeight: 'bold', borderWidth: 1, borderColor: theme.border },

  bidCard: { backgroundColor: theme.input, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  driverAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.brand, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  driverName: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 2 },
  bidFare: { fontSize: 18, color: theme.brand, fontWeight: '900' },
  acceptBidButton: { backgroundColor: theme.brand, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { marginTop: 20, padding: 15, alignItems: 'center' },
  cancelButtonText: { color: '#ff4757', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  
  addressBox: { backgroundColor: theme.input, padding: 15, borderRadius: 12, marginVertical: 15, borderWidth: 1, borderColor: theme.border },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.brand, marginRight: 10, shadowColor: theme.brand, shadowOpacity: 1, shadowRadius: 5 },
  dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4757', marginRight: 10, shadowColor: '#ff4757', shadowOpacity: 1, shadowRadius: 5 },
  verticalLineSmall: { width: 2, height: 15, backgroundColor: theme.border, marginLeft: 4 },
  addressText: { fontSize: 14, color: theme.subText, fontWeight: '500', flex: 1 },
  fareHighlight: { fontSize: 28, fontWeight: '900', color: theme.brand },
  waitingBadge: { backgroundColor: 'rgba(0,208,108,0.1)', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: 'rgba(0,208,108,0.3)' },
  waitingBadgeText: { color: theme.brand, fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },

  pendingFullScreen: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', padding: 30 },
  pendingTitle: { fontSize: 24, fontWeight: '900', color: theme.text, marginBottom: 10, letterSpacing: 1 },
  pendingText: { fontSize: 14, color: theme.subText, textAlign: 'center', lineHeight: 22 },

  // Chat Styles
  commRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  chatBtn: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,208,108,0.1)', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: 'rgba(0,208,108,0.3)' },
  chatBtnText: { color: BRAND_COLOR, fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  callBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#3498db', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  callBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },

  chatModalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  chatBox: { backgroundColor: theme.card, height: '60%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, borderWidth: 1, borderColor: theme.border },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 15, marginBottom: 10 },
  chatTitle: { fontSize: 20, fontWeight: '900', color: theme.text },
  chatBubble: { maxWidth: '80%', padding: 15, borderRadius: 15, marginBottom: 10 },
  chatBubbleMe: { alignSelf: 'flex-end', backgroundColor: BRAND_COLOR, borderBottomRightRadius: 0 },
  chatBubbleThem: { alignSelf: 'flex-start', backgroundColor: theme.input, borderBottomLeftRadius: 0, borderWidth: 1, borderColor: theme.border },
  chatSender: { fontSize: 10, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', marginBottom: 5 },
  chatText: { fontSize: 16, color: 'white' },
  chatTime: { fontSize: 10, color: 'rgba(255,255,255,0.5)', alignSelf: 'flex-end', marginTop: 5 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  chatInput: { flex: 1, backgroundColor: theme.input, color: theme.text, padding: 15, borderRadius: 25, borderWidth: 1, borderColor: theme.border },
  chatSendBtn: { backgroundColor: BRAND_COLOR, width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

  // New Modals (Rating & Cash)
  ratingBox: { width: '90%', backgroundColor: theme.card, padding: 30, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: theme.brand, shadowColor: theme.brand, shadowOpacity: 0.3, shadowRadius: 20 },
  ratingTitle: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 10 },
  ratingSubtitle: { fontSize: 16, color: theme.subText, textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  
  cashBox: { width: '90%', backgroundColor: theme.card, padding: 40, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: theme.brand },
  cashAmountText: { fontSize: 50, fontWeight: '900', color: theme.brand, marginVertical: 20 }
});