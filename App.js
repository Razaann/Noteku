import React, { useState, useEffect, useCallback } from "react";
import { 
    Text, View, StyleSheet, TouchableOpacity, FlatList, 
    SafeAreaView, TextInput, Alert, KeyboardAvoidingView, 
    Platform, ScrollView 
} from "react-native";
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { actions, RichEditor, RichToolbar } from "react-native-pell-rich-editor";

const Stack = createStackNavigator();

// --- SCREEN 1: THE EDITOR (Your modified code) ---
const EditorScreen = ({ route, navigation }) => {
    const richText = React.useRef();
    // If we are editing an existing note, get its data
    const { noteToEdit } = route.params || {}; 
    
    const [title, setTitle] = useState(noteToEdit ? noteToEdit.title : "");
    const [descHTML, setDescHTML] = useState(noteToEdit ? noteToEdit.content : "");

    // Load content into editor once it mounts
    useEffect(() => {
        if (noteToEdit && richText.current) {
            richText.current.setContentHTML(noteToEdit.content);
        }
    }, []);

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Error", "Please give your note a title!");
            return;
        }

        const newNote = {
            id: noteToEdit ? noteToEdit.id : Date.now().toString(),
            title: title,
            content: descHTML,
            date: new Date().toLocaleDateString(),
        };

        try {
            // 1. Get existing notes
            const existingNotes = await AsyncStorage.getItem('NOTES');
            let notes = existingNotes ? JSON.parse(existingNotes) : [];

            // 2. Update or Add
            if (noteToEdit) {
                const index = notes.findIndex(n => n.id === noteToEdit.id);
                notes[index] = newNote;
            } else {
                notes.push(newNote);
            }

            // 3. Save back to storage
            await AsyncStorage.setItem('NOTES', JSON.stringify(notes));
            navigation.goBack(); // Go back to Home
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#222" }}>
            <View style={styles.editorHeader}>
                <TextInput
                    placeholder="Title..."
                    style={styles.titleInput}
                    value={title}
                    onChangeText={setTitle}
                />
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                    <RichToolbar
                        editor={richText}
                        actions={[actions.setBold, actions.insertBulletsList, actions.insertOrderedList, actions.setItalic, actions.setUnderline, actions.heading1]}
                        iconMap={{ [actions.heading1]: ({ tintColor }) => (<Text style={{ color: tintColor }}>H1</Text>) }}
                    />
                    <RichEditor
                        ref={richText}
                        initialContentHTML={descHTML}
                        placeholder="Start writing your note here..."
                        onChange={descriptionText => setDescHTML(descriptionText)}
                        style={{ minHeight: 300, backgroundColor: "#222", color: "white" }}
                        editorStyle={{
                            backgroundColor: '#222',
                            color: 'white',
                            placeholderColor: 'gray',
                        }}
                    />
                </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView>
    );
};

// --- SCREEN 2: THE HOME (Grid UI) ---
const HomeScreen = ({ navigation }) => {
    const [notes, setNotes] = useState([]);

    // Load notes whenever this screen comes into focus
    useFocusEffect(
        useCallback(() => {
            getNotes();
        }, [])
    );

    const getNotes = async () => {
        try {
            const storedNotes = await AsyncStorage.getItem('NOTES');
            if (storedNotes) setNotes(JSON.parse(storedNotes));
        } catch (e) {
            console.error(e);
        }
    };

    const renderNoteItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigation.navigate('Editor', { noteToEdit: item })}
        >
            <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.noteDate}>{item.date}</Text>
            {/* We strip HTML tags for preview roughly, or just show "View Note" */}
            <Text style={styles.notePreview} numberOfLines={3}>
                {item.content.replace(/<[^>]+>/g, '')} 
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.appTitle}>Noteku</Text>
            <FlatList
                data={notes}
                numColumns={2} // THIS MAKES IT A GRID
                keyExtractor={item => item.id}
                renderItem={renderNoteItem}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No notes yet. Create one!</Text>}
            />
            
            {/* Floating Action Button (FAB) */}
            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => navigation.navigate('Editor')}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

// --- MAIN APP: NAVIGATION SETUP ---
const App = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Editor" component={EditorScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

// --- STYLES ---
const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#222222' },
    appTitle: { fontSize: 30, fontWeight: 'bold', color: 'white', marginBottom: 20, textAlign: 'center', marginTop: 30 },
    
    // Grid Styles
    gridItem: {
        backgroundColor: 'black', // Card background
        width: '48%', // Approximately half width for 2 columns
        marginBottom: 15,
        padding: 15,
        borderRadius: 10,
        elevation: 3, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    noteTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5, color: 'white' },
    noteDate: { fontSize: 10, color: 'gray', marginBottom: 5 },
    notePreview: { fontSize: 12, color: '#b6b6b6ff' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: 'gray' },

    // Editor Styles
    editorHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center', backgroundColor: '#000000ff' },
    titleInput: { fontSize: 20, fontWeight: 'bold', flex: 1, color: 'white' },
    saveBtn: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 5 },
    saveBtnText: { color: 'black', fontWeight: 'bold' },

    // FAB Styles
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        backgroundColor: 'blue',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    fabText: { fontSize: 30, color: 'white', marginTop: -3 }
});

export default App;