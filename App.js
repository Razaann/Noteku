import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  StatusBar,
  FlatList,
  Image,
  Switch,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  actions,
  RichEditor,
  RichToolbar,
} from "react-native-pell-rich-editor";
import * as ImagePicker from "expo-image-picker";
import {
  Menu,
  Search,
  Plus,
  ArrowLeft,
  MoreVertical,
  ChevronDown,
  Scissors,
  Copy,
  Trash2,
  Bold,
  Lock,
  Undo,
  Redo,
  Italic,
  Underline,
  Heading1,
  List,
  ListOrdered,
  CheckSquare,
  Image as ImageIcon,
  X,
  Moon,
  Sun,
} from "lucide-react-native";

const Stack = createStackNavigator();
const ThemeContext = createContext();

// --- THEMES ---
const palette = {
  yellow: "#FFE99D",
  pink: "#FFC8E6",
  blue: "#B5EAEA",
  green: "#C3F3A7",
  peach: "#FFCCBC",
  primaryBlue: "#5B6BF9",
};

const themes = {
  light: {
    mode: "light",
    bg: "#F2F5FF",
    cardBg: "#FFFFFF",
    text: "#111111",
    textSecondary: "#666666",
    inputBg: "#FFFFFF",
    toolbarBg: "#1F2128",
    toolbarIcon: "#888",
    borderColor: "#EEE",
    noteColors: {
      Work: palette.yellow,
      Ideas: palette.pink,
      "To-Do": palette.blue,
      All: "#FFFFFF",
    },
  },
  dark: {
    mode: "dark",
    bg: "#121212",
    cardBg: "#1E1E1E",
    text: "#FFFFFF",
    textSecondary: "#AAAAAA",
    inputBg: "#2C2C2C",
    toolbarBg: "#2C2C2C",
    toolbarIcon: "#CCC",
    borderColor: "#333",
    noteColors: {
      Work: "#D4C080", // Slightly dimmed for dark mode
      Ideas: "#D4A3C0",
      "To-Do": "#96C2C2",
      All: "#1E1E1E", // Dark card for generic notes
    },
  },
};

const CATEGORIES = ["All", "Work", "Ideas", "To-Do"];

// --- HELPER COMPONENTS ---

const ToolbarIcon = ({ icon: Icon, color, size = 22 }) => (
  <View style={{ padding: 4 }}>
    <Icon color={color} size={size} />
  </View>
);

// --- NATIVE TODO COMPONENT ---
const NativeTodoEditor = ({ items, setItems, theme }) => {
  const handleTextChange = (text, index) => {
    const newItems = [...items];
    newItems[index].text = text;
    setItems(newItems);
  };

  const toggleCheck = (index) => {
    const newItems = [...items];
    newItems[index].checked = !newItems[index].checked;
    setItems(newItems);
  };

  const deleteItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { text: "", checked: false }]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {items.map((item, index) => (
          <View key={index} style={styles.todoItem}>
            <TouchableOpacity
              onPress={() => toggleCheck(index)}
              style={[
                styles.todoCheckbox,
                { borderColor: theme.textSecondary },
              ]}
            >
              {item.checked && (
                <View
                  style={[
                    styles.todoCheckedDot,
                    { backgroundColor: palette.primaryBlue },
                  ]}
                />
              )}
            </TouchableOpacity>
            <TextInput
              style={[
                styles.todoInput,
                { color: theme.text },
                item.checked && [
                  styles.todoInputChecked,
                  { color: theme.textSecondary },
                ],
              ]}
              value={item.text}
              onChangeText={(text) => handleTextChange(text, index)}
              placeholder="To-do item..."
              placeholderTextColor={theme.textSecondary}
              multiline
            />
            <TouchableOpacity
              onPress={() => deleteItem(index)}
              style={{ padding: 8 }}
            >
              <X size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addItem} style={styles.addTodoBtn}>
          <Plus size={20} color={palette.primaryBlue} />
          <Text style={[styles.addTodoText, { color: palette.primaryBlue }]}>
            Add Item
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// --- EDITOR SCREEN ---
const EditorScreen = ({ route, navigation }) => {
  const { theme } = useContext(ThemeContext);
  const richText = useRef();
  const { noteToEdit } = route.params || {};

  // State
  const [title, setTitle] = useState(noteToEdit ? noteToEdit.title : "");
  const [category, setCategory] = useState(noteToEdit?.category || "Work");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // HTML Mode State
  const [descHTML, setDescHTML] = useState(
    noteToEdit ? noteToEdit.content : ""
  );

  // Native Todo Mode State
  const [todoItems, setTodoItems] = useState([]);

  // Initialize content based on mode
  useEffect(() => {
    if (category === "To-Do") {
      const initialContent = noteToEdit ? noteToEdit.content : "";
      const items = parseHtmlToTodos(initialContent);
      setTodoItems(items.length ? items : [{ text: "", checked: false }]);
    } else if (noteToEdit && richText.current) {
      richText.current.setContentHTML(noteToEdit.content);
    }
  }, []);

  const parseHtmlToTodos = (html) => {
    if (!html) return [];
    const regex = /<li.*?>(.*?)<\/li>/g;
    const items = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      const content = match[1];
      const isChecked =
        content.includes("text-decoration: line-through") ||
        content.includes("☑");
      let text = content.replace(/<[^>]+>/g, "").trim();
      text = text.replace(/^☑\s*/, "").replace(/^☐\s*/, "");
      items.push({ text, checked: isChecked });
    }
    return items;
  };

  const todosToHtml = (items) => {
    if (!items || items.length === 0) return "";
    let html = '<ul style="list-style-type: none; padding-left: 0;">';
    items.forEach((item) => {
      const style = item.checked
        ? "text-decoration: line-through; color: #888;"
        : "";
      const checkMark = item.checked ? "☑ " : "☐ ";
      html += `<li style="${style}">${checkMark}${item.text}</li>`;
    });
    html += "</ul>";
    return html;
  };

  const handleAddImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      base64: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      const imageAsset = result.assets[0];
      const base64String = `data:image/jpeg;base64,${imageAsset.base64}`;
      richText.current?.insertImage(
        base64String,
        "width: 100%; height: auto; border-radius: 12px; margin-vertical: 10px;"
      );
      richText.current?.insertHTML("<br />");
    }
  };

  const handleSave = async () => {
    let finalContent = descHTML;
    if (category === "To-Do") {
      finalContent = todosToHtml(todoItems);
    }

    const newNote = {
      id: noteToEdit ? noteToEdit.id : Date.now().toString(),
      title: title || "Untitled Note",
      content: finalContent,
      category: category,
      date: new Date().toLocaleDateString(),
    };

    try {
      const existingNotes = await AsyncStorage.getItem("NOTES");
      let notes = existingNotes ? JSON.parse(existingNotes) : [];

      if (noteToEdit) {
        const index = notes.findIndex((n) => n.id === noteToEdit.id);
        notes[index] = newNote;
      } else {
        notes.push(newNote);
      }
      await AsyncStorage.setItem("NOTES", JSON.stringify(notes));
      navigation.goBack();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    Alert.alert("Delete Note", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!noteToEdit) return navigation.goBack();
          try {
            const existingNotes = await AsyncStorage.getItem("NOTES");
            let notes = existingNotes ? JSON.parse(existingNotes) : [];
            notes = notes.filter((n) => n.id !== noteToEdit.id);
            await AsyncStorage.setItem("NOTES", JSON.stringify(notes));
            navigation.goBack();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const switchCategory = (newCat) => {
    setCategory(newCat);
    setIsCategoryOpen(false);
    if (newCat === "To-Do" && todoItems.length === 0) {
      setTodoItems([{ text: "", checked: false }]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar
        barStyle={theme.mode === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.editorHeader}>
        <TouchableOpacity
          onPress={() => {
            handleSave();
          }}
          style={[styles.iconBtn, { backgroundColor: theme.inputBg }]}
        >
          <ArrowLeft color={theme.text} size={24} />
        </TouchableOpacity>

        <View style={{ zIndex: 10 }}>
          <TouchableOpacity
            style={[styles.categoryPill, { backgroundColor: theme.inputBg }]}
            onPress={() => setIsCategoryOpen(!isCategoryOpen)}
          >
            <View
              style={[
                styles.categoryDot,
                { backgroundColor: theme.text, borderColor: theme.text },
              ]}
            />
            <Text style={[styles.categoryText, { color: theme.text }]}>
              {category}
            </Text>
            <ChevronDown size={16} color={theme.textSecondary} />
          </TouchableOpacity>

          {isCategoryOpen && (
            <View
              style={[styles.dropdownMenu, { backgroundColor: theme.cardBg }]}
            >
              {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.dropdownItem}
                  onPress={() => switchCategory(cat)}
                >
                  <Text
                    style={{
                      color:
                        category === cat ? palette.primaryBlue : theme.text,
                    }}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.iconBtn, { backgroundColor: theme.inputBg }]}
        >
          <Trash2
            color={noteToEdit ? "#FF6B6B" : theme.textSecondary}
            size={24}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <TextInput
            placeholder="Title"
            style={[styles.titleInput, { color: theme.text }]}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={theme.textSecondary}
            multiline
          />

          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

          {category === "To-Do" ? (
            <NativeTodoEditor
              items={todoItems}
              setItems={setTodoItems}
              theme={theme}
            />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
              keyboardShouldPersistTaps="always"
            >
              <RichEditor
                ref={richText}
                initialContentHTML={descHTML}
                placeholder="Start typing..."
                onChange={setDescHTML}
                useContainer={true}
                initialHeight={400}
                style={{ backgroundColor: theme.bg, flex: 1 }}
                editorStyle={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  placeholderColor: theme.textSecondary,
                  contentCSSText:
                    "font-size: 18px; line-height: 28px; font-family: System;",
                }}
              />
            </ScrollView>
          )}
        </View>

        {category !== "To-Do" && (
          <View
            style={[
              styles.floatingToolbarContainer,
              { backgroundColor: theme.toolbarBg },
            ]}
          >
            <RichToolbar
              editor={richText}
              style={[styles.richToolbar, { backgroundColor: theme.toolbarBg }]}
              flatContainerStyle={{ paddingHorizontal: 10, gap: 15 }}
              selectedIconTint={palette.primaryBlue}
              iconTint={theme.toolbarIcon}
              actions={[
                actions.undo,
                actions.redo,
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.heading1,
                actions.insertBulletsList,
                actions.insertOrderedList,
                actions.insertImage,
              ]}
              iconMap={{
                [actions.undo]: () => (
                  <ToolbarIcon icon={Undo} color={theme.toolbarIcon} />
                ),
                [actions.redo]: () => (
                  <ToolbarIcon icon={Redo} color={theme.toolbarIcon} />
                ),
                [actions.setBold]: () => (
                  <ToolbarIcon icon={Bold} color={theme.toolbarIcon} />
                ),
                [actions.setItalic]: () => (
                  <ToolbarIcon icon={Italic} color={theme.toolbarIcon} />
                ),
                [actions.setUnderline]: () => (
                  <ToolbarIcon icon={Underline} color={theme.toolbarIcon} />
                ),
                [actions.heading1]: () => (
                  <Text
                    style={{
                      color: theme.toolbarIcon,
                      fontWeight: "bold",
                      fontSize: 18,
                    }}
                  >
                    H1
                  </Text>
                ),
                [actions.insertBulletsList]: () => (
                  <ToolbarIcon icon={List} color={theme.toolbarIcon} />
                ),
                [actions.insertOrderedList]: () => (
                  <ToolbarIcon icon={ListOrdered} color={theme.toolbarIcon} />
                ),
                [actions.insertImage]: () => (
                  <ToolbarIcon icon={ImageIcon} color={theme.toolbarIcon} />
                ),
              }}
              onPressAddImage={handleAddImage}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- HOME SCREEN ---
const HomeScreen = ({ navigation }) => {
  const { theme, switchTheme } = useContext(ThemeContext);
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getNotes();
    }, [])
  );

  const getNotes = async () => {
    try {
      const storedNotes = await AsyncStorage.getItem("NOTES");
      if (storedNotes) {
        const parsed = JSON.parse(storedNotes).reverse();
        setNotes(parsed);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content &&
        note.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === "All" ||
      (note.category || "Work") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderNoteCard = (note, index) => {
    // Use theme-aware colors
    const cardColor = theme.noteColors[note.category] || theme.cardBg;
    const textColor = note.category === "All" ? theme.text : "#111111";
    const dateColor =
      note.category === "All" ? theme.textSecondary : "rgba(0,0,0,0.5)";

    const imgMatch = note.content.match(/<img[^>]+src="([^">]+)"/);
    const firstImage = imgMatch ? imgMatch[1] : null;

    let todoPreviews = [];
    if (note.category === "To-Do") {
      const regex = /<li.*?>(.*?)<\/li>/g;
      let match;
      while ((match = regex.exec(note.content)) !== null) {
        if (todoPreviews.length >= 5) break;
        let rawText = match[1].replace(/<[^>]+>/g, "").trim();
        let checked = false;
        if (rawText.includes("☑") || match[1].includes("line-through"))
          checked = true;
        rawText = rawText.replace(/^☑\s*/, "").replace(/^☐\s*/, "");
        todoPreviews.push({ text: rawText, checked });
      }
    }

    // Improved HTML to Text conversion with Bullet Support
    const textPreview = note.content
      .replace(/<li>/gi, "• ") // Replace <li> with bullet point
      .replace(/<\/li>/gi, "\n") // Replace </li> with newline
      .replace(/<br\s*\/?>/gi, "\n") // Replace <br> with newline
      .replace(/<\/p>/gi, "\n") // Replace </p> with newline
      .replace(/<\/div>/gi, "\n") // Replace </div> with newline
      .replace(/<[^>]+>/g, "") // Strip remaining tags
      .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
      .trim();

    return (
      <TouchableOpacity
        key={note.id}
        style={[styles.noteCard, { backgroundColor: cardColor }]}
        onPress={() => navigation.navigate("Editor", { noteToEdit: note })}
      >
        <Text
          style={[styles.cardTitle, { color: textColor }]}
          numberOfLines={2}
        >
          {note.title}
        </Text>

        {firstImage && (
          <Image
            source={{ uri: firstImage }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}

        {note.category === "To-Do" && todoPreviews.length > 0 ? (
          <View style={{ marginTop: 5, marginBottom: 10 }}>
            {todoPreviews.map((item, idx) => (
              <View key={idx} style={styles.miniTodoItem}>
                <View
                  style={[
                    styles.miniTodoCheck,
                    item.checked && styles.miniTodoCheckFilled,
                    { borderColor: textColor },
                  ]}
                >
                  {item.checked && (
                    <View
                      style={[
                        styles.miniTodoDot,
                        { backgroundColor: cardColor },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.miniTodoText,
                    { color: textColor },
                    item.checked && {
                      textDecorationLine: "line-through",
                      opacity: 0.5,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.text}
                </Text>
              </View>
            ))}
            {todoPreviews.length === 5 && (
              <Text style={{ fontSize: 10, color: dateColor, marginLeft: 20 }}>
                ...
              </Text>
            )}
          </View>
        ) : (
          <Text
            style={[styles.cardPreview, { color: textColor }]}
            numberOfLines={firstImage ? 3 : 6}
          >
            {textPreview || "No content"}
          </Text>
        )}

        <Text style={[styles.cardTime, { color: dateColor }]}>{note.date}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={theme.mode === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.homeHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.iconCircle, { backgroundColor: theme.inputBg }]}
            onPress={() => setIsMenuOpen(true)}
          >
            <Menu size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            NOTEKU
          </Text>
        </View>
      </View>

      {/* Theme Selection Modal */}
      <Modal
        transparent={true}
        visible={isMenuOpen}
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
        >
          <View
            style={[
              styles.menuModal,
              { backgroundColor: theme.cardBg, borderColor: theme.borderColor },
            ]}
          >
            <Text style={[styles.menuTitle, { color: theme.text }]}>
              Appearance
            </Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                switchTheme("light");
                setIsMenuOpen(false);
              }}
            >
              <Sun size={20} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>
                Light Mode
              </Text>
              {theme.mode === "light" && <View style={styles.activeDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                switchTheme("dark");
                setIsMenuOpen(false);
              }}
            >
              <Moon size={20} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>
                Dark Mode
              </Text>
              {theme.mode === "dark" && <View style={styles.activeDot} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.searchContainer}>
        <Search
          size={20}
          color={theme.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: theme.inputBg, color: theme.text },
          ]}
          placeholder="Search notes..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ height: 50 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat
                  ? styles.categoryChipActive
                  : styles.categoryChipInactive,
                {
                  borderColor:
                    selectedCategory === cat ? theme.text : theme.borderColor,
                  backgroundColor:
                    selectedCategory === cat ? theme.text : theme.cardBg,
                },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color:
                      selectedCategory === cat ? theme.bg : theme.textSecondary,
                  },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.masonryContainer}>
          <View style={styles.column}>
            {filteredNotes
              .filter((_, i) => i % 2 === 0)
              .map((note, i) => renderNoteCard(note, i))}
          </View>
          <View style={styles.column}>
            {filteredNotes
              .filter((_, i) => i % 2 !== 0)
              .map((note, i) => renderNoteCard(note, i))}
          </View>
        </View>
        {filteredNotes.length === 0 && (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No notes found.
          </Text>
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, { borderColor: theme.bg }]}
          onPress={() => navigation.navigate("Editor")}
        >
          <Plus size={32} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- MAIN APP ---
const App = () => {
  const [themeMode, setThemeMode] = useState("light");

  const switchTheme = (mode) => {
    setThemeMode(mode);
  };

  const theme = themes[themeMode];

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={{ theme, switchTheme }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Editor" component={EditorScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  homeHeader: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 15 },
  iconCircle: { padding: 8, borderRadius: 50 },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  searchContainer: {
    marginHorizontal: 24,
    marginVertical: 10,
    position: "relative",
  },
  searchInput: {
    borderRadius: 30,
    paddingVertical: 12,
    paddingLeft: 45,
    paddingRight: 20,
    fontSize: 16,
    elevation: 0,
  },
  searchIcon: { position: "absolute", left: 15, top: 14, zIndex: 1 },
  categoryScroll: { paddingHorizontal: 24, gap: 10, alignItems: "center" },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipActive: {},
  categoryChipInactive: {},
  categoryChipText: { fontSize: 14, fontWeight: "600" },
  scrollContent: { paddingBottom: 100, paddingTop: 10 },
  masonryContainer: { flexDirection: "row", paddingHorizontal: 16, gap: 12 },
  column: { flex: 1, gap: 12 },
  noteCard: { borderRadius: 24, padding: 18, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: "bold", marginBottom: 8 },
  cardPreview: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardImage: { width: "100%", height: 120, borderRadius: 12, marginBottom: 12 },
  cardTime: { fontSize: 11, fontWeight: "600" },
  emptyText: { textAlign: "center", marginTop: 50 },
  fabContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.primaryBlue,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: palette.primaryBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
  },
  editorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 20,
  },
  iconBtn: { padding: 8, borderRadius: 50 },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  categoryDot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1 },
  categoryText: { fontSize: 14, fontWeight: "600" },
  dropdownMenu: {
    position: "absolute",
    top: 40,
    left: "50%",
    marginLeft: -60,
    width: 120,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    paddingVertical: 4,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 16 },
  titleInput: { fontSize: 32, fontWeight: "800", marginVertical: 10 },
  dateText: { fontSize: 13, fontWeight: "500", marginBottom: 20 },
  floatingToolbarContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    paddingVertical: 4,
  },
  richToolbar: { borderTopWidth: 0, borderRadius: 24 },

  // Todo Editor Styles
  todoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  todoCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  todoCheckedDot: { width: 14, height: 14, borderRadius: 4 },
  todoInput: { flex: 1, fontSize: 18, paddingTop: 0 },
  todoInputChecked: { textDecorationLine: "line-through" },
  addTodoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    padding: 5,
  },
  addTodoText: { fontSize: 16, fontWeight: "600" },

  // Mini Todo Preview Styles
  miniTodoItem: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  miniTodoCheck: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1.5,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  miniTodoCheckFilled: { backgroundColor: "#555", borderColor: "#555" },
  miniTodoDot: { width: 6, height: 6, borderRadius: 2 },
  miniTodoText: { fontSize: 13, flex: 1 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuModal: {
    width: 200,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 10,
  },
  menuTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  menuText: { fontSize: 16, fontWeight: "500" },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primaryBlue,
    marginLeft: "auto",
  },
});

export default App;
