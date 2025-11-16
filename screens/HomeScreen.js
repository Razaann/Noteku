import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';

export default function HomeScreen({ navigation }) {
    const [notes, setNotes] = useState([
        { id: '1', title: "Example Note", content: "This is a sample note." },
        { id: '2', title: "Another Note", content: "Grid UI works!" },
    ]);

    return (
        <View style={styles.container}>

        {/* Grid Notes */}
        <FlatList
            data={notes}
            numColumns={2}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
                <TouchableOpacity 
                    style={styles.card}
                    onPress={() => navigation.navigate("Editor", { note: item })}
                >
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.content} numberOfLines={4}>
                    {item.content}
                    </Text>
                </TouchableOpacity>
            )}
        />

        {/* Floating Add Button */}
        <TouchableOpacity 
            style={styles.fab}
            onPress={() => navigation.navigate("Editor")}
        >
            <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        </View>
    );
    }

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    card: {
        backgroundColor: "#fff",
        flex: 1,
        padding: 15,
        margin: 5,
        borderRadius: 10,
        elevation: 2
    },
    title: {
        fontWeight: "bold",
        marginBottom: 5
    },
    content: {
        color: "#444"
    },
    fab: {
        position: "absolute",
        right: 20,
        bottom: 20,
        backgroundColor: "#000",
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        elevation: 5
    },
    fabText: {
        color: "white",
        fontSize: 32,
        marginTop: -4
    }
});