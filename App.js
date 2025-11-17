// import { StatusBar } from 'expo-status-bar';
// import { StyleSheet, Text, View } from 'react-native';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import HomeScreen from './screens/HomeScreen';
// import EditorScreen from './screens/EditorScreen';

// export default function App() {
//   return (
//     <View style={styles.container}>
//       <Text>Hello World</Text>
//       <StatusBar style="auto" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#ff7272ff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });

// App.js
import React from "react";
import { Text, Platform, KeyboardAvoidingView, SafeAreaView, ScrollView} from "react-native";
import { actions, RichEditor, RichToolbar } from "react-native-pell-rich-editor";

// Custom component for heading1 action
const handleHead = ({ tintColor }) => (
    <Text style={{ color: tintColor }}>H1</Text>
);

const App = () => {

    // Create a reference to the
    // RichEditor component
    const richText = React.useRef();
    return (
        <SafeAreaView>
            <ScrollView>
                {/* KeyboardAvoidingView to handle keyboard behavior */}
                <KeyboardAvoidingView
                    behavior={
                        Platform.OS ==="ios"? "padding": "height"}
                    style={{ flex: 1 }}>

                    {/* Text component for the app title */}
                    <Text style={{ fontFamily: "monospace", color: "blue", fontSize: 30, marginTop: 50, backgroundColor:"lightgrey", borderRadius: 10, textAlign: "center",}}>
                        Noteku
                    </Text>

                    {/* RichToolbar component for text formatting actions */}
                    <RichToolbar style={{ marginTop: 10}}
                                    editor={richText}

                        // Connect the RichToolbar 
                        // to the RichEditor
                        actions={[ actions.setBold, actions.insertBulletsList, actions.insertOrderedList, actions.insertLink, actions.setStrikethrough, actions.setItalic, actions.setUnderline, actions.heading1,]}

                        // Define available text 
                        // formatting actions
                        iconMap={{[actions.heading1]:handleHead,}} />

                    {/* Text component for description */}
                    <Text style={{fontFamily: "monospace", fontWeight: 900, fontSize: 15, padding: 10}}>
                        Description:
                    </Text>

                    {/* RichEditor component for text editing */}
                    <RichEditor 
                        ref={richText}
                        editorStyle={{contentCSSText: 'text-align: justify;'}}
                        onChange={(descriptionText) => {
                            console.log("descriptionText:", descriptionText);
                        }} 
                    />
                </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView>
    );
};
export default App;