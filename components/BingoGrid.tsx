import { Check } from 'lucide-react-native';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface GridCell {
    id: string; // task_index or unique ID
    task: string;
    status: 'pending' | 'verified' | 'rejected' | 'completed_client'; // completed_client for immediate feedback
}

interface BingoGridProps {
    cells: GridCell[];
    onCellPress: (cell: GridCell, index: number) => void;
}

const { width } = Dimensions.get('window');
const GRID_SIZE = 5;
const CELL_SIZE = (width - 40 - (GRID_SIZE - 1) * 5) / GRID_SIZE; // 20px padding (x2), 5px gap

export default function BingoGrid({ cells, onCellPress }: BingoGridProps) {
    return (
        <View style={styles.gridContainer}>
            {cells.map((cell, index) => {
                const isCompleted = cell.status === 'verified' || cell.status === 'completed_client';
                return (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.cell,
                            isCompleted && styles.completedCell,
                            cell.status === 'rejected' && styles.rejectedCell,
                        ]}
                        onPress={() => onCellPress(cell, index)}
                        activeOpacity={0.7}
                    >
                        {isCompleted && (
                            <View style={styles.iconContainer}>
                                <Check size={20} color="#fff" strokeWidth={3} />
                            </View>
                        )}
                        <Text
                            style={[styles.cellText, isCompleted && styles.completedText]}
                            numberOfLines={3}
                            adjustsFontSizeToFit
                        >
                            {cell.task}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
        justifyContent: 'center',
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        position: 'relative',
    },
    completedCell: {
        backgroundColor: '#4CAF50', // Green
        borderColor: '#388E3C',
    },
    rejectedCell: {
        backgroundColor: '#FFCDD2',
        borderColor: '#E57373',
    },
    cellText: {
        fontSize: 10,
        textAlign: 'center',
        color: '#333',
        fontWeight: '500',
    },
    completedText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    iconContainer: {
        position: 'absolute',
        top: 2,
        right: 2,
        zIndex: 1,
        opacity: 0.8,
    }
});
