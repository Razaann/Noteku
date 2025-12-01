import React, { useState, useEffect, useCallback } from "react";
import { 
    Text, View, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { actions, RichEditor, RichToolbar } from "react-native-pell-rich-editor";
import * as ImagePicker from 'expo-image-picker';

const Stack = createStackNavigator();

// Note Functionality
// --- REPLACE YOUR EditorScreen COMPONENT ---
const EditorScreen = ({ route, navigation }) => {
    const richText = React.useRef();
    const { noteToEdit } = route.params || {}; 
    
    const [title, setTitle] = useState(noteToEdit ? noteToEdit.title : "");
    const [descHTML, setDescHTML] = useState(noteToEdit ? noteToEdit.content : "");

    useEffect(() => {
        if (noteToEdit && richText.current) {
            richText.current.setContentHTML(noteToEdit.content);
        }
    }, []);

    // --- IMAGE PICKER FUNCTION ---
    const handleAddImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            base64: true,
            quality: 0.5,
        });

        if (!result.canceled) {
            const imageAsset = result.assets[0];
            const base64String = `data:image/jpeg;base64,${imageAsset.base64}`;
            richText.current?.insertImage(base64String, 'width: 100%; height: auto;');
            richText.current?.insertHTML('<br />');
        }
    };

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
            const existingNotes = await AsyncStorage.getItem('NOTES');
            let notes = existingNotes ? JSON.parse(existingNotes) : [];

            if (noteToEdit) {
                const index = notes.findIndex(n => n.id === noteToEdit.id);
                notes[index] = newNote;
            } else {
                notes.push(newNote);
            }
            await AsyncStorage.setItem('NOTES', JSON.stringify(notes));
            navigation.navigate("Home"); 
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not save note.");
        }
    };

    const handleDelete = async () => {
        Alert.alert("Delete Note", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    try {
                        const existingNotes = await AsyncStorage.getItem('NOTES');
                        let notes = existingNotes ? JSON.parse(existingNotes) : [];
                        notes = notes.filter(n => n.id !== noteToEdit.id);
                        await AsyncStorage.setItem('NOTES', JSON.stringify(notes));
                        navigation.navigate("Home");
                    } catch (e) { console.error(e); }
                }
            }
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
            <View style={styles.editorHeader}>
                <TextInput
                    placeholder="Title..."
                    style={styles.titleInput}
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor="#888"
                />
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                {noteToEdit && (
                    <TouchableOpacity
                        onPress={handleDelete}
                        style={[styles.saveBtn, { backgroundColor: '#cf1b1b', marginLeft: 10 }]}
                    >
                        <Text style={[styles.saveBtnText, { color: 'white' }]}>Delete</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={{ backgroundColor: '#222222' }}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                    {/* --- UPDATED TOOLBAR WITH UNDO, REDO, CHECKBOX --- */}
                    <RichToolbar
                        editor={richText}
                        actions={[
                            actions.undo,
                            actions.redo,
                            actions.setBold, 
                            actions.setItalic,
                            actions.setUnderline, 
                            actions.heading1,
                            actions.insertBulletsList, 
                            actions.insertOrderedList, 
                            actions.checkboxList,
                            actions.insertImage,      
                        ]}
                        onPressAddImage={handleAddImage} 
                        iconMap={{ [actions.heading1]: ({ tintColor }) => (<Text style={{ color: tintColor }}>H1</Text>) }}
                        style={{ backgroundColor: '#333' }} 
                    />
                    
                    <RichEditor
                        ref={richText}
                        initialContentHTML={descHTML}
                        placeholder="Start writing..."
                        onChange={descriptionText => setDescHTML(descriptionText)}
                        style={{ minHeight: 300, backgroundColor: "#222222" }}
                        editorStyle={{
                            cssText: 'body { text-align: justify; }',
                            backgroundColor: '#222222',
                            color: 'white',
                            placeholderColor: 'gray',
                            contentCSSText: 'img { width: 100%; height: auto; }' 
                        }}
                    />
                </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView>
    );
};

// Homepage UI
const HomeScreen = ({ navigation }) => {
    const [notes, setNotes] = useState([]);

    useFocusEffect(
        useCallback(() => {
            getNotes();
        }, [])
    );

    const getNotes = async () => {
        try {
            const storedNotes = await AsyncStorage.getItem('NOTES');
            if (storedNotes) setNotes(JSON.parse(storedNotes).reverse()); // .reverse() shows newest first
        } catch (e) {
            console.error(e);
        }
    };

    // Helper to render a single card
    const renderCard = (item) => (
        <TouchableOpacity 
            key={item.id} 
            style={styles.gridItem} 
            onPress={() => navigation.navigate('Editor', { noteToEdit: item })}
        >
            <Text style={styles.noteTitle}>{item.title}</Text>
            <Text style={styles.noteDate}>{item.date}</Text>
            {/* Allow up to 10 lines so the height varies based on content */}
            <Text style={styles.notePreview} numberOfLines={10}>
                {item.content.replace(/<[^>]+>/g, '').trim()} 
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.appTitle}>Noteku</Text>
            
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {notes.length === 0 ? (
                    <Text style={styles.emptyText}>No notes yet. Create one!</Text>
                ) : (
                    // THE MASONRY LAYOUT
                    <View style={styles.masonryContainer}>
                        {/* LEFT COLUMN (Even Index: 0, 2, 4...) */}
                        <View style={styles.column}>
                            {notes.filter((_, i) => i % 2 === 0).map(renderCard)}
                        </View>

                        {/* RIGHT COLUMN (Odd Index: 1, 3, 5...) */}
                        <View style={styles.column}>
                            {notes.filter((_, i) => i % 2 !== 0).map(renderCard)}
                        </View>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => navigation.navigate('Editor')}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

// Main App
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

// Styling
// --- REPLACE YOUR STYLES ---
const styles = StyleSheet.create({
    // Main Background
    container: { flex: 1, padding: 20, backgroundColor: '#222222' }, 
    
    appTitle: { fontSize: 30, fontWeight: 'bold', color: 'white', marginBottom: 20, textAlign: 'center', marginTop: 10 },
    
    // Masonry Layout Styles (NEW)
    masonryContainer: {
        flexDirection: 'row',   // Arrange columns side by side
        justifyContent: 'space-between',
    },
    column: {
        flex: 1,                // Each column takes 50% width
        marginHorizontal: 5,    // Gap between columns
    },

    // Note Cards
    gridItem: {
        backgroundColor: '#000000ff',
        marginBottom: 15,       // Space between cards vertically
        padding: 15,
        borderRadius: 12,       // Slightly rounder
        elevation: 3,
        shadowColor: '#fff', 
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    noteTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5, color: 'white' },
    noteDate: { fontSize: 10, color: '#666', marginBottom: 8 },
    notePreview: { fontSize: 13, color: '#b6b6b6ff', lineHeight: 20 }, // Added lineHeight for readability
    
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: 'gray' },
    
    // Header Bar
    editorHeader: { 
        flexDirection: 'row', 
        justifyContent: 'flex-start', 
        padding: 15, 
        alignItems: 'center', 
        backgroundColor: '#222222' 
    },
    
    titleInput: { fontSize: 20, fontWeight: 'bold', flex: 1, color: 'white' },
    saveBtn: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 5 },
    saveBtnText: { color: 'black', fontWeight: 'bold' },
    
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        backgroundColor: 'white',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    fabText: { fontSize: 30, color: 'black', marginTop: -3 }
});

export default App;