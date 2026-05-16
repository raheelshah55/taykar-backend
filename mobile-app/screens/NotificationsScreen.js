import { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../AuthContext';
import axios from 'axios';

const API_URL = 'https://taykar-backend.onrender.com'; // ⚠️ RENDER URL
const BRAND_COLOR = '#00D06C';

export default function NotificationsScreen({ navigation }) {
  const { theme, token } = useContext(AuthContext);
  const styles = getStyles(theme);

  const [notifications, setNotifications] = useState(new Array());
  const [loading, setLoading] = useState(true);

  // ✨ NEW: Fetch REAL notifications from the Database!
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
      } catch (error) {
        console.log("Failed to fetch notifications");
      }
      setLoading(false);
    };
    fetchNotifs();
  }, new Array());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
          <MaterialCommunityIcons name="chevron-left" size={35} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOTIFICATIONS LOG</Text>
        <View style={{ width: 35 }} /> 
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={BRAND_COLOR} style={{marginTop: 50}} />
      ) : notifications.length === 0 ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5}}>
            <MaterialCommunityIcons name="bell-sleep" size={50} color={theme.border} />
            <Text style={{color: theme.subText, marginTop: 10}}>No notifications found.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.notificationCard}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="bell-ring" size={24} color={BRAND_COLOR} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.body}</Text>
                <Text style={styles.notifTime}>
                  {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: theme.card, borderBottomWidth: 1, borderColor: theme.border },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.text, letterSpacing: 2 },
  
  notificationCard: { flexDirection: 'row', backgroundColor: theme.card, padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: theme.border, elevation: 2 },
  iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,208,108,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textContainer: { flex: 1, justifyContent: 'center' },
  notifTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 3 },
  notifBody: { color: theme.subText, fontSize: 14, lineHeight: 20 },
  notifTime: { color: BRAND_COLOR, fontSize: 12, fontWeight: 'bold', marginTop: 8 }
});