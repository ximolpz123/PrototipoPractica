import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = {
  title: string;
  message: string;
  buttons?: AlertButton[];
};

interface AlertContextType {
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert debe usarse dentro de un AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  const showAlert = (title: string, message: string, buttons?: AlertButton[]) => {
    setOptions({ title, message, buttons: buttons || [{ text: 'OK' }] });
    setVisible(true);
  };

  const handleClose = (onPress?: () => void) => {
    setVisible(false);
    setTimeout(() => {
      if (onPress) onPress();
    }, 200); // Wait for modal hide animation
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => handleClose()}>
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <View style={styles.header}>
              <Ionicons 
                name={options?.title.toLowerCase().includes('error') ? 'warning' : 'information-circle'} 
                size={28} 
                color={options?.title.toLowerCase().includes('error') ? COLORS.danger : COLORS.primary} 
                style={styles.icon}
              />
              <Text style={styles.title}>{options?.title}</Text>
            </View>
            
            <Text style={styles.message}>{options?.message}</Text>
            
            <View style={styles.buttonContainer}>
              {options?.buttons?.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isDestructive ? styles.buttonDestructive : isCancel ? styles.buttonCancel : styles.buttonDefault,
                      options.buttons!.length > 1 && { flex: 1, marginLeft: index > 0 ? 10 : 0 } // distribute evenly
                    ]}
                    onPress={() => handleClose(btn.onPress)}
                  >
                    <Text style={[
                      styles.buttonText,
                      isDestructive ? styles.buttonTextDestructive : isCancel ? styles.buttonTextCancel : styles.buttonTextDefault
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Oscuro moderno
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  message: {
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  buttonDefault: {
    backgroundColor: COLORS.primary,
  },
  buttonCancel: {
    backgroundColor: '#F1F5F9', // Gris claro
  },
  buttonDestructive: {
    backgroundColor: COLORS.danger,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextDefault: {
    color: COLORS.white,
  },
  buttonTextCancel: {
    color: COLORS.text,
  },
  buttonTextDestructive: {
    color: COLORS.white,
  },
});
