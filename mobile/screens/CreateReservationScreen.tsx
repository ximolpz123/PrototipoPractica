import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants';

const VEHICLES = [
  { id: '1', nombre: 'Camioneta Roja (AB-CD-12)' },
  { id: '2', nombre: 'Camioneta Blanca (EF-GH-34)' },
  { id: '3', nombre: 'Camioneta Azul (IJ-KL-56)' },
  { id: '4', nombre: 'Auto Café (MN-OP-78)' },
];

export default function CreateReservationScreen({ navigation }: any) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  
  // Fechas y horas reales
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(new Date().getTime() + 4 * 60 * 60 * 1000)); // 4 horas después
  const [motive, setMotive] = useState('');

  // Controladores de los modales de fecha/hora
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const handleConfirm = () => {
    if (!selectedVehicle) {
      Alert.alert('Error', 'Debes seleccionar un vehículo');
      return;
    }
    if (!motive) {
      Alert.alert('Error', 'Debes ingresar un motivo para el viaje');
      return;
    }
    if (startTime >= endTime) {
      Alert.alert('Error', 'La hora de fin debe ser mayor a la hora de inicio');
      return;
    }
    
    Alert.alert('Éxito', 'Reserva creada correctamente (Simulado)', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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

        <Text style={styles.label}>2. Fecha y Hora</Text>
        
        {/* Selector de Fecha */}
        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.datePickerLabel}>Día del viaje</Text>
          <Text style={styles.datePickerValue}>📅 {formatDate(date)}</Text>
        </TouchableOpacity>

        <View style={styles.timeRow}>
          {/* Selector Hora Inicio */}
          <TouchableOpacity style={[styles.datePickerBtn, { flex: 1, marginRight: 8 }]} onPress={() => setShowStartTimePicker(true)}>
            <Text style={styles.datePickerLabel}>Hora Inicio</Text>
            <Text style={styles.datePickerValue}>🕒 {formatTime(startTime)}</Text>
          </TouchableOpacity>

          {/* Selector Hora Fin */}
          <TouchableOpacity style={[styles.datePickerBtn, { flex: 1, marginLeft: 8 }]} onPress={() => setShowEndTimePicker(true)}>
            <Text style={styles.datePickerLabel}>Hora Fin</Text>
            <Text style={styles.datePickerValue}>🕒 {formatTime(endTime)}</Text>
          </TouchableOpacity>
        </View>

        {/* Componentes nativos de DateTimePicker */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowStartTimePicker(false);
              if (selectedTime) setStartTime(selectedTime);
            }}
          />
        )}
        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowEndTimePicker(false);
              if (selectedTime) setEndTime(selectedTime);
            }}
          />
        )}

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
  datePickerBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  datePickerLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  datePickerValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
