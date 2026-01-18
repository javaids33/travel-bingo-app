import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Check, UserPlus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Friend {
    id: string; // friendship id
    friend_id: string;
    username: string;
    avatar_url: string;
    status: 'pending' | 'accepted';
    is_sender: boolean;
}

export default function FriendsScreen() {
    const { user } = useAuth();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchFriends();
            subscribeToFriendships();
        }
    }, [user]);

    const fetchFriends = async () => {
        try {
            // Supabase is tricky with OR queries in joins, so we might need two queries or a function
            // Simplest for MVP: Get all friendships where user is 1 or 2
            const { data, error } = await supabase
                .from('friendships')
                .select(`
            id,
            status,
            user_id_1,
            user_id_2,
            profile1:user_id_1 (username, avatar_url),
            profile2:user_id_2 (username, avatar_url)
        `)
                .or(`user_id_1.eq.${user!.id},user_id_2.eq.${user!.id}`);

            if (error) throw error;

            const formatted: Friend[] = data.map((item: any) => {
                const isUser1 = item.user_id_1 === user!.id;
                const friendProfile = isUser1 ? item.profile2 : item.profile1;
                const friendId = isUser1 ? item.user_id_2 : item.user_id_1;

                return {
                    id: item.id,
                    friend_id: friendId,
                    username: friendProfile?.username || 'Unknown',
                    avatar_url: friendProfile?.avatar_url,
                    status: item.status,
                    is_sender: item.user_id_1 === user!.id // true if I sent the request
                };
            });

            setFriends(formatted);
        } catch (error) {
            console.error('Error fetching friends:', error);
        }
    };

    const subscribeToFriendships = () => {
        const channel = supabase
            .channel('friendships_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
                fetchFriends();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const addFriend = async () => {
        if (!searchQuery) return;
        setLoading(true);
        try {
            // 1. Find user by username
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', searchQuery)
                .single();

            if (profileError || !profiles) {
                Alert.alert('Error', 'User not found');
                return;
            }

            if (profiles.id === user!.id) {
                Alert.alert('Error', 'You cannot add yourself');
                return;
            }

            // 2. Create friendship
            const { error: insertError } = await supabase
                .from('friendships')
                .insert({
                    user_id_1: user!.id,
                    user_id_2: profiles.id,
                    status: 'pending'
                });

            if (insertError) {
                if (insertError.code === '23505') { // Unique violation
                    Alert.alert('Info', 'Friend request already exists');
                } else {
                    throw insertError;
                }
            } else {
                Alert.alert('Success', 'Friend request sent!');
                setSearchQuery('');
            }

        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const respondToRequest = async (friendshipId: string, accept: boolean) => {
        try {
            if (accept) {
                await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
            } else {
                await supabase.from('friendships').delete().eq('id', friendshipId);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const renderItem = ({ item }: { item: Friend }) => (
        <View style={styles.item}>
            <View style={styles.avatarPlaceholder}>
                {/* <Image source={{ uri: item.avatar_url }} style={styles.avatar} /> */}
                <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.status}>
                    {item.status === 'accepted' ? 'Friend' : (item.is_sender ? 'Request Sent' : 'Request Received')}
                </Text>
            </View>

            {item.status === 'pending' && !item.is_sender && (
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => respondToRequest(item.id, true)} style={styles.actionBtn}>
                        <Check size={20} color="green" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => respondToRequest(item.id, false)} style={styles.actionBtn}>
                        <X size={20} color="red" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Add friend by username..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                />
                <TouchableOpacity style={styles.addBtn} onPress={addFriend} disabled={loading}>
                    <UserPlus size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={friends}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    searchContainer: {
        padding: 15,
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 10,
        borderRadius: 8,
        marginRight: 10,
    },
    addBtn: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 8,
    },
    list: {
        padding: 15,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#666',
    },
    info: {
        marginLeft: 15,
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    status: {
        fontSize: 12,
        color: '#999',
    },
    actions: {
        flexDirection: 'row',
        gap: 15,
    },
    actionBtn: {
        padding: 5,
    }
});
