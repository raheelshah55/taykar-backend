import { useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../AuthContext';

const BRAND_COLOR = '#00D06C';

export default function NotificationsScreen({ navigation }) {
  const { theme } = useContext(AuthContext);
  const styles = getStyles(theme);

  // In a real app, you would fetch this array from the backend. 
  // For now, we simulate the notifications log locally!
  const notifications = [
    { id: '1', title: 'Welcome to TayKar!', body: 'Your account is fully secured and operational.', time: 'Just now', icon: 'shield-check' },
    { id: '2', title: 'Secure Comms Active', body: 'Push notifications are now enabled on your device.', time: '2 mins ago', icon: 'bell-ring' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
          <MaterialCommunityIcons name="chevron-left" size={35} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        <View style={{ width: 35 }} /> 
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={styles.notificationCard}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name={item.icon} size={24} color={BRAND_COLOR} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifBody}>{item.body}</Text>
              <Text style={styles.notifTime}>{item.time}</Text>
            </View>
          </View>
        )}
      />
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