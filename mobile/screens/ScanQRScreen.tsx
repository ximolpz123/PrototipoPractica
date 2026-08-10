import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { reservationService } from '../services/reservation.service';
import { authService } from '../services/auth.service';

export default function ScanQRScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const lastScan = useRef<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned || processing || data === lastScan.current) return;
    lastScan.current = data;
    setScanned(true);
    setProcessing(true);
    Vibration.vibrate(100);

    try {
      const vehiculoId = data.trim();
      if (!vehiculoId || vehiculoId.length < 10) {
        showAlert('QR Invalido', 'Este codigo QR no corresponde a un vehiculo del sistema.');
        setScanned(false); setProcessing(false); lastScan.current = null;
        return;
      }
      const reservas = await reservationService.getMyReservations();
      const activeReserva = reservas.find(r => r.estado === 'en_curso');
      const upcomingReserva = reservas.find(r => r.estado === 'aprobada');
      const relevantReserva = activeReserva || upcomingReserva;

      if (relevantReserva) {
        const reservaVehicleId = typeof relevantReserva.vehiculo === 'string'
          ? relevantReserva.vehiculo
          : (relevantReserva.vehiculo as any)._id;

        if (reservaVehicleId === vehiculoId) {
          const veh = relevantReserva.vehiculo as any;
          const vehicleInfo = typeof veh === 'object'
            ? `${veh.marca} ${veh.modelo} (${veh.placa})`
            : 'el vehiculo';
          showAlert('Vehiculo Verificado', `Este es ${vehicleInfo}, el vehiculo asignado a tu reserva.`);
          navigation.goBack();
        } else {
          showAlert('Vehiculo Incorrecto', 'Este QR no corresponde al vehiculo de tu reserva. Escanea el vehiculo correcto.');
          setScanned(false); setProcessing(false); lastScan.current = null;
        }
      } else {
        showAlert(
          'Crear Reserva',
          'No tienes una reserva activa. Deseas crear una reserva para este vehiculo?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => { setScanned(false); setProcessing(false); lastScan.current = null; } },
            { text: 'Crear Reserva', onPress: () => navigation.replace('CreateReservation', { preselectedVehicleId: vehiculoId }) },
          ]
        );
      }
    } catch (err: any) {
      showAlert('Error', 'No se pudo procesar el QR. Verifica tu conexion.');
      setScanned(false); setProcessing(false); lastScan.current = null;
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) return <View style={[styles.centered, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (!permission.granted) return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <Ionicons name="camera-outline" size={60} color={colors.textMuted} />
      <Text style={[styles.permissionText, { color: colors.text }]}>Se necesita permiso de camara para escanear el QR.</Text>
      <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
        <Text style={styles.permissionBtnText}>Dar Permiso</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanWindow}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          {processing
            ? <ActivityIndicator size="large" color="#fff" />
            : <Text style={styles.instructionText}>{scanned ? 'Procesando...' : 'Apunta al codigo QR del vehiculo'}</Text>
          }
          {scanned && !processing && (
            <TouchableOpacity style={styles.rescanBtn} onPress={() => { setScanned(false); lastScan.current = null; }}>
              <Text style={styles.rescanText}>Escanear de nuevo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const WINDOW_SIZE = 260;
const CORNER_SIZE = 30;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  permissionText: { fontSize: 16, textAlign: 'center', marginVertical: 20, lineHeight: 24 },
  permissionBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  permissionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  middleRow: { flexDirection: 'row', height: WINDOW_SIZE },
  sideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanWindow: { width: WINDOW_SIZE, height: WINDOW_SIZE, backgroundColor: 'transparent' },
  bottomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', gap: 20 },
  instructionText: { color: '#fff', fontSize: 17, fontWeight: '600', textAlign: 'center', paddingHorizontal: 30 },
  rescanBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  rescanText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#4ade80' },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 4 },
});
