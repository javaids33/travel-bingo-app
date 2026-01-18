import { useLocalSearchParams, useRouter } from 'expo-router';
import { Grid, Map as MapIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BingoGrid, { GridCell } from '../../components/BingoGrid';
import MapOverlay from '../../components/MapOverlay';
import TaskCamera from '../../components/TaskCamera';
import { useAuth } from '../../contexts/AuthContext';
import { uploadImage } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { AIAgent } from '../../services/ai-agent';

export default function GameLobby() {
    const { lobbyId } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [lobby, setLobby] = useState<any>(null);
    const [card, setCard] = useState<any>(null);
    const [cells, setCells] = useState<GridCell[]>([]);

    // Verification State
    const [cameraVisible, setCameraVisible] = useState(false);
    const [activeTaskIndex, setActiveTaskIndex] = useState<number | null>(null);
    const [verifying, setVerifying] = useState(false);

    // View Mode
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

    useEffect(() => {
        if (lobbyId && user) {
            fetchGameData();
            subscribeToRealtime();
        }
        return () => {
            supabase.removeAllChannels();
        };
    }, [lobbyId, user]);

    const fetchGameData = async () => {
        try {
            setLoading(true);
            // Fetch Lobby
            const { data: lobbyData, error: lobbyError } = await supabase
                .from('lobbies')
                .select('*')
                .eq('id', lobbyId)
                .single();

            if (lobbyError) throw lobbyError;
            setLobby(lobbyData);

            // Fetch User's Card
            const { data: cardData, error: cardError } = await supabase
                .from('bingo_cards')
                .select('*')
                .eq('lobby_id', lobbyId)
                .eq('user_id', user!.id)
                .single();

            if (cardError && cardError.code !== 'PGRST116') throw cardError;

            if (!cardData) {
                Alert.alert('Error', 'Bingo card not found for this game.');
                return;
            }

            setCard(cardData);
            setCells((cardData.board_state_json as GridCell[]) || []);

        } catch (error: any) {
            console.error('Error fetching game data:', error);
            Alert.alert('Error', 'Failed to load game.');
        } finally {
            setLoading(false);
        }
    };

    const subscribeToRealtime = () => {
        const channel = supabase
            .channel(`game:${lobbyId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bingo_cards',
                    filter: `lobby_id=eq.${lobbyId}`,
                },
                (payload) => {
                    if (payload.new.user_id === user!.id) {
                        setCard(payload.new);
                        setCells(payload.new.board_state_json as GridCell[]);
                    }
                }
            )
            .subscribe();
    };

    const handleCellPress = (cell: GridCell, index: number) => {
        if (cell.status === 'verified' || cell.status === 'completed_client') return;

        Alert.alert(
            cell.task,
            'Take a photo to complete this task!',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: () => {
                        setActiveTaskIndex(index);
                        setCameraVisible(true);
                    }
                }
            ]
        );
    };

    const handlePhotoTaken = async (uri: string) => {
        setCameraVisible(false);
        if (activeTaskIndex === null) return;
        setVerifying(true);

        const task = cells[activeTaskIndex].task;
        const description = (cells[activeTaskIndex] as any).description || task;

        try {
            // 1. Upload Image
            const publicUrl = await uploadImage(uri);

            // 2. AI Verification
            const validation = await AIAgent.validateSubmission(publicUrl, description);

            if (validation.verified) {
                // 3. Update DB
                const newCells = [...cells];
                newCells[activeTaskIndex].status = 'verified';
                setCells(newCells);

                // Update Card
                await supabase.from('bingo_cards').update({ board_state_json: newCells }).eq('id', card.id);

                // Create Submission Record
                await supabase.from('submissions').insert({
                    card_id: card.id,
                    task_index: activeTaskIndex,
                    image_url: publicUrl,
                    status: 'verified',
                    ai_feedback: validation.reason
                });

                Alert.alert('Success!', `Task Verified: ${validation.reason}`);
            } else {
                Alert.alert('Not Verified', `AI says: ${validation.reason}`);

                // Log failed submission
                await supabase.from('submissions').insert({
                    card_id: card.id,
                    task_index: activeTaskIndex,
                    image_url: publicUrl,
                    status: 'rejected',
                    ai_feedback: validation.reason
                });

                // Update status to rejected
                const newCells = [...cells];
                newCells[activeTaskIndex].status = 'rejected';
                setCells(newCells);
                await supabase.from('bingo_cards').update({ board_state_json: newCells }).eq('id', card.id);
            }

        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setVerifying(false);
            setActiveTaskIndex(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>Loading Bingo World...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.locationTitle}>{lobby?.location_name || 'Unknown Location'}</Text>
                    <Text style={styles.gameCode}>Code: {lobby?.game_code}</Text>
                </View>

                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'grid' && styles.activeToggle]}
                        onPress={() => setViewMode('grid')}
                    >
                        <Grid size={20} color={viewMode === 'grid' ? '#fff' : '#666'} />
                        <Text style={[styles.toggleText, viewMode === 'grid' && styles.activeText]}>Grid</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'map' && styles.activeToggle]}
                        onPress={() => setViewMode('map')}
                    >
                        <MapIcon size={20} color={viewMode === 'map' ? '#fff' : '#666'} />
                        <Text style={[styles.toggleText, viewMode === 'map' && styles.activeText]}>Map</Text>
                    </TouchableOpacity>
                </View>

                {viewMode === 'grid' ? (
                    <BingoGrid cells={cells} onCellPress={handleCellPress} />
                ) : (
                    <MapOverlay tasks={cells.map(c => ({ task_name: c.task, description: (c as any).description, coordinates: (c as any).coordinates }))} />
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Explore the area and snap photos to win!</Text>
                </View>
            </ScrollView>

            {verifying && (
                <View style={styles.verifyingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.verifyingText}>Verifying Submission...</Text>
                </View>
            )}

            <TaskCamera
                visible={cameraVisible}
                onClose={() => setCameraVisible(false)}
                onPhotoTaken={handlePhotoTaken}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    locationTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    gameCode: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 25,
        padding: 5,
    },
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    activeToggle: {
        backgroundColor: '#007AFF',
    },
    toggleText: {
        marginLeft: 5,
        fontWeight: 'bold',
        color: '#666',
    },
    activeText: {
        color: '#fff',
    },
    footer: {
        marginTop: 30,
        alignItems: 'center',
    },
    footerText: {
        color: '#888',
        fontStyle: 'italic',
    },
    verifyingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    verifyingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 18,
        fontWeight: 'bold',
    }
});
