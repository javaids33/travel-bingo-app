import { CameraView, useCameraPermissions } from 'expo-camera';
import { Aperture, Check, RefreshCw, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TaskCameraProps {
    visible: boolean;
    onClose: () => void;
    onPhotoTaken: (photoUri: string) => void;
}

export default function TaskCamera({ visible, onClose, onPhotoTaken }: TaskCameraProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<'back' | 'front'>('back');
    const [photo, setPhoto] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null);

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        return (
            <Modal visible={visible} animationType="slide">
                <View style={styles.container}>
                    <Text style={styles.message}>We need your permission to show the camera</Text>
                    <TouchableOpacity onPress={requestPermission} style={styles.button}>
                        <Text style={styles.text}>Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#333" />
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    function toggleCameraFacing() {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    }

    async function takePicture() {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
                if (photo) {
                    setPhoto(photo.uri);
                }
            } catch (e) {
                console.error(e);
            }
        }
    }

    const handleConfirm = () => {
        if (photo) {
            onPhotoTaken(photo);
            setPhoto(null);
        }
    };

    const handleRetake = () => {
        setPhoto(null);
    };

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.container}>
                {photo ? (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: photo }} style={styles.preview} />
                        <View style={styles.previewControls}>
                            <TouchableOpacity onPress={handleRetake} style={styles.controlBtn}>
                                <RefreshCw size={24} color="#fff" />
                                <Text style={styles.controlText}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleConfirm} style={[styles.controlBtn, styles.confirmBtn]}>
                                <Check size={24} color="#fff" />
                                <Text style={styles.controlText}>Use Photo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
                        <View style={styles.controlsContainer}>
                            <TouchableOpacity style={styles.topControl} onPress={onClose}>
                                <X size={30} color="#fff" />
                            </TouchableOpacity>

                            <View style={styles.bottomControls}>
                                <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                                    <RefreshCw size={24} color="#fff" />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                                    <Aperture size={60} color="#fff" />
                                </TouchableOpacity>

                                <View style={{ width: 40 }} />
                            </View>
                        </View>
                    </CameraView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: '#fff',
    },
    camera: {
        flex: 1,
    },
    controlsContainer: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50,
    },
    topControl: {
        alignSelf: 'flex-start',
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    flipButton: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 25,
    },
    captureButton: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 50,
        padding: 5,
    },
    // Preview
    previewContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    preview: {
        flex: 1,
    },
    previewControls: {
        position: 'absolute',
        bottom: 30,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
    controlBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 15,
        borderRadius: 30,
    },
    confirmBtn: {
        backgroundColor: '#007AFF',
    },
    controlText: {
        color: '#fff',
        marginLeft: 10,
        fontWeight: 'bold',
    },
    // Permission fallback
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        margin: 20,
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontWeight: 'bold',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 20,
    }
});
