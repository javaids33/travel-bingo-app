import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

interface FeedItem {
    id: string;
    image_url: string;
    created_at: string;
    user_id: string; // In real app, join with profiles
    ai_feedback?: string;
}

interface FeedDrawerProps {
    visible: boolean;
    onClose: () => void;
    lobbyId: string;
}

export default function FeedDrawer({ visible, onClose, lobbyId }: FeedDrawerProps) {
    const [feed, setFeed] = useState<FeedItem[]>([]);

    useEffect(() => {
        if (visible) {
            fetchFeed();
        }
    }, [visible]);

    const fetchFeed = async () => {
        // Join logic would be better server side or view, but mocking simple fetch
        // We need to fetch submissions for cards in this lobby
        // This query is a bit complex for simple client side without joining cards, 
        // assuming we have a way to filter submissions by lobby directly or via card IDs.
        // Simplified: Fetch latest verified submissions globally for now or mock

        // Correct approach: 
        // 1. Get card IDs for this lobby
        // 2. Get submissions for those cards

        const { data: cards } = await supabase.from('bingo_cards').select('id').eq('lobby_id', lobbyId);
        if (cards && cards.length > 0) {
            const cardIds = cards.map(c => c.id);
            const { data: submissions } = await supabase
                .from('submissions')
                .select('*')
                .in('card_id', cardIds)
                .eq('status', 'verified')
                .order('created_at', { ascending: false })
                .limit(20);

            if (submissions) {
                setFeed(submissions as any);
            }
        }
    };

    const renderItem = ({ item }: { item: FeedItem }) => (
        <View style={styles.item}>
            <Image source={{ uri: item.image_url }} style={styles.image} />
            <View style={styles.info}>
                <Text style={styles.user}>Player {item.user_id.slice(0, 4)}...</Text>
                <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleTimeString()}</Text>
                {item.ai_feedback && <Text style={styles.feedback}>{item.ai_feedback}</Text>}
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Live Feed</Text>
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={feed}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No submissions yet.</Text>}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    list: {
        padding: 20,
    },
    item: {
        flexDirection: 'row',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
        paddingBottom: 10,
    },
    image: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    info: {
        marginLeft: 15,
        flex: 1,
        justifyContent: 'center',
    },
    user: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    timestamp: {
        color: '#999',
        fontSize: 12,
    },
    feedback: {
        color: '#007AFF',
        fontSize: 12,
        marginTop: 2,
    },
    empty: {
        textAlign: 'center',
        color: '#999',
        marginTop: 50,
    }
});
