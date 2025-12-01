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

    // --- NEW: FUNCTION TO PICK IMAGE ---
    const handleAddImage = async () => {
        // 1. Open the phone's gallery
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], // Updated specifically for Expo Image Picker
            allowsEditing: true,    // Lets user crop/zoom before selecting
            base64: true,           // CRITICAL: We need the image as code, not a file path
            quality: 0.5,           // Compress image (0.0 to 1.0) to prevent lag
        });

        // 2. If user picked an image
        if (!result.canceled) {
            const imageAsset = result.assets[0];
            const base64String = `data:image/jpeg;base64,${imageAsset.base64}`;

            // 3. Insert into editor
            // 'width: 100%; height: auto;' -> This locks the ratio and fills width!
            richText.current?.insertImage(base64String, 'width: 100%; height: auto;');
            
            // Optional: Add a new line after image so typing is easier
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
            Alert.alert("Error", "Could not save note (Image might be too big!)");
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Note",
            "Are you sure?",
            [
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
            ]
        );
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
                    {/* UPDATED TOOLBAR */}
                    <RichToolbar
                        editor={richText}
                        // Added actions.insertImage to the list
                        actions={[
                            actions.setBold, 
                            actions.setItalic,
                            actions.setUnderline,
                            actions.insertBulletsList, 
                            actions.insertOrderedList, 
                            actions.insertImage,
                            actions.heading1
                        ]}
                        // Connect the image button to our function
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
                            contentCSSText: 'img { width: 100%; height: auto; }' // Extra safety for images
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
                numColumns={2}
                keyExtractor={item => item.id}
                renderItem={renderNoteItem}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No notes yet. Create one!</Text>}
            />
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
const styles = StyleSheet.create({
    // Main Background: Pure Black (So the #222222 items stand out)
    container: { flex: 1, padding: 20, backgroundColor: '#222222' }, 
    
    appTitle: { fontSize: 30, fontWeight: 'bold', color: 'white', marginBottom: 20, textAlign: 'center', marginTop: 30 },
    
    // Note Cards: #222222
    gridItem: {
        backgroundColor: '#000000', // UPDATED
        width: '48%',
        marginBottom: 15,
        padding: 15,
        borderRadius: 10,
        elevation: 3,
        shadowColor: '#fff', // Changed shadow to white so it glows slightly
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    noteTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5, color: 'white' },
    noteDate: { fontSize: 10, color: 'gray', marginBottom: 5 },
    notePreview: { fontSize: 12, color: '#b6b6b6ff' },
    
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: 'gray' },
    
    // Header Bar: #222222
    editorHeader: { 
        flexDirection: 'row', 
        justifyContent: 'flex-start', 
        padding: 15, 
        alignItems: 'center', 
        backgroundColor: '#222222' // UPDATED
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
    },
    fabText: { fontSize: 30, color: 'black', marginTop: -3 }
});

export default App;