import { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../AuthContext';

// ⚠️ POINTING TO YOUR LIVE TAYKAR CLOUD SERVER!
const API_URL = 'https://taykar-backend.onrender.com';
const BRAND_COLOR = '#00D06C';

export default function ProfileScreen() {
  const { user, token, logout } = useContext(AuthContext);
  
  const [history, setHistory] = useState([]);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rides/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(res.data.history);
        setEarnings(res.data.driverEarnings);
      } catch (error) {
        console.error("Error fetching history", error);
      }
    };
    
    if (token) fetchHistory();
  }, [token]);

  return (
    <View style={styles.container}>
      {/* PROFILE HEADER */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0).toUpperCase() : '?'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* EARNINGS CARD */}
      {user.activeRole === 'driver' && user.driverProfile?.isApproved && (
        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Total Driver Earnings</Text>
          <Text style={styles.earningsAmount}>Rs. {earnings}</Text>
        </View>
      )}

      {/* RIDE HISTORY LIST */}
      <Text style={styles.sectionTitle}>Ride History ({history.length})</Text>
      
      {history.length === 0 ? (
        <Text style={styles.emptyText}>You haven't taken any rides yet.</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const wasDriver = item.driver && item.driver._id === user._id;
            return (
              <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.roleBadge}>{wasDriver ? '👨‍✈️ Drove' : '🙋‍♂️ Rode'}</Text>
                  <Text style={styles.fareText}>Rs. {item.acceptedFare}</Text>
                </View>
                
                <Text style={styles.locationText}>🟢 From: {item.pickupLocation}</Text>
                <Text style={styles.locationText}>🔴 To: {item.dropoffLocation}</Text>
                
                <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
                <Text style={styles.partnerText}>
                  {wasDriver ? `Passenger: ${item.rider?.name}` : `Driver: ${item.driver?.name}`}
                </Text>
              </View>
            );
          }}
        />
      )}

      {/* LOGOUT BUTTON */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { backgroundColor: BRAND_COLOR, paddingTop: 60, paddingBottom: 30, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  avatar: { width: 80, height: 80, backgroundColor: 'white', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: BRAND_COLOR },
  userName: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  userEmail: { fontSize: 16, color: '#e8f8f5' },
  earningsCard: { backgroundColor: '#10ac84', margin: 20, padding: 20, borderRadius: 15, alignItems: 'center', elevation: 3 },
  earningsTitle: { color: 'white', fontSize: 16, marginBottom: 5 },
  earningsAmount: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 10, color: '#333' },
  emptyText: { textAlign: 'center', color: '#777', marginTop: 20, fontStyle: 'italic' },
  historyCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 15, padding: 15, borderRadius: 15, elevation: 2 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  roleBadge: { backgroundColor: '#e8f8f5', color: '#00D06C', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, fontWeight: 'bold' },
  fareText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  locationText: { fontSize: 14, color: '#555', marginBottom: 5 },
  partnerText: { fontSize: 14, color: '#888', fontStyle: 'italic' },
  logoutBtn: { margin: 20, padding: 15, backgroundColor: 'white', borderWidth: 2, borderColor: '#ff4757', borderRadius: 10, alignItems: 'center' },
  logoutText: { color: '#ff4757', fontSize: 18, fontWeight: 'bold' }
});