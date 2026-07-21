import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../constants';

const VEHICLES = [
  { id: '1', nombre: 'Camioneta Roja (AB-CD-12)' },
  { id: '2', nombre: 'Camioneta Blanca (EF-GH-34)' },
  { id: '3', nombre: 'Camioneta Azul (IJ-KL-56)' },
  { id: '4', nombre: 'Auto Café (MN-OP-78)' },
];

export default function CreateReservationScreen({ navigation }: any) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [date, setDate] = useState('25 Jul, 2026');
  const [time, setTime] = useState('10:00 - 14:00');
  const [motive, setMotive] = useState('');

  const handleConfirm = () => {
    if (!selectedVehicle) {
      Alert.alert('Error', 'Debes seleccionar un vehículo');
      return;
    }
    if (!motive) {
      Alert.alert('Error', 'Debes ingresar un motivo para el viaje');
      return;
    }
    
    Alert.alert('Éxito', 'Reserva creada correctamente (Simulado)', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Nueva Reserva</Text>
        <Text style={styles.subtitle}>Completa los datos de tu viaje</Text>

        <Text style={styles.label}>1. Selecciona un Vehículo</Text>
        <View style={styles.vehicleList}>
          {VEHICLES.map((v) => (
            <TouchableOpacity 
              key={v.id} 
              style={[
                styles.vehicleOption, 
                selectedVehicle === v.id && styles.vehicleOptionSelected
              ]}
              onPress={() => setSelectedVehicle(v.id)}
            >
              <Text style={[
                styles.vehicleOptionText,
                selectedVehicle === v.id && styles.vehicleOptionTextSelected
              ]}>
                {v.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>2. Fecha y Hora (Simulado)</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="Ej: 25 Jul, 2026"
        />
        <TextInput
          style={styles.input}
          value={time}
          onChangeText={setTime}
          placeholder="Ej: 10:00 - 14:00"
        />

        <Text style={styles.label}>3. Motivo del Viaje</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={motive}
          onChangeText={setMotive}
          placeholder="Ej: Visita a cliente en terreno..."
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>Confirmar Reserva</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 10,
  },
  vehicleList: {
    marginBottom: 10,
  },
  vehicleOption: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  vehicleOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E1F5FE',
  },
  vehicleOptionText: {
    fontSize: 15,
    color: COLORS.text,
  },
  vehicleOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
