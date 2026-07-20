import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export default function HomeScreen({ route, navigation }: any) {
  const { user, handleLogout } = route.params;

  return (
    <View style={styles.homeContainer}>
      <Text style={styles.welcomeTitle}>¡Bienvenido! 👋</Text>
      <Text style={styles.welcomeName}>{user.nombre} {user.apellido}</Text>
      <Text style={styles.welcomeRole}>Rol: {user.rol}</Text>
      <Text style={styles.welcomeDept}>Departamento: {user.departamento}</Text>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>🚘 Tus Reservas Activas</Text>
        <Text style={styles.placeholderSub}>
          Aquí se listarán las reservas. Por ahora puedes probar la cámara de evidencia.
        </Text>
        
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => navigation.navigate('Camera', { reservaId: 'TEST_ID', tipo: 'salida' })}
        >
          <Text style={styles.actionBtnText}>Tomar Evidencia (Salida)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    paddingTop: 60,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  welcomeRole: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  welcomeDept: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 24,
  },
  placeholder: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  placeholderSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  actionBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '600',
  },
});
