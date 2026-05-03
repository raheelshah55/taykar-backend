import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function RoleSelectionScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to TayKar</Text>
      <Text style={styles.subtitle}>How would you like to use the app today?</Text>

      {/* ⚠️ CHANGED 'role' TO 'selectedRole' SO IT MATCHES THE OTHER SCREENS! */}
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PhoneAuth', { selectedRole: 'rider' })}>
        <Text style={styles.emoji}>🙋‍♂️</Text>
        <Text style={styles.cardText}>I need a ride</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PhoneAuth', { selectedRole: 'driver' })}>
        <Text style={styles.emoji}>👨‍✈️</Text>
        <Text style={styles.cardText}>I want to drive</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#00D06C', marginBottom: 5 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#555', marginBottom: 40 },
  card: { backgroundColor: 'white', padding: 25, borderRadius: 15, marginBottom: 20, alignItems: 'center', elevation: 3, flexDirection: 'row', justifyContent: 'center' },
  emoji: { fontSize: 40, marginRight: 15 },
  cardText: { fontSize: 22, fontWeight: 'bold', color: '#333' }
});