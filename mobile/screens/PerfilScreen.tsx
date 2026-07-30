import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
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

  const isLicenciaValida = user.licenciaAlDia;

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
      // Actualizamos la foto localmente (en un prototipo es suficiente)
      setAvatarUri(result.assets[0].uri);
      setUploading(false);
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
            <Text style={styles.licenseStatus}>✅ AL DÍA</Text>
            <Text style={styles.licenseDate}>
              Vence el: {new Date(user.fechaVencimientoLicencia).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.licenseStatus}>❌ VENCIDA O NO VÁLIDA</Text>
            <Text style={styles.licenseDate}>No puedes solicitar nuevas reservas de vehículos.</Text>
          </View>
        )}
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
});
