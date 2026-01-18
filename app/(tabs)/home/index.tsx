import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { AIAgent } from '../../../services/ai-agent';

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [creating, setCreating] = useState(false);

    const createGame = async () => {
        // For MVP, hardcoding location or random selection. In real app, use Geolocation.
        const location = "Kyoto, Japan";
        setCreating(true);

        try {
            // 1. Generate Tasks via AI
            const tasks = await AIAgent.generateBingoCard(location);

            // 2. Create Lobby
            const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data: lobby, error: lobbyError } = await supabase
                .from('lobbies')
                .insert({
                    game_code: gameCode,
                    location_name: location,
                    created_by: user!.id,
                    status: 'active'
                })
                .select()
                .single();

            if (lobbyError) throw lobbyError;

            // 3. Save Template
            const { error: templateError } = await supabase
                .from('bingo_templates')
                .insert({
                    lobby_id: lobby.id,
                    tasks_json: tasks
                });

            if (templateError) throw templateError;

            // 4. Create Creator's Card (using the template tasks as initial state with 'pending')
            const initialBoardState = tasks.map((t, i) => ({
                id: i.toString(),
                task: t.task_name, // Storing minimal info or full object
                status: 'pending',
                description: t.description,
                coordinates: t.coordinates
            }));

            const { error: cardError } = await supabase
                .from('bingo_cards')
                .insert({
                    lobby_id: lobby.id,
                    user_id: user!.id,
                    board_state_json: initialBoardState
                });

            if (cardError) throw cardError;

            // Navigate to game
            router.push(`/(game)/${lobby.id}`);

        } catch (error: any) {
            console.error('Game Creation Failed:', error);
            Alert.alert('Error', 'Failed to create game. ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Hello, {user?.user_metadata?.username || 'Explorer'}!</Text>
                <Text style={styles.subtext}>Ready for your next adventure?</Text>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Games</Text>
                <TouchableOpacity style={styles.newGameButton} onPress={createGame} disabled={creating}>
                    {creating ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Plus size={20} color="#fff" />
                            <Text style={styles.newGameText}>New Game</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.gamesList}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No active games.</Text>
                    <Text style={styles.emptySubtext}>Start a new one to get exploring!</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    header: {
        marginBottom: 30,
    },
    greeting: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    subtext: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    newGameButton: {
        flexDirection: 'row',
        backgroundColor: '#007AFF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignItems: 'center',
        minWidth: 100,
        justifyContent: 'center',
    },
    newGameText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    gamesList: {
        flexGrow: 1,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#999',
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#bbb',
        marginTop: 5,
    },
});
