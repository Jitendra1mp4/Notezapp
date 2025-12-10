import { getMarkdownStyles } from "@/src/utils/markdownStyles";
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import {
  Divider,
  IconButton,
  Text,
  useTheme
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { base64ToDataUri } from "../../services/imageService";
import {
  deleteJournal,
  getJournal,
} from "../../services/unifiedStorageService";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { deleteJournal as deleteJournalAction } from "../../stores/slices/journalsSlice";
import { Journal } from "../../types";
import { Alert } from "../../utils/alert";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const JournalDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);

  const { journalId, backColor } = route.params;

  const [journal, setJournal] = useState<Journal | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadJournal();
    }, [journalId, encryptionKey])
  )
  const loadJournal = async () => {
    if (!encryptionKey) return;
    setIsLoading(true);
    try {
      const loadedJournal = await getJournal(journalId, encryptionKey);
      setJournal(loadedJournal);
    } catch (error) {
      console.error("Error loading journal:", error);
      Alert.alert("Error", "Failed to load journal entry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Memory",
      "Are you sure you want to delete this memory? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteJournal(journalId);
              dispatch(deleteJournalAction(journalId));
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to delete.");
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Styles dependent on theme
  const markdownStyles = getMarkdownStyles(theme);

  if (isLoading || !journal) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: backColor || theme.colors.background }]}>
        <View style={styles.center}>
            <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateObj = new Date(journal.date);
  
  // Custom Styles for the bubble effect
  const bubbleBackgroundColor = backColor || theme.colors.surface; 
  // If backColor was passed (from List), use it. Else default surface.

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Main Bubble Card */}
        <View style={[styles.bubbleCard, { backgroundColor: bubbleBackgroundColor }]}>
            
            {/* Header: Date & Time */}
            <View style={styles.headerRow}>
                <View>
                    <Text variant="headlineSmall" style={{fontWeight:'bold'}}>
                        {format(dateObj, "MMMM do")}
                    </Text>
                    <Text variant="titleSmall" style={{opacity: 0.6}}>
                        {format(dateObj, "yyyy")} • {format(dateObj, "h:mm a")}
                    </Text>
                </View>
                <View style={styles.actions}>
                    <IconButton 
                        icon="pencil" 
                        size={20} 
                        onPress={() => navigation.navigate("JournalEditor", { journalId: journal.id })} 
                    />
                    <IconButton 
                        icon="delete-outline" 
                        size={20} 
                        iconColor={theme.colors.error}
                        onPress={handleDelete} 
                    />
                </View>
            </View>

            <Divider style={styles.divider} />

            {/* Title with Custom Fallback */}
            <Text variant="headlineMedium" style={styles.title}>
               {journal.title || <Text style={{fontWeight:'100', fontStyle:"italic", opacity:0.5}}>Untitled</Text>}
            </Text>

            {/* Images Grid */}
            {journal.images && journal.images.length > 0 && (
              <View style={styles.imageGrid}>
                {journal.images.map((base64, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedImage(base64ToDataUri(base64))}
                  >
                    <Image
                      source={{ uri: base64ToDataUri(base64) }}
                      style={styles.thumbnail}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Content Body */}
            <View style={styles.bodyContainer}>
                <Markdown style={markdownStyles}>
                    {journal.text}
                </Markdown>
            </View>
        </View>

      </ScrollView>

      {/* Full Screen Image Modal */}
      <Modal visible={!!selectedImage} transparent onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalBg}>
           <IconButton 
             icon="close" 
             iconColor="white" 
             size={30} 
             style={styles.closeBtn} 
             onPress={() => setSelectedImage(null)} 
           />
           {selectedImage && (
             <Image 
                source={{ uri: selectedImage }} 
                style={styles.fullImage} 
                resizeMode="contain" 
             />
           )}
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  
  // The "Bubble" Look
  bubbleCard: {
    borderRadius: 24,
    padding: 20,
    minHeight: '90%', // Takes up most of the screen like a page
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8
  },
  actions: { flexDirection: 'row' },
  divider: { marginVertical: 16, opacity: 0.2 },
  
  title: {
      fontWeight: "bold",
      marginBottom: 24,
  },
  
  imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24
  },
  thumbnail: {
      width: 100,
      height: 100,
      borderRadius: 12,
      backgroundColor: '#f0f0f0'
  },
  
  bodyContainer: {
      paddingBottom: 40
  },

  // Modal
  modalBg: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
      alignItems: 'center'
  },
  fullImage: {
      width: screenWidth,
      height: screenHeight * 0.8
  },
  closeBtn: {
      position: 'absolute',
      top: 40,
      right: 20,
      zIndex: 10
  }
});

export default JournalDetailScreen;
