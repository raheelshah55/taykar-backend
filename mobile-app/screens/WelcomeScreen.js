import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BRAND_COLOR = '#00D06C'; 
const DARK_BG = '#050B14';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  // --- ANIMATION ENGINES ---
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const sloganAnim = useRef(new Animated.Value(0)).current;

  const lettersAnim = useRef([
    new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), 
    new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)
  ]).current;

  useEffect(() => {
    // 1. DUAL SONAR PULSE (Fixed Easing.quad)
    const startSonar = (anim) => {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: 3000, easing: Easing.out(Easing.quad), useNativeDriver: true })
      ).start();
    };
    startSonar(ring1Anim);
    setTimeout(() => startSonar(ring2Anim), 1500); 

    // 2. LEVITATING CAR (✨ FIXED: Easing.sin instead of Easing.sine ✨)
    Animated.loop(
      Animated.sequence([
        Animated.timing(hoverAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(hoverAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();

    // 3. STAGGERED LETTER REVEAL
    Animated.stagger(150, 
      lettersAnim.map(anim => 
        Animated.spring(anim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true })
      )
    ).start();

    // 4. SLOGAN GLOW FADE-IN
    Animated.timing(sloganAnim, {
      toValue: 1, duration: 1200, delay: 1800, useNativeDriver: true
    }).start();

  }, new Array()); // Kept safe array!

  // --- CALCULATION HELPERS ---
  const getRingStyle = (anim) => ({
    transform:[{ scale: anim.interpolate({ inputRange: [0, 1], outputRange:[0.5, 3.5] }) }],
    opacity: anim.interpolate({ inputRange:[0, 0.5, 1], outputRange:[1, 0.5, 0] })
  });

  const carHover = hoverAnim.interpolate({ inputRange: [0, 1], outputRange:[0, -12] }); 

  const titleWord = "TAYKAR".split(''); 

  return (
    <View style={styles.container}>
      
      {/* 🗺️ FUTURISTIC CYBER-GRID BACKGROUND */}
      <View style={styles.gridContainer}>
        <View style={[styles.gridLine, { left: width * 0.25 }]} />
        <View style={[styles.gridLine, { left: width * 0.5 }]} />
        <View style={[styles.gridLine, { left: width * 0.75 }]} />
        <View style={[styles.gridLineH, { top: height * 0.25 }]} />
        <View style={[styles.gridLineH, { top: height * 0.5 }]} />
        <View style={[styles.gridLineH, { top: height * 0.75 }]} />
      </View>

      {/* 📡 THE RADAR & LEVITATING ICON */}
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.pulseRing, getRingStyle(ring1Anim)]} />
        <Animated.View style={[styles.pulseRing, getRingStyle(ring2Anim)]} />
        
        <Animated.View style={[styles.iconContainer, { transform: [{ translateY: carHover }] }]}>
          <MaterialCommunityIcons name="car-connected" size={50} color={DARK_BG} />
        </Animated.View>
      </View>

      {/* 🏷️ THE STAGGERED BRAND TEXT */}
      <View style={styles.titleContainer}>
        {titleWord.map((letter, index) => {
          return (
            <Animated.Text 
              key={index} 
              style={[
                styles.titleLetter, 
                { 
                  opacity: lettersAnim[index],
                  transform:[{ 
                    translateY: lettersAnim[index].interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) 
                  }]
                }
              ]}
            >
              {letter}
            </Animated.Text>
          );
        })}
      </View>

      {/* 🌟 GLOWING SLOGAN */}
      <Animated.View style={{ opacity: sloganAnim, alignItems: 'center' }}>
        <Text style={styles.slogan}>Kuch Kam Kar</Text>
        <View style={styles.sloganGlowLine} />
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG, justifyContent: 'center', alignItems: 'center' },
  
  // Cyber Grid Background
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.05 },
  gridLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: BRAND_COLOR },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: BRAND_COLOR },

  // Icon & Sonar Styles
  iconWrapper: { justifyContent: 'center', alignItems: 'center', marginBottom: 50, height: 120, width: 120 },
  pulseRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: BRAND_COLOR },
  iconContainer: { backgroundColor: BRAND_COLOR, width: 85, height: 85, borderRadius: 45, justifyContent: 'center', alignItems: 'center', shadowColor: BRAND_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 15 },

  // Typography Styles
  titleContainer: { flexDirection: 'row', marginBottom: 15 },
  titleLetter: { fontSize: 50, fontWeight: '900', color: 'white', letterSpacing: 4, marginHorizontal: 2, textShadowColor: BRAND_COLOR, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  
  slogan: { fontSize: 18, color: '#A0AAB5', fontStyle: 'italic', fontWeight: '600', letterSpacing: 3 },
  sloganGlowLine: { height: 2, width: 50, backgroundColor: BRAND_COLOR, marginTop: 12, borderRadius: 2, shadowColor: BRAND_COLOR, shadowOpacity: 1, shadowRadius: 10, elevation: 5 }
});