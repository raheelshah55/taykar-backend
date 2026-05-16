import { useState, useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../AuthContext';

const BRAND_COLOR = '#00D06C';

export default function LanguagesScreen({ navigation }) {
  const { theme } = useContext(AuthContext);
  const styles = getStyles(theme);

  // Default to English
  const [selectedLang, setSelectedLang] = useState('English');

  const saveLanguage = () => {
    Alert.alert("System Updated", `Language set to ${selectedLang}. Translations will be applied in v2.0!`);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
          <MaterialCommunityIcons name="chevron-left" size={35} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LANGUAGE</Text>
        <View style={{ width: 35 }} /> 
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Select your preferred interface language:</Text>

        {/* English Option */}
        <TouchableOpacity 
          style={[styles.langCard, selectedLang === 'English' && styles.langCardActive]} 
          onPress={() => setSelectedLang('English')}
        >
          <Text style={[styles.langText, selectedLang === 'English' && {color: BRAND_COLOR}]}>🇬🇧 English</Text>
          {selectedLang === 'English' && <MaterialCommunityIcons name="check-circle" size={24} color={BRAND_COLOR} />}
        </TouchableOpacity>

        {/* Urdu Option */}
        <TouchableOpacity 
          style={[styles.langCard, selectedLang === 'Urdu' && styles.langCardActive]} 
          onPress={() => setSelectedLang('Urdu')}
        >
          <Text style={[styles.langText, selectedLang === 'Urdu' && {color: BRAND_COLOR}]}>🇵🇰 اردو (Urdu)</Text>
          {selectedLang === 'Urdu' && <MaterialCommunityIcons name="check-circle" size={24} color={BRAND_COLOR} />}
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={saveLanguage}>
          <Text style={styles.saveBtnText}>APPLY CHANGES</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: theme.card, borderBottomWidth: 1, borderColor: theme.border },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.text, letterSpacing: 2 },
  
  content: { padding: 20 },
  subtitle: { color: theme.subText, fontSize: 14, marginBottom: 20, fontWeight: 'bold' },
  
  langCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
  langCardActive: { borderColor: BRAND_COLOR, backgroundColor: 'rgba(0,208,108,0.05)' },
  langText: { fontSize: 18, fontWeight: 'bold', color: theme.text },

  saveBtn: { backgroundColor: BRAND_COLOR, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20, shadowColor: BRAND_COLOR, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});