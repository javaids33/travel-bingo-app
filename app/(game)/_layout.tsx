import { Stack } from 'expo-router';

export default function GameLayout() {
    return (
        <Stack>
            <Stack.Screen name="[lobbyId]" options={{ title: 'Bingo Game', headerBackTitle: 'Home' }} />
        </Stack>
    );
}
