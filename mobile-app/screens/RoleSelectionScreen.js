import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BRAND_COLOR = '#00D06C'; 
const DARK_BG = '#03060A'; 
const CARD_BG = '#0A121A'; 

const { width, height } = Dimensions.get('window');

export default function RoleSelectionScreen({ navigation }) {
  const [typedTitle, setTypedTitle] = useState('');
  const fullTitle = "CHOOSE YOUR ROLE_"; // ✨ NEW RELEVANT TITLE ✨

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const riderCardTranslateX = useRef(new Animated.Value(-width)).current; 
  const driverCardTranslateX = useRef(new Animated.Value(width)).current; 
  
  const laserAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(300,[
      Animated.timing(headerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(riderCardTranslateX, { toValue: 0, friction: 5, tension: 30, useNativeDriver: true }),
      Animated.spring(driverCardTranslateX, { toValue: 0, friction: 5, tension: 30, useNativeDriver: true })
    ]).start();

    Animated.loop(
      Animated.timing(laserAnim, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();

    // ✨ FIXED TYPEWRITER BUG: Safely grabs a chunk of the word instead of guessing letters!
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      currentIndex++;
      setTypedTitle(fullTitle.substring(0, currentIndex));
      if (currentIndex >= fullTitle.length) {
        clearInterval(typingInterval);
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, new Array()); 

  const selectRole = (role) => {
    navigation.navigate('PhoneAuth', { selectedRole: role });
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-height, height] 
  });

  const cardHover = floatAnim.interpolate({
    inputRange:[0, 1],
    outputRange: [0, -10] 
  });

  return (
    <View style={styles.container}>
      
      {/* 🗺️ CYBER-GRID BACKGROUND */}
      <View style={styles.gridContainer}>
        <View style={[styles.gridLine, { left: width * 0.25 }]} />
        <View style={[styles.gridLine, { left: width * 0.5 }]} />
        <View style={[styles.gridLine, { left: width * 0.75 }]} />
        <View style={[styles.gridLineH, { top: height * 0.25 }]} />
        <View style={[styles.gridLineH, { top: height * 0.5 }]} />
        <View style={[styles.gridLineH, { top: height * 0.75 }]} />
      </View>

      {/* 🟢 VERTICAL SCANNING LASER */}
      <Animated.View style={[styles.laserBeam, { transform: [{ translateY: laserTranslateY }] }]} />

      {/* --- HEADER --- */}
      <Animated.View style={[styles.headerContainer, { opacity: headerOpacity }]}>
        {/* ✨ NEW RELEVANT SUBTITLE ✨ */}
        <Text style={styles.systemText}>TAYKAR NETWORK ACTIVE</Text>
        <Text style={styles.title}>{typedTitle}</Text>
      </Animated.View>

      {/* --- RIDER CARD --- */}
      <Animated.View style={{ transform: [{ translateX: riderCardTranslateX }, { translateY: cardHover }], width: '100%', alignItems: 'center' }}>
        <TouchableOpacity style={styles.card} activeOpacity={0.6} onPress={() => selectRole('rider')}>
          
          <View style={styles.iconGlowBox}>
            <MaterialCommunityIcons name="map-marker-path" size={35} color={BRAND_COLOR} />
          </View>
          
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>I need a ride</Text>
            <Text style={styles.cardDesc}>Book a car, bike, or rickshaw.</Text>
          </View>

          <MaterialCommunityIcons name="chevron-right" size={25} color={BRAND_COLOR} />
        </TouchableOpacity>
      </Animated.View>

      {/* --- DRIVER CARD --- */}
      <Animated.View style={{ transform: [{ translateX: driverCardTranslateX }, { translateY: cardHover }], width: '100%', alignItems: 'center' }}>
        <TouchableOpacity style={styles.card} activeOpacity={0.6} onPress={() => selectRole('driver')}>
          
          <View style={styles.iconGlowBox}>
            <MaterialCommunityIcons name="steering" size={35} color={BRAND_COLOR} />
          </View>
          
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>I want to drive</Text>
            <Text style={styles.cardDesc}>Accept rides and earn money.</Text>
          </View>

          <MaterialCommunityIcons name="chevron-right" size={25} color={BRAND_COLOR} />
        </TouchableOpacity>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG, justifyContent: 'center', padding: 20, overflow: 'hidden' },

  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  gridLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: BRAND_COLOR },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: BRAND_COLOR },
  laserBeam: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: BRAND_COLOR, shadowColor: BRAND_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 15, elevation: 15, zIndex: 1 },

  headerContainer: { alignItems: 'center', marginBottom: 60, zIndex: 5 },
  systemText: { color: BRAND_COLOR, fontSize: 13, fontWeight: 'bold', letterSpacing: 3, marginBottom: 10, opacity: 0.9 },
  title: { fontSize: 30, fontWeight: '900', color: 'white', letterSpacing: 2, textShadowColor: BRAND_COLOR, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  
  card: { 
    backgroundColor: CARD_BG, flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 20, marginBottom: 20, width: '95%',
    borderWidth: 1, borderColor: 'rgba(0, 208, 108, 0.3)', 
    shadowColor: BRAND_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 10, zIndex: 5
  },
  iconGlowBox: { backgroundColor: 'rgba(0, 208, 108, 0.08)', width: 65, height: 65, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: 'rgba(0, 208, 108, 0.4)' },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 6, letterSpacing: 0.5 },
  cardDesc: { fontSize: 13, color: '#88929E', fontWeight: '500' }
});