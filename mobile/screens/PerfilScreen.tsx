import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

export default function PerfilScreen({ route }: any) {
  const handleLogout = route.params?.handleLogout || (() => {});
  // Use passed user or a mock if it doesn't exist
  const user = route.params?.user || {
    nombre: 'Joaquín',
    apellido: 'López',
    email: 'joaquin@bitnets.cl',
    departamento: 'Operaciones',
    rol: 'operario',
    licenciaAlDia: true,
    fechaVencimientoLicencia: '2026-08-15T00:00:00.000Z',
  };

  const isLicenciaValida = user.licenciaAlDia;
  const avatarUrl = `https://ui-avatars.com/api/?name=${user.nombre}+${user.apellido}&background=3D9FD3&color=fff&size=128`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <Text style={styles.name}>{user.nombre} {user.apellido}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{user.rol.toUpperCase()}</Text>
        </View>
      </View>

      {/* INFO SECTION */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={20} color={COLORS.textMuted} />
          <Text style={styles.infoText}>Departamento: <Text style={styles.infoBold}>{user.departamento}</Text></Text>
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
      <TouchableOpacity style={styles.actionBtn}>
        <Ionicons name="settings-outline" size={20} color={COLORS.text} />
        <Text style={styles.actionBtnText}>Configuración de cuenta</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={styles.actionIconRight} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionBtn}>
        <Ionicons name="help-circle-outline" size={20} color={COLORS.text} />
        <Text style={styles.actionBtnText}>Soporte técnico</Text>
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
    marginBottom: 20,
    width: '100%',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: COLORS.primary,
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
    backgroundColor: COLORS.primary + '20', // transparent primary
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
  infoCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  infoBold: {
    fontWeight: 'bold',
  },
  licenseCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  licenseValid: {
    borderColor: COLORS.success || '#28a745',
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
