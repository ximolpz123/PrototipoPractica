import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Modal
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, AppColors } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { vehicleService, IVehicle } from '../services/vehicle.service';
import { userService } from '../services/user.service';
import { reservationService } from '../services/reservation.service';
import { IUser } from '../types';

const TIPO_ICON: Record<string, string> = {
  pickup: '🛻', sedan: '🚗', suv: '🚙', van: '🚐',
};

export default function AdminCreateReservationScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  

  const { showAlert } = useAlert();
  
  const [vehicles, setVehicles] = useState<IVehicle[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<IVehicle | null>(null);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 4 * 60 * 60 * 1000));
  const [destino, setDestino] = useState('');
  const [motive, setMotive] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allVehicles, allUsers] = await Promise.all([
        vehicleService.getAll(),
        userService.getAll()
      ]);
      setVehicles(allVehicles.filter((v) => v.estado !== 'mantenimiento' && v.estado !== 'fuera_de_servicio'));
      setUsers(allUsers.filter((u) => u.rol !== 'admin'));
    } catch (err) {
      showAlert('Error', 'No se pudo cargar la información.');
    } finally {
      setLoading(false);
    }
  };

  const buildDateTime = (day: Date, time: Date) => {
    const result = new Date(day);
    result.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return result;
  };

  const handleConfirm = async () => {
    if (!selectedUser) {
      showAlert('Falta usuario', 'Debes asignar un conductor.');
      return;
    }
    if (!selectedVehicle) {
      showAlert('Falta vehículo', 'Debes seleccionar un vehículo.');
      return;
    }
    if (!destino.trim() || !motive.trim()) {
      showAlert('Falta información', 'Destino y motivo son obligatorios.');
      return;
    }

    const fechaInicio = buildDateTime(date, startTime);
    const fechaFin = buildDateTime(date, endTime);

    if (fechaFin <= fechaInicio) {
      showAlert('Horario inválido', 'La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    try {
      setSubmitting(true);
      await reservationService.create({
        vehiculo: selectedVehicle._id,
        usuarioId: (selectedUser as any)._id,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        destino: destino.trim(),
        motivo: motive.trim(),
      });
      showAlert('✅ Reserva Creada', `El vehículo fue asignado a ${selectedUser.nombre}. Se ha enviado una notificación al conductor.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'No se pudo crear la reserva.';
      showAlert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* === SELECCIÓN DE USUARIO === */}
        <Text style={styles.label}>1. Asignar Conductor</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setShowUserModal(true)}>
          <Text style={selectedUser ? styles.selectButtonTextSelected : styles.selectButtonText}>
            {selectedUser ? `👤 ${selectedUser.nombre} ${selectedUser.apellido} - ${selectedUser.departamento || 'Sin Depto'}` : 'Seleccionar Conductor...'}
          </Text>
        </TouchableOpacity>

        <Modal visible={showUserModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Seleccionar Conductor</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {users.map(u => (
                  <TouchableOpacity
                    key={(u as any)._id}
                    style={styles.modalItem}
                    onPress={() => { setSelectedUser(u); setShowUserModal(false); }}
                  >
                    <Text style={styles.modalItemTitle}>{u.nombre} {u.apellido}</Text>
                    <Text style={styles.modalItemSub}>{u.departamento || 'Sin Departamento'} | {u.email}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowUserModal(false)}>
                <Text style={styles.closeModalText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* === SELECCIÓN DE VEHÍCULO === */}
        <Text style={styles.label}>2. Vehículo a Asignar</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carList}>
          {vehicles.map((v) => {
            const isSelected = selectedVehicle?._id === v._id;
            return (
              <TouchableOpacity
                key={v._id}
                style={[styles.carCard, isSelected && styles.carCardSelected]}
                onPress={() => setSelectedVehicle(v)}
              >
                <Text style={styles.carIcon}>{TIPO_ICON[v.tipo] || '🚗'}</Text>
                <Text style={styles.carMarca}>{v.marca} {v.modelo}</Text>
                <Text style={styles.carPlaca}>{v.placa}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* === FECHAS Y HORAS === */}
        <Text style={styles.label}>3. Fecha y Horario</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateLabel}>Fecha</Text>
            <Text style={styles.dateValue}>{date.toLocaleDateString('es-CL')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartTimePicker(true)}>
            <Text style={styles.dateLabel}>Inicio</Text>
            <Text style={styles.dateValue}>
              {startTime.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndTimePicker(true)}>
            <Text style={styles.dateLabel}>Fin</Text>
            <Text style={styles.dateValue}>
              {endTime.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            onValueChange={(_: any, selected?: Date) => {
              setShowDatePicker(false);
              if (selected) setDate(selected);
            }}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            onValueChange={(_: any, selected?: Date) => {
              setShowStartTimePicker(false);
              if (selected) setStartTime(selected);
            }}
            onDismiss={() => setShowStartTimePicker(false)}
          />
        )}
        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            onValueChange={(_: any, selected?: Date) => {
              setShowEndTimePicker(false);
              if (selected) setEndTime(selected);
            }}
            onDismiss={() => setShowEndTimePicker(false)}
          />
        )}

        {/* === DETALLES === */}
        <Text style={styles.label}>4. Detalles del Viaje</Text>
        <TextInput
          style={styles.input}
          placeholder="Destino (ej. Planta Norte)"
          value={destino}
          onChangeText={setDestino}
          placeholderTextColor="#999"
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Motivo del viaje (ej. Inspección técnica)"
          value={motive}
          onChangeText={setMotive}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Asignar Vehículo Ahora</Text>
          )}
        </TouchableOpacity>
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 20, marginBottom: 10 },
  
  selectButton: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonText: { color: colors.textMuted, fontSize: 16 },
  selectButtonTextSelected: { color: colors.text, fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.white, borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: colors.text },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  modalItemSub: { fontSize: 13, color: colors.textMuted },
  closeModalBtn: { marginTop: 15, padding: 12, backgroundColor: colors.border, borderRadius: 8, alignItems: 'center' },
  closeModalText: { fontSize: 16, color: colors.text, fontWeight: 'bold' },

  carList: { flexDirection: 'row', marginBottom: 10 },
  carCard: {
    backgroundColor: colors.white, padding: 15, borderRadius: 12, marginRight: 15,
    borderWidth: 2, borderColor: 'transparent', alignItems: 'center',
    width: 120,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  carCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  carIcon: { fontSize: 32, marginBottom: 5 },
  carMarca: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: colors.text },
  carPlaca: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  
  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateBtn: {
    backgroundColor: colors.white, padding: 15, borderRadius: 10, flex: 1,
    marginHorizontal: 5, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  dateLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 5 },
  dateValue: { fontSize: 16, fontWeight: 'bold', color: colors.primary },

  input: {
    backgroundColor: colors.white, color: colors.text, padding: 15, borderRadius: 10, marginBottom: 15,
    fontSize: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  submitBtn: {
    backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20,
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 4 },
  },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
