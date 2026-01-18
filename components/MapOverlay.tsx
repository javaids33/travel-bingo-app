import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { BingoTask } from '../services/ai-agent';

interface MapOverlayProps {
    tasks: BingoTask[];
    userLocation?: {
        latitude: number;
        longitude: number;
    };
}

export default function MapOverlay({ tasks, userLocation }: MapOverlayProps) {
    // Filter tasks with valid coordinates
    const markers = tasks.filter(t => t.coordinates && t.coordinates.lat && t.coordinates.long);

    const initialRegion = userLocation ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    } : undefined;

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {markers.map((task, index) => (
                    <Marker
                        key={index}
                        coordinate={{
                            latitude: task.coordinates!.lat,
                            longitude: task.coordinates!.long,
                        }}
                        title={task.task_name}
                        description={task.description}
                    />
                ))}
            </MapView>
            {markers.length === 0 && (
                <View style={styles.overlay}>
                    <Text style={styles.warning}>No location-specific tasks to show.</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 300,
        width: '100%',
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 20,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        padding: 5,
        borderRadius: 5,
    },
    warning: {
        fontSize: 12,
        color: '#666',
    }
});
