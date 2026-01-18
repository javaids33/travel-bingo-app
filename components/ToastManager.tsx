import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function ToastManager() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<{ id: string, message: string }[]>([]);

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    showToast(payload.new.message);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const showToast = (message: string) => {
        const id = Math.random().toString();
        setMessages(prev => [...prev, { id, message }]);

        // Auto hide
        setTimeout(() => {
            setMessages(prev => prev.filter(m => m.id !== id));
        }, 4000);
    };

    if (messages.length === 0) return null;

    return (
        <View style={styles.container}>
            {messages.map((msg) => (
                <View key={msg.id} style={styles.toast}>
                    <Text style={styles.text}>{msg.message}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        zIndex: 9999,
    },
    toast: {
        backgroundColor: '#323232',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    text: {
        color: '#fff',
        fontSize: 14,
    }
});
