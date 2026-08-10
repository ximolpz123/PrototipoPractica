import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  Text,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

interface Point {
  x: number;
  y: number;
}

interface Props {
  onConfirm: (base64: string) => void;
  onClear?: () => void;
  strokeColor?: string;
  strokeWidth?: number;
  confirmText?: string;
  clearText?: string;
}

export default function SignaturePad({
  onConfirm,
  onClear,
  strokeColor = '#1E293B',
  strokeWidth = 3,
  confirmText = 'Confirmar Firma',
  clearText = 'Borrar',
}: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const viewShotRef = useRef<ViewShot>(null);
  const isDrawing = useRef(false);

  const buildPath = (points: Point[]): string => {
    if (points.length === 0) return '';
    const [first, ...rest] = points;
    if (rest.length === 0) return `M${first.x},${first.y}`;
    let d = `M${first.x},${first.y}`;
    rest.forEach((p) => { d += ` L${p.x},${p.y}`; });
    return d;
  };

  const currentPoints = useRef<Point[]>([]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      const { locationX, locationY } = evt.nativeEvent;
      currentPoints.current = [{ x: locationX, y: locationY }];
      setCurrentPath(buildPath(currentPoints.current));
      isDrawing.current = true;
    },
    onPanResponderMove: (evt: GestureResponderEvent) => {
      if (!isDrawing.current) return;
      const { locationX, locationY } = evt.nativeEvent;
      currentPoints.current.push({ x: locationX, y: locationY });
      setCurrentPath(buildPath(currentPoints.current));
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        setPaths((prev) => [...prev, currentPath]);
      }
      setCurrentPath('');
      currentPoints.current = [];
      isDrawing.current = false;
    },
  });

  const handleClear = useCallback(() => {
    setPaths([]);
    setCurrentPath('');
    currentPoints.current = [];
    onClear?.();
  }, [onClear]);

  const handleConfirm = useCallback(async () => {
    if (paths.length === 0 && !currentPath) {
      return null; // Nothing drawn
    }
    // Capture as base64 PNG using ViewShot
    if (viewShotRef.current && (viewShotRef.current as any).capture) {
      try {
        const uri = await (viewShotRef.current as any).capture();
        onConfirm(uri);
      } catch {
        // fallback: return SVG paths as JSON string
        onConfirm(JSON.stringify(paths));
      }
    } else {
      onConfirm(JSON.stringify(paths));
    }
  }, [paths, currentPath, onConfirm]);

  const isEmpty = paths.length === 0 && !currentPath;

  return (
    <View style={styles.container}>
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 0.8 }}
        style={styles.canvasWrapper}
      >
        <View
          style={styles.canvas}
          {...panResponder.panHandlers}
        >
          <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 220">
            {paths.map((d, i) => (
              <Path
                key={i}
                d={d}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>

          {isEmpty && (
            <Text style={styles.placeholder}>Dibuja tu firma aquí</Text>
          )}
        </View>
      </ViewShot>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearText}>{clearText}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, isEmpty && styles.confirmBtnDisabled]}
          onPress={isEmpty ? undefined : handleConfirm}
        >
          <Text style={styles.confirmText}>{confirmText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    color: '#CBD5E1',
    fontSize: 16,
    pointerEvents: 'none',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  clearBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  clearText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#5C99CC',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#9CB3C9',
  },
  confirmText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
