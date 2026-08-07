import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants';
import { useAlert } from '../context/AlertContext';
import { vehicleService, IVehicle } from '../services/vehicle.service';
import { reservationService } from '../services/reservation.service';
import { authService } from '../services/auth.service';

const TIPO_ICON: Record<string, string> = {
  pickup: '🛻', sedan: '🚗', suv: '🚙', van: '🚐',
};

export default function CreateReservationScreen({ navigation }: any) {
  const { showAlert } = useAlert();
  const [user, setUser] = useState<any>(null);
  const [vehicles, setVehicles] = useState<IVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<IVehicle | null>(null);
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 4 * 60 * 60 * 1000));
  const [destino, setDestino] = useState('');
  const [motive, setMotive] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingVehicles(true);
      
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      
      const all = await vehicleService.getAll();
      // Mostrar todos los vehículos operativos (no los de mantenimiento o fuera de servicio)
      // Los reservados/en_curso aún se pueden seleccionar para reservar en otro horario
      setVehicles(all.filter((v) => v.estado !== 'mantenimiento' && v.estado !== 'fuera_de_servicio'));
    } catch (err) {
      showAlert('Error', 'No se pudo cargar la información.');
    } finally {
      setLoadingVehicles(false);
    }
  };

  const buildDateTime = (day: Date, time: Date) => {
    const result = new Date(day);
    result.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return result;
  };

  const handleConfirm = async () => {
    if (!selectedVehicle) {
      showAlert('Falta vehículo', 'Debes seleccionar un vehículo.');
      return;
    }
    if (!destino.trim()) {
      showAlert('Falta destino', 'Debes ingresar el destino del viaje.');
      return;
    }
    if (!motive.trim()) {
      showAlert('Falta motivo', 'Debes ingresar el motivo del viaje.');
      return;
    }

    const fechaInicio = buildDateTime(date, startTime);
    const fechaFin = buildDateTime(date, endTime);

    if (fechaFin <= fechaInicio) {
      showAlert('Horario inválido', 'La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    if (fechaInicio < new Date()) {
      showAlert('Fecha inválida', 'La fecha de inicio no puede ser en el pasado.');
      return;
    }

    try {
      setSubmitting(true);
      await reservationService.create({
        vehiculo: selectedVehicle._id,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        destino: destino.trim(),
        motivo: motive.trim(),
      });
      showAlert('✅ Reserva Enviada', 'Tu solicitud fue enviada y está pendiente de aprobación.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'No se pudo crear la reserva. Intenta de nuevo.';
      showAlert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  // Validación de Licencia
  if (loadingVehicles) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const licenciaVigente = user?.licenciaEstado === 'vigente' || user?.licenciaAlDia === true;
  const fechaVencimiento = user?.licenciaVencimiento || user?.fechaVencimientoLicencia;
  const isLicenciaValida = licenciaVigente && fechaVencimiento && new Date(fechaVencimiento) > new Date();

  if (!isLicenciaValida) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 40, marginBottom: 10 }}>⚠️</Text>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.danger, textAlign: 'center', marginBottom: 10 }}>
          Licencia Inválida o No Escaneada
        </Text>
        <Text style={{ fontSize: 16, color: COLORS.text, textAlign: 'center', marginBottom: 20 }}>
          Para poder realizar reservas valida primero tu carnet de conducir en tu perfil.
        </Text>
        <TouchableOpacity style={styles.confirmBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.confirmBtnText}>Volver al Inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Nueva Reserva</Text>
        <Text style={styles.subtitle}>Completa los datos de tu viaje</Text>

        {/* 1. Vehículo */}
        <Text style={styles.label}>1. Selecciona un Vehículo</Text>
        {loadingVehicles ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando vehículos disponibles...</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyVehicles}>
            <Text style={styles.emptyVehiclesText}>😔 No hay vehículos disponibles en este momento.</Text>
          </View>
        ) : (
          <View style={styles.vehicleList}>
            {vehicles.map((v) => {
              const isSelected = selectedVehicle?._id === v._id;
              const icon = TIPO_ICON[v.tipo] ?? '🚗';
              const enUso = v.estado === 'en_curso' || v.estado === 'reservado';
              const estadoBadge = v.estado === 'en_curso'
                ? { label: '🔴 En Uso', color: '#FFF0F0', border: '#FF4444' }
                : v.estado === 'reservado'
                ? { label: '🟡 Reservado', color: '#FFFBF0', border: '#FFA500' }
                : { label: '🟢 Disponible', color: '#F0FFF0', border: '#28a745' };
              return (
                <TouchableOpacity
                  key={v._id}
                  style={[styles.vehicleOption, isSelected && styles.vehicleOptionSelected, enUso && styles.vehicleOptionBusy]}
                  onPress={() => setSelectedVehicle(v)}
                >
                  <Text style={styles.vehicleIcon}>{icon}</Text>
                  <View style={styles.vehicleInfo}>
                    <View style={styles.vehicleNameRow}>
                      <Text style={[styles.vehicleOptionText, isSelected && styles.vehicleOptionTextSelected]}>
                        {v.marca} {v.modelo} {v.anio}
                      </Text>
                      <View style={[styles.estadoBadge, { backgroundColor: estadoBadge.color, borderColor: estadoBadge.border }]}>
                        <Text style={[styles.estadoBadgeText, { color: estadoBadge.border }]}>{estadoBadge.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.vehicleSubText}>
                      {v.color}  •  🪪 {v.placa}  •  🛞 {v.kilometraje.toLocaleString()} km
                    </Text>
                    {enUso && (
                      <Text style={styles.vehicleBusyHint}>
                        Puedes reservarlo en otro horario — el backend validará disponibilidad
                      </Text>
                    )}
                  </View>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 2. Fecha y Hora */}
        <Text style={styles.label}>2. Fecha y Hora</Text>

        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.datePickerLabel}>Día del viaje</Text>
          <Text style={styles.datePickerValue}>📅 {formatDate(date)}</Text>
        </TouchableOpacity>

        <View style={styles.timeRow}>
          <TouchableOpacity style={[styles.datePickerBtn, { flex: 1, marginRight: 8 }]} onPress={() => setShowStartTimePicker(true)}>
            <Text style={styles.datePickerLabel}>Hora Inicio</Text>
            <Text style={styles.datePickerValue}>🕒 {formatTime(startTime)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.datePickerBtn, { flex: 1, marginLeft: 8 }]} onPress={() => setShowEndTimePicker(true)}>
            <Text style={styles.datePickerLabel}>Hora Fin</Text>
            <Text style={styles.datePickerValue}>🕔 {formatTime(endTime)}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker value={date} mode="date" display="default"
            onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }} />
        )}
        {showStartTimePicker && (
          <DateTimePicker value={startTime} mode="time" display="default"
            onChange={(_, t) => { setShowStartTimePicker(false); if (t) setStartTime(t); }} />
        )}
        {showEndTimePicker && (
          <DateTimePicker value={endTime} mode="time" display="default"
            onChange={(_, t) => { setShowEndTimePicker(false); if (t) setEndTime(t); }} />
        )}

        {/* 3. Destino */}
        <Text style={styles.label}>3. Destino</Text>
        <TextInput
          style={styles.input}
          value={destino}
          onChangeText={setDestino}
          placeholder="Ej: Planta Bitnets, Santiago Centro..."
          placeholderTextColor={COLORS.textMuted}
        />

        {/* 4. Motivo */}
        <Text style={styles.label}>4. Motivo del Viaje</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={motive}
          onChangeText={setMotive}
          placeholder="Ej: Visita a cliente en terreno, traslado de equipos..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.confirmBtn, (submitting || loadingVehicles) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={submitting || loadingVehicles}
        >
          {submitting
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.confirmBtnText}>Confirmar Reserva</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, paddingBottom: 50 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginTop: 8 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: COLORS.white, borderRadius: 8, marginBottom: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },
  emptyVehicles: { backgroundColor: COLORS.white, borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 12 },
  emptyVehiclesText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  vehicleList: { marginBottom: 8 },
  vehicleOption: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10,
    padding: 14, marginBottom: 10, backgroundColor: COLORS.white,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  vehicleOptionSelected: { borderColor: COLORS.primary, backgroundColor: '#EBF5FB' },
  vehicleIcon: { fontSize: 24 },
  vehicleInfo: { flex: 1 },
  vehicleOptionText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  vehicleOptionTextSelected: { color: COLORS.primary },
  vehicleSubText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  checkmark: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
  vehicleOptionBusy: { borderColor: '#FFA500', borderStyle: 'dashed' },
  vehicleNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  estadoBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1,
  },
  estadoBadgeText: { fontSize: 10, fontWeight: '700' },
  vehicleBusyHint: { fontSize: 11, color: '#FFA500', marginTop: 4, fontStyle: 'italic' },
  input: {
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 14, fontSize: 15, marginBottom: 10, color: COLORS.text,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  datePickerBtn: {
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 14, marginBottom: 12,
  },
  datePickerLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  datePickerValue: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  timeRow: { flexDirection: 'row' },
  confirmBtn: {
    backgroundColor: COLORS.primary, padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 20,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});
