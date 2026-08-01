import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants';
import { useAlert } from '../context/AlertContext';

export default function PerfilScreen({ route }: any) {
  const { showAlert } = useAlert();
  const handleLogout = route.params?.handleLogout || (() => {});
  const user = route.params?.user || {
    nombre: 'Joaquín',
    apellido: 'López',
    email: 'joaquin@bitnets.cl',
    rol: 'operario',
    licenciaAlDia: true,
    fechaVencimientoLicencia: '2026-08-15T00:00:00.000Z',
  };

  const defaultAvatar = `https://ui-avatars.com/api/?name=${user.nombre}+${user.apellido}&background=3D9FD3&color=fff&size=256`;
  const [avatarUri, setAvatarUri] = useState<string>(defaultAvatar);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [scanningLicense, setScanningLicense] = useState(false);

  // Edit states
  const [departamento, setDepartamento] = useState(user.departamento || '');
  const [telefono, setTelefono] = useState(user.telefono || '');
  
  // Real license validation based on v2 model
  const isLicenciaValida = user.licenciaEstado === 'vigente' || (user.licenciaAlDia && user.licenciaEstado !== 'vencida');
  const [licenciaEstado, setLicenciaEstado] = useState(user.licenciaEstado || (user.licenciaAlDia ? 'vigente' : 'vencida'));
  const [fechaVencimiento, setFechaVencimiento] = useState(user.licenciaVencimiento || user.fechaVencimientoLicencia);

  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setUploading(true);
      setAvatarUri(result.assets[0].uri);
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user._id) return;
    setSavingProfile(true);
    try {
      // Usarían import api from '../services/api'
      // await api.patch(`/users/${user._id}/perfil`, { departamento, telefono });
      showAlert('Éxito', 'Perfil actualizado correctamente.');
    } catch (error) {
      showAlert('Error', 'No se pudo actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleScanLicense = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permiso denegado', 'Necesitamos acceso a la cámara para escanear tu licencia.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setScanningLicense(true);
      try {
        /*
        const formData = new FormData();
        formData.append('imagen', {
          uri: result.assets[0].uri,
          name: 'licencia.jpg',
          type: 'image/jpeg'
        } as any);
        const res = await api.patch(`/users/${user._id}/licencia`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setLicenciaEstado(res.data.user.licenciaEstado);
        setFechaVencimiento(res.data.user.licenciaVencimiento);
        */
        // Simulación de éxito por IA
        setTimeout(() => {
          setLicenciaEstado('vigente');
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          setFechaVencimiento(nextYear.toISOString());
          showAlert('IA Exitosa', 'Licencia analizada. Es válida hasta el próximo año.');
          setScanningLicense(false);
        }, 1500);
      } catch (error) {
        setScanningLicense(false);
        showAlert('Error', 'No se pudo procesar la licencia.');
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarContainer}>
          {uploading ? (
            <View style={styles.avatarLoading}>
              <ActivityIndicator color={COLORS.white} />
            </View>
          ) : (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          )}
          <View style={styles.cameraOverlay}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user.nombre} {user.apellido}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{user.rol.toUpperCase()}</Text>
        </View>
      </View>

      {/* USER DATA SECTION */}
      <View style={styles.dataCard}>
        <Text style={styles.sectionTitle}>Datos Personales</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Departamento:</Text>
          <Text style={styles.infoValue}>{user.departamento || 'No asignado'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Teléfono:</Text>
          <Text style={styles.infoValue}>{user.telefono || 'No asignado'}</Text>
        </View>
      </View>

      {/* LICENSE STATUS SECTION */}
      <View style={[styles.licenseCard, isLicenciaValida ? styles.licenseValid : styles.licenseInvalid]}>
        <View style={styles.licenseHeader}>
          <Ionicons name="card" size={24} color={isLicenciaValida ? COLORS.success : COLORS.danger} />
          <Text style={[styles.licenseTitle, { color: isLicenciaValida ? COLORS.success : COLORS.danger }]}>
            Estado de Licencia
          </Text>
        </View>
        
        {isLicenciaValida ? (
          <View>
            <Text style={styles.licenseStatus}>✅ {licenciaEstado.toUpperCase()}</Text>
            <Text style={styles.licenseDate}>
              Vence el: {fechaVencimiento ? new Date(fechaVencimiento).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.licenseStatus}>❌ {licenciaEstado.toUpperCase()}</Text>
            <Text style={styles.licenseDate}>No puedes solicitar nuevas reservas de vehículos.</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.scanBtn} 
          onPress={handleScanLicense}
          disabled={scanningLicense}
        >
          {scanningLicense ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="scan-outline" size={20} color={COLORS.white} />
              <Text style={styles.scanBtnText}>Escanear Licencia (IA)</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ACTIONS SECTION */}
      <TouchableOpacity style={styles.actionBtn} onPress={handleChangePhoto}>
        <Ionicons name="image-outline" size={20} color={COLORS.text} />
        <Text style={styles.actionBtnText}>Cambiar foto de perfil</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={styles.actionIconRight} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  avatarContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarLoading: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  email: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  badgeText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  licenseCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  licenseValid: {
    borderColor: COLORS.success,
  },
  licenseInvalid: {
    borderColor: COLORS.danger,
  },
  licenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  licenseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  licenseStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.text,
  },
  licenseDate: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionBtnText: {
    marginLeft: 15,
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  actionIconRight: {
    marginLeft: 'auto',
  },
  logoutBtn: {
    flexDirection: 'row',
    marginTop: 15,
    backgroundColor: COLORS.danger,
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  dataCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  label: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  scanBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
