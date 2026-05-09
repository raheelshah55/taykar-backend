import { useState, useEffect, useContext, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, Animated, Dimensions } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

// ⚠️ POINTING TO YOUR LIVE TAYKAR CLOUD SERVER!
const API_URL = 'https://taykar-backend.onrender.com';
const BRAND_COLOR = '#00D06C';
const { width, height } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, token, theme } = useContext(AuthContext);
  
  const [history, setHistory] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const[isLoading, setIsLoading] = useState(true);

  // Cinematic fade-in for the dashboard
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rides/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(res.data.history);
        setEarnings(res.data.driverEarnings);
      } catch (error) {
        console.error("Error fetching history");
      }
      setIsLoading(false);
    };
    
    if (token) fetchHistory();
  }, [token]);

  const styles = getStyles(theme);

  const renderHistoryCard = ({ item }) => {
    const wasDriver = item.driver && item.driver._id === user._id;
    const partnerName = wasDriver ? item.rider?.name : item.driver?.name;
    const date = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name={wasDriver ? "steering" : "seat-passenger"} size={14} color={theme.bg} />
            <Text style={styles.roleBadgeText}>{wasDriver ? 'DROVE' : 'RODE'}</Text>
          </View>
          <Text style={styles.dateText}>{date}</Text>
          <Text style={styles.fareText}>Rs. {item.acceptedFare}</Text>
        </View>

        {/* Visual Route Timeline */}
        <View style={styles.routeContainer}>
           <View style={styles.routeTimeline}>
              <View style={styles.dotGreen} />
              <View style={styles.lineVertical} />
              <View style={styles.dotRed} />
           </View>
           <View style={styles.routeTextContainer}>
              <Text style={styles.addressText} numberOfLines={1}>{item.pickupLocation}</Text>
              <Text style={[styles.addressText, {marginTop: 15}]} numberOfLines={1}>{item.dropoffLocation}</Text>
           </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <FontAwesome5 name={item.vehicleType === 'Bike' ? 'motorcycle' : item.vehicleType === 'Rickshaw' ? 'car-side' : 'car-alt'} size={14} color={theme.subText} style={{marginRight: 8}} />
            <Text style={styles.partnerText}>
              {wasDriver ? 'Passenger' : 'Driver'}: <Text style={{color: theme.text, fontWeight: 'bold'}}>{partnerName || 'Unknown'}</Text>
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? 'rgba(0, 208, 108, 0.1)' : 'rgba(241, 196, 15, 0.1)' }]}>
            <Text style={[styles.statusText, { color: item.status === 'completed' ? BRAND_COLOR : '#f1c40f' }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* 🗺️ DYNAMIC CYBER-GRID BACKGROUND */}
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

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.headerTitle}>USER ARCHIVE</Text>

        {/* 🪪 HOLOGRAPHIC ID CARD */}
        <View style={styles.idCard}>
          <View style={styles.avatarGlow}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.idDetails}>
            <Text style={styles.userName}>{user?.name || 'Authorized User'}</Text>
            <Text style={styles.userPhone}>{user?.phoneNumber}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>CLEARANCE: {user?.activeRole?.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* 💳 NEON EARNINGS WALLET (Only for approved drivers who made money!) */}
        {earnings > 0 && user.activeRole === 'driver' && user.driverProfile?.isApproved && (
          <View style={styles.earningsBox}>
            <MaterialCommunityIcons name="wallet-outline" size={35} color={BRAND_COLOR} />
            <View style={{marginLeft: 15}}>
              <Text style={styles.earningsLabel}>SECURED FUNDS</Text>
              <Text style={styles.earningsAmount}>Rs. {earnings}</Text>
            </View>
          </View>
        )}

        {/* 📋 MISSION LOGS (History) */}
        <Text style={styles.sectionTitle}>MISSION LOGS ({history.length})</Text>
        
        {isLoading ? (
          <Text style={styles.emptyText}>Accessing secure records...</Text>
        ) : history.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="folder-hidden" size={50} color={theme.border} />
            <Text style={styles.emptyText}>No missions logged yet.</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={renderHistoryCard}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ✨ DYNAMIC STYLES GENERATOR ✨
const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { flex: 1, padding: 20, paddingTop: 60 },
  
  // Grid
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.05 },
  gridLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: BRAND_COLOR },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: BRAND_COLOR },

  headerTitle: { fontSize: 16, fontWeight: '900', color: BRAND_COLOR, letterSpacing: 4, marginBottom: 20 },

  // ID Card
  idCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, shadowColor: BRAND_COLOR, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, marginBottom: 20 },
  avatarGlow: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0,208,108,0.1)', borderWidth: 1, borderColor: BRAND_COLOR, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  avatarText: { fontSize: 32, fontWeight: '900', color: BRAND_COLOR },
  idDetails: { flex: 1 },
  userName: { fontSize: 22, fontWeight: '900', color: theme.text, letterSpacing: 1, marginBottom: 5 },
  userPhone: { fontSize: 14, color: theme.subText, marginBottom: 10 },
  roleTag: { alignSelf: 'flex-start', backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: '#444' },
  roleTagText: { fontSize: 10, color: '#aaa', fontWeight: 'bold', letterSpacing: 2 },

  // Earnings
  earningsBox: { backgroundColor: 'rgba(0,208,108,0.05)', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,208,108,0.3)', marginBottom: 20 },
  earningsLabel: { fontSize: 12, fontWeight: 'bold', color: theme.subText, letterSpacing: 2 },
  earningsAmount: { fontSize: 32, fontWeight: '900', color: BRAND_COLOR },

  sectionTitle: { fontSize: 14, fontWeight: '900', color: theme.subText, letterSpacing: 2, marginBottom: 15, marginTop: 10 },
  emptyBox: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyText: { textAlign: 'center', color: theme.subText, marginTop: 15, fontStyle: 'italic', fontSize: 16 },

  // History Card
  historyCard: { backgroundColor: theme.card, borderRadius: 15, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  roleBadge: { backgroundColor: theme.text, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { color: theme.bg, fontSize: 12, fontWeight: '900', marginLeft: 5, letterSpacing: 1 },
  dateText: { color: theme.subText, fontSize: 13, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  fareText: { color: BRAND_COLOR, fontSize: 18, fontWeight: '900' },

  routeContainer: { flexDirection: 'row', marginBottom: 15, backgroundColor: theme.bg, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
  routeTimeline: { alignItems: 'center', marginRight: 15 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND_COLOR },
  lineVertical: { width: 2, height: 25, backgroundColor: theme.border, marginVertical: 4 },
  dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4757' },
  routeTextContainer: { flex: 1, justifyContent: 'space-between' },
  addressText: { color: theme.text, fontSize: 14, fontWeight: '500' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 15 },
  partnerText: { color: theme.subText, fontSize: 14 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 }
});