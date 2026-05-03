import { StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.slogan}>Kuch Kam Kar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#00D06C', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  slogan: { 
    fontSize: 45, 
    color: '#fff', 
    fontStyle: 'italic', 
    fontWeight: 'bold', 
    fontFamily: 'serif', // Stylish font
    textAlign: 'center',
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0,0,0,0.3)', 
    textShadowOffset: { width: 2, height: 2 }, 
    textShadowRadius: 5 
  }
});