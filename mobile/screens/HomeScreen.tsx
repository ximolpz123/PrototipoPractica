import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../constants';
import { locationService } from '../services/location.service';

export default function HomeScreen({ route, navigation }: any) {
  const { user } = route.params;
  
  // mock states: 'pending', 'active', 'completed'
  const [tripState, setTripState] = React.useState('pending');

  const handleStartTrip = async () => {
    const started = await locationService.startTracking();
    if (started) {
      setTripState('active');
      navigation.navigate('Camera', { reservaId: '6a5e8c12faf82a430d99924b', tipo: 'salida' });
    } else {
      Alert.alert('Error', 'Necesitas dar permisos de GPS siempre (Todo el tiempo) para esta función.');
    }
  };

  const handleEndTrip = async () => {
    await locationService.stopTracking();
    setTripState('completed');
    navigation.navigate('Camera', { reservaId: '6a5e8c12faf82a430d99924b', tipo: 'retorno' });
  };

  const handleResetDemo = () => {
    setTripState('pending');
  };

  return (
    <View style={styles.homeContainer}>
      <Text style={styles.welcomeTitle}>¡Bienvenido! 👋</Text>
      <Text style={styles.welcomeName}>{user.nombre} {user.apellido}</Text>
      <Text style={styles.welcomeRole}>Rol: {user.rol}</Text>
      <Text style={styles.welcomeDept}>Departamento: {user.departamento}</Text>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>🚘 Próxima Reserva (Demo)</Text>
        <Text style={styles.placeholderSub}>
          Reserva de un SUV Nissan. {tripState === 'active' ? 'El viaje está en curso y el GPS está activo.' : tripState === 'completed' ? 'El viaje ha finalizado.' : 'Usa el botón para iniciar el viaje.'}
        </Text>
        
        {tripState === 'pending' && (
          <TouchableOpacity style={[styles.actionBtn, { marginBottom: 10 }]} onPress={handleStartTrip}>
            <Text style={styles.actionBtnText}>Iniciar Viaje (Activa GPS)</Text>
          </TouchableOpacity>
        )}

        {tripState === 'active' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error || '#FF3B30' }]} onPress={handleEndTrip}>
            <Text style={styles.actionBtnText}>Completar Viaje (Apaga GPS)</Text>
          </TouchableOpacity>
        )}

        {tripState === 'completed' && (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: COLORS.success || '#4CD964', fontWeight: 'bold', marginBottom: 15 }}>✅ Viaje Registrado Exitosamente</Text>
            <TouchableOpacity onPress={handleResetDemo} style={{ padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 5 }}>
              <Text style={{ color: COLORS.textMuted }}>Reiniciar Demo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
