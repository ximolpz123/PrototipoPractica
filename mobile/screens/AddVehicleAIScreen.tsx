import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, AppColors } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { vehicleService } from '../services/vehicle.service';

export default function AddVehicleAIScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  

  const { showAlert } = useAlert();
  
  const [fotos, setFotos] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiDataLoaded, setAiDataLoaded] = useState(false);

  // Formulario
  const [patente, setPatente] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [color, setColor] = useState('');
  const [tipo, setTipo] = useState<'sedan'|'suv'|'pickup'|'van'>('pickup'); // Valores del enum
  const [kilometraje, setKilometraje] = useState('');
  // Guardamos nivel de bencina para el dashboard/referencia
  const [nivelBencina, setNivelBencina] = useState('');

  const handleTomarFoto = async () => {
    if (fotos.length >= 5) {
      return Alert.alert('Límite de fotos', 'Solo puedes subir hasta 5 fotos.');
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permiso denegado', 'Se requiere acceso a la cámara.');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFotos([...fotos, result.assets[0].uri]);
    }
  };

  const handleAnalizarIA = async () => {
    if (fotos.length === 0) {
      return Alert.alert('Faltan fotos', 'Toma al menos una foto del vehículo y/o tablero.');
    }

    setLoadingAI(true);
    try {
      const data = await vehicleService.iaCreate(fotos);
      
      // Auto-rellenar formulario
      if (data.patente) setPatente(data.patente);
      if (data.marca) setMarca(data.marca);
      if (data.kilometraje !== null && data.kilometraje !== undefined) {
        setKilometraje(data.kilometraje.toString());
      }
      if (data.nivelBencina !== null && data.nivelBencina !== undefined) {
        setNivelBencina(data.nivelBencina.toString());
      }

      setAiDataLoaded(true);
      showAlert('Éxito', 'La IA ha extraído los datos exitosamente. Revisa y completa el formulario.');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Hubo un error al procesar las fotos con la IA.';
      const detail = error.response?.data?.detail ? `\nDetalle: ${error.response.data.detail}` : '';
      showAlert('Error de IA', msg + detail);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleGuardar = async () => {
    if (!patente || !marca || !modelo || !anio || !kilometraje) {
      return Alert.alert('Campos incompletos', 'Por favor llena todos los campos obligatorios (Patente, Marca, Modelo, Año, Kilometraje).');
    }

    setSaving(true);
    try {
      await vehicleService.createVehicle({
        placa: patente,
        marca,
        modelo,
        anio: parseInt(anio, 10),
        color: color || 'Blanco',
        tipo,
        estado: 'disponible',
        kilometraje: parseInt(kilometraje, 10),
        nivelBencina: nivelBencina ? parseInt(nivelBencina, 10) : 100,
        tipoIndicador: 'analogico'
      });

      showAlert('Vehículo Creado', `El vehículo patente ${patente} se agregó a la flota exitosamente.`);
      navigation.goBack();
    } catch (error: any) {
      console.error(error);
      showAlert('Error', error.response?.data?.message || 'No se pudo crear el vehículo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Alta de Vehículo con IA 🤖</Text>
        <Text style={styles.subtitle}>
          Toma una foto de la patente (exterior) y otra del tablero (kilometraje). La Inteligencia Artificial hará el resto.
        </Text>
      </View>

      {/* Galeria de Fotos */}
      <View style={styles.fotosContainer}>
        {fotos.map((uri, index) => (
          <View key={index} style={styles.fotoWrapper}>
            <Image source={{ uri }} style={styles.foto} />
            <TouchableOpacity 
              style={styles.deleteFotoBtn} 
              onPress={() => setFotos(fotos.filter((_, i) => i !== index))}
            >
              <Ionicons name="close-circle" size={24} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
        {fotos.length < 5 && (
          <TouchableOpacity style={styles.addFotoBtn} onPress={handleTomarFoto}>
            <Ionicons name="camera" size={32} color={colors.primary} />
            <Text style={styles.addFotoText}>Tomar Foto</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Botón de Analizar */}
      {!aiDataLoaded && (
        <TouchableOpacity
          style={[styles.aiBtn, fotos.length === 0 && styles.btnDisabled]}
          onPress={handleAnalizarIA}
          disabled={loadingAI || fotos.length === 0}
        >
          {loadingAI ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.aiBtnText}>Analizar con Inteligencia Artificial</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Formulario (Visible siempre, pero se rellena con IA) */}
      <View style={[styles.formContainer, aiDataLoaded && styles.formContainerActive]}>
        {aiDataLoaded && (
          <View style={styles.aiSuccessBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.aiSuccessText}>¡Datos extraídos! Revisa y completa los campos vacíos.</Text>
          </View>
        )}

        <Text style={styles.label}>Patente / Placa</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: ABCD12"
          value={patente}
          onChangeText={setPatente}
          autoCapitalize="characters"
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Marca</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Toyota"
              value={marca}
              onChangeText={setMarca}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Modelo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Hilux"
              value={modelo}
              onChangeText={setModelo}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Año</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 2024"
              value={anio}
              onChangeText={setAnio}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Blanco"
              value={color}
              onChangeText={setColor}
            />
          </View>
        </View>

        <Text style={styles.label}>Kilometraje Inicial</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 15000"
          value={kilometraje}
          onChangeText={setKilometraje}
          keyboardType="number-pad"
        />

        {aiDataLoaded && nivelBencina ? (
          <Text style={styles.infoText}>💧 Nivel Bencina detectado: {nivelBencina}%</Text>
        ) : null}

        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.btnDisabled]} 
          onPress={handleGuardar}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar Vehículo</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  subtitle: { fontSize: 14, color: colors.textMuted },
  
  fotosContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  fotoWrapper: { width: 100, height: 100, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  foto: { width: '100%', height: '100%' },
  deleteFotoBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12 },
  
  addFotoBtn: { width: 100, height: 100, borderRadius: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addFotoText: { fontSize: 12, color: colors.primary, marginTop: 5, fontWeight: '600' },

  aiBtn: { backgroundColor: '#8B5CF6', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, gap: 10 },
  aiBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },

  formContainer: { backgroundColor: colors.white, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  formContainerActive: { borderColor: '#8B5CF6', borderWidth: 2 },
  aiSuccessBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success + '15', padding: 10, borderRadius: 8, marginBottom: 15, gap: 8 },
  aiSuccessText: { color: colors.success, fontSize: 13, fontWeight: '600', flex: 1 },

  row: { flexDirection: 'row', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 5 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 15, color: colors.text, marginBottom: 15 },
  
  infoText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginBottom: 15 },

  saveBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});
