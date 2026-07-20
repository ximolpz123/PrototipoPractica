import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, API_URL } from '../constants';
import axios from 'axios';
import { authService } from '../services/auth.service';

export default function CameraScreen({ route, navigation }: any) {
  const { reservaId, tipo } = route.params; // 'salida' o 'retorno'
  
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Necesitamos permiso para usar la cámara</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Otorgar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && photos.length < 4) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, // Reduce quality a bit to save bandwidth
        base64: false,
      });
      if (photo) {
        setPhotos([...photos, photo.uri]);
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const uploadPhotos = async () => {
    if (photos.length === 0) {
      Alert.alert('Error', 'Debes tomar al menos 1 foto');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('tipo', tipo);
      
      photos.forEach((photoUri, index) => {
        const filename = photoUri.split('/').pop() || `foto_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('fotos', {
          uri: photoUri,
          name: filename,
          type,
        } as any);
      });

      // Obtener token para la petición
      const token = await authService.getToken();

      // Realizar la petición real al backend
      await axios.post(`${API_URL}/reservations/${reservaId}/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      Alert.alert('Éxito', 'Las fotos han sido subidas correctamente a Cloudinary y guardadas en la base de datos.');
      navigation.goBack();
    } catch (error: any) {
      console.error(error.response?.data || error);
      Alert.alert('Error', 'No se pudieron subir las fotos. Verifica la consola.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {photos.length < 4 ? (
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.overlay}>
            <Text style={styles.instruction}>
              Toma foto de evidencia ({photos.length}/4)
            </Text>
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.text}>¡Límite de 4 fotos alcanzado!</Text>
        </View>
      )}

      <View style={styles.gallery}>
        {photos.map((uri, index) => (
          <TouchableOpacity key={index} onPress={() => removePhoto(index)}>
            <Image source={{ uri }} style={styles.thumbnail} />
            <View style={styles.deleteBadge}>
              <Text style={styles.deleteText}>X</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.uploadBtn, (photos.length === 0 || uploading) && styles.disabledBtn]} 
        onPress={uploadPhotos}
        disabled={photos.length === 0 || uploading}
      >
        {uploading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.uploadBtnText}>
            Subir Fotos ({photos.length})
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 40,
  },
  instruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  captureBtn: {
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: { color: COLORS.text, fontSize: 16, marginBottom: 20 },
  btn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  gallery: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumbnail: { width: 70, height: 70, borderRadius: 8 },
  deleteBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  uploadBtn: {
    backgroundColor: COLORS.success,
    padding: 16,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.5 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
