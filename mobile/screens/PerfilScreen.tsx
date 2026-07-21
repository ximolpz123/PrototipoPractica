import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';

export default function PerfilScreen({ route }: any) {
  const handleLogout = route.params?.handleLogout || (() => {});
  const user = route.params?.user;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi Perfil</Text>
      {user && (
        <Text style={styles.subtitle}>
          Conductor: {user.nombre} {user.apellido}
        </Text>
      )}
      <Text style={styles.subtitle}>Estado Licencia: AL DÍA (Próximamente dinámico)</Text>
      
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  logoutBtn: {
    marginTop: 30,
    backgroundColor: COLORS.error || '#FF3B30',
    padding: 12,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
