import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, AppColors, API_URL } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';
import axios from 'axios';
import { authService } from '../services/auth.service';
import { reservationService } from '../services/reservation.service';
import { locationService } from '../services/location.service';
import SignaturePad from '../components/SignaturePad';

const POSITIONS = ['frontal', 'lateralDer', 'lateralIzq', 'trasero', 'tablero', 'interior'];
const LABELS = ['Frontal', 'Lateral Derecho', 'Lateral Izquierdo', 'Trasero', 'Tablero', 'Interior'];

export default function CameraScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  

  const { showAlert } = useAlert();
  const { reservaId, tipo, tipoIndicador } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // IA Odometer states
  const [uploadingIA, setUploadingIA] = useState(false);
  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [kmDetectado, setKmDetectado] = useState(-1);
  const [manualKm, setManualKm] = useState('');
  const [finalKmRetorno, setFinalKmRetorno] = useState<number | null>(null);
  const [isEditingKm, setIsEditingKm] = useState(false);

  // Gas level states
  const [bencinaLevel, setBencinaLevel] = useState<number>(100); // 0 to 100

  // Firma Digital states
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [firmaBase64, setFirmaBase64] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeRemove = (e: any) => {
      if (canGoBack) return;
      e.preventDefault();

      const title = tipo === 'salida' ? 'Fotos Obligatorias' : 'Atenci├│n';
      const msg = tipo === 'salida'
        ? 'Debes tomar fotos de evidencia para iniciar tu viaje. Si retrocedes, tu viaje ser├í cancelado autom├íticamente.'
        : 'A├║n no has completado tu viaje. Si retrocedes, tu viaje seguir├í "En Curso" y deber├ís finalizarlo m├ís tarde.';

      showAlert(title, msg, [
        { text: 'Tomar fotos', style: 'cancel', onPress: () => { } },
        {
          text: tipo === 'salida' ? 'Cancelar Viaje' : 'Volver al Inicio',
          style: tipo === 'salida' ? 'destructive' : 'default',
          onPress: async () => {
            if (tipo === 'salida') {
              try {
                await reservationService.cancel(reservaId, 'Cancelada autom├íticamente por abandonar captura de fotos.');
                await locationService.stopTracking();
              } catch (error) {
                showAlert('Error', 'No se pudo cancelar el viaje.');
                return;
              }
            }
            setCanGoBack(true);
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    };

    navigation.addListener('beforeRemove', handleBeforeRemove);
    return () => navigation.removeListener('beforeRemove', handleBeforeRemove);
  }, [navigation, canGoBack, tipo, reservaId]);

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Necesitamos permiso para usar la c├ímara</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Otorgar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const procesarFotoIA = async (uri: string) => {
    setUploadingIA(true);
    try {
      const formData = new FormData();
      formData.append('foto', {
        uri,
        name: 'tablero.jpg',
        type: 'image/jpeg',
      } as any);

      const token = await authService.getToken();
      const res = await axios.post(`${API_URL}/reservations/${reservaId}/foto-tablero`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const detectado = res.data.kmDetectado;
      setKmDetectado(detectado);
      setManualKm(detectado > 0 ? String(detectado) : '');
      setIsEditingKm(detectado <= 0);
      setShowOdometerModal(true);
    } catch (error: any) {
      console.error(error);
      showAlert('Error IA', 'No se pudo procesar la foto del tablero. Deber├ís ingresar el KM manualmente.');
      setKmDetectado(-1);
      setIsEditingKm(true);
      setShowOdometerModal(true);
    } finally {
      setUploadingIA(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    if (uploadingIA) return;
    
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.5,
      base64: false,
    });
    
    if (!photo) return;

    const pos = POSITIONS[currentStep];
    const newPhotos = { ...photos, [pos]: photo.uri };
    setPhotos(newPhotos);

    if (pos === 'tablero' && tipo === 'retorno') {
      await procesarFotoIA(photo.uri);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const retakePhoto = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const confirmarOdometro = () => {
    const kmNum = parseInt(manualKm, 10);
    if (isNaN(kmNum) || kmNum < 0) {
      showAlert('Error', 'Ingresa un n├║mero v├ílido para el kilometraje.');
      return;
    }
    
    setFinalKmRetorno(kmNum);
    setShowOdometerModal(false);
    setCurrentStep(currentStep + 1);
  };

  const uploadFinal = async () => {
    // Si aún no tiene firma, primero pedir firma digital
    if (!firmaBase64) {
      setShowSignatureModal(true);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('tipo', tipo);
      formData.append('posiciones', JSON.stringify(POSITIONS));

      POSITIONS.forEach((pos) => {
        formData.append('fotos', {
          uri: photos[pos],
          name: `${pos}.jpg`,
          type: 'image/jpeg',
        } as any);
      });

      const token = await authService.getToken();
      
      await axios.post(`${API_URL}/reservations/${reservaId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (tipo === 'retorno') {
        await axios.patch(`${API_URL}/reservations/${reservaId}/complete`, {
          kmRetorno: finalKmRetorno,
          nivelBencinaRetorno: bencinaLevel
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await locationService.stopTracking();
      }

      // Guardar firma digital en el backend
      const tipoFirma: 'inicio' | 'fin' = tipo === 'salida' ? 'inicio' : 'fin';
      await reservationService.saveFirma(reservaId, tipoFirma, firmaBase64!);

      showAlert('Éxito', tipo === 'salida' ? 'Viaje iniciado exitosamente.' : 'Viaje finalizado exitosamente.');
      setCanGoBack(true);
      navigation.navigate('MainTabs');
    } catch (error: any) {
      console.error(error.response?.data || error);
      showAlert('Error', 'Hubo un error al procesar el viaje. Verifica tu conexión.');
    } finally {
      setUploading(false);
    }
  };

  const renderBencinaSelector = () => {
    if (tipo !== 'retorno') return null;

    if (tipoIndicador === 'analogico') {
      const options = [
        { label: 'E', value: 0 },
        { label: '1/4', value: 25 },
        { label: '1/2', value: 50 },
        { label: '3/4', value: 75 },
        { label: 'F', value: 100 },
      ];
      return (
        <View style={styles.bencinaContainer}>
          <Text style={styles.bencinaTitle}>Nivel de Bencina de Retorno</Text>
          <View style={styles.analogRow}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.analogBtn, bencinaLevel === opt.value && styles.analogBtnActive]}
                onPress={() => setBencinaLevel(opt.value)}
              >
                <Text style={[styles.analogText, bencinaLevel === opt.value && styles.analogTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    } else {
      const options = [0, 25, 50, 75, 100];
      return (
        <View style={styles.bencinaContainer}>
          <Text style={styles.bencinaTitle}>Porcentaje de Bencina de Retorno</Text>
          <View style={styles.analogRow}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.analogBtn, bencinaLevel === opt && styles.analogBtnActive]}
                onPress={() => setBencinaLevel(opt)}
              >
                <Text style={[styles.analogText, bencinaLevel === opt && styles.analogTextActive]}>
                  {opt}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {currentStep < 6 ? (
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.overlay}>
            <View style={styles.header}>
              <Text style={styles.stepText}>Paso {currentStep + 1} de 6</Text>
              <Text style={styles.instruction}>
                Toma foto: {LABELS[currentStep]}
              </Text>
            </View>
            
            {uploadingIA ? (
              <View style={styles.aiLoading}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.aiLoadingText}>Leyendo Od├│metro con IA...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
            )}
          </View>
        </CameraView>
      ) : (
        <View style={styles.finalView}>
          <Text style={styles.finalTitle}>Resumen de Evidencia</Text>
          <View style={styles.gallery}>
            {POSITIONS.map((pos, index) => (
              <TouchableOpacity key={pos} style={styles.galleryItem} onPress={() => retakePhoto(index)}>
                <Image source={{ uri: photos[pos] }} style={styles.thumbnail} />
                <Text style={styles.thumbnailLabel}>{LABELS[index]}</Text>
                <View style={styles.retakeBadge}><Text style={styles.retakeText}>Ôå║</Text></View>
              </TouchableOpacity>
            ))}
          </View>
          
          {renderBencinaSelector()}

          <TouchableOpacity
            style={[styles.uploadBtn, uploading && styles.disabledBtn]}
            onPress={uploadFinal}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.uploadBtnText}>
                {firmaBase64
                  ? (tipo === 'salida' ? 'Subir e Iniciar Viaje' : 'Subir y Finalizar Viaje')
                  : '✍️ Firmar y Continuar'
                }
              </Text>
            )}
          </TouchableOpacity>

          {firmaBase64 && (
            <TouchableOpacity
              style={{ alignItems: 'center', marginTop: 12 }}
              onPress={() => setFirmaBase64(null)}
            >
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>✏️ Volver a firmar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* IA Modal */}
      <Modal visible={showOdometerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>­ƒñû IA Od├│metro</Text>
            
            {!isEditingKm ? (
              <>
                <Text style={styles.modalText}>
                  El od├│metro marca <Text style={styles.boldKm}>{kmDetectado} km</Text>.
                </Text>
                <Text style={styles.modalQuestion}>┬┐Es esto correcto?</Text>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={[styles.modalBtn, styles.btnNo]} onPress={() => setIsEditingKm(true)}>
                    <Text style={styles.btnNoText}>No, editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.btnYes]} onPress={confirmarOdometro}>
                    <Text style={styles.btnYesText}>S├¡, es correcto</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalText}>Ingresa el kilometraje correcto:</Text>
                <TextInput
                  style={styles.kmInput}
                  keyboardType="numeric"
                  value={manualKm}
                  onChangeText={setManualKm}
                  placeholder="Ej: 12345"
                  autoFocus
                />
                <TouchableOpacity style={[styles.modalBtn, styles.btnYes, { width: '100%', marginTop: 15 }]} onPress={confirmarOdometro}>
                  <Text style={styles.btnYesText}>Guardar Od├│metro</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Firma Digital */}
      <Modal visible={showSignatureModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 460, paddingBottom: 10 }]}>
            <Text style={styles.modalTitle}>✍️ Firma Digital</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
              Firma en el recuadro como comprobante de {tipo === 'salida' ? 'inicio' : 'fin'} de viaje.
            </Text>

            <SignaturePad
              strokeColor={colors.text}
              onConfirm={(uri: string) => {
                setFirmaBase64(uri);
                setShowSignatureModal(false);
              }}
              confirmText="Confirmar Firma"
              clearText="Borrar"
            />

            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 12 }}
              onPress={() => setShowSignatureModal(false)}
            >
              <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 10,
  },
  stepText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  instruction: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  captureBtn: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  aiLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  aiLoadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  finalView: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 15,
  },
  finalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  galleryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 15,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  thumbnailLabel: {
    color: colors.text,
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
  },
  retakeBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeText: { color: '#fff', fontWeight: 'bold' },
  bencinaContainer: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  bencinaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  analogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analogBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analogBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  analogText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  analogTextActive: {
    color: '#fff',
  },
  uploadBtn: {
    backgroundColor: colors.success,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 30,
  },
  disabledBtn: { opacity: 0.7 },
  uploadBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    width: '100%',
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  boldKm: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  modalQuestion: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 25,
    color: colors.text,
  },
  modalBtns: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 15,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnNo: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnNoText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  btnYes: {
    backgroundColor: colors.primary,
  },
  btnYesText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  kmInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    width: '100%',
    padding: 15,
    fontSize: 20,
    marginTop: 15,
    textAlign: 'center',
    color: colors.text,
  },
  text: { color: colors.text, fontSize: 16, marginBottom: 20 },
  btn: { backgroundColor: colors.primary, padding: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
