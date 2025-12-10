// src/screens/Journal/JournalDetailScreen.tsx
import { getMarkdownStyles } from '@/src/utils/markdownStyles';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Button, Divider, IconButton, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { base64ToDataUri } from '../../services/imageService';
import {
  deleteJournal,
  getJournal,
} from '../../services/unifiedStorageService';
import { useAppDispatch, useAppSelector } from '../../stores/hooks';
import { deleteJournal as deleteJournalAction } from '../../stores/slices/journalsSlice';
import { Journal } from '../../types';
import { Alert } from '../../utils/alert';

const { width: screenWidth } = Dimensions.get('window');

const JournalDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const encryptionKey = useAppSelector((state) => state.auth.encryptionKey);

  const { journalId } = route.params;
  const { backColor } = route.params;

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
      console.log("Loaded journal:", {
        id: loadedJournal?.id,
        hasImages: !!loadedJournal?.images,
        imageCount: loadedJournal?.images?.length || 0,
        firstImagePreview:
          loadedJournal?.images?.[0]?.substring(0, 50) || "none",
      });
      setJournal(loadedJournal);
    } catch (error) {
      console.error('Error loading journal:', error);
      Alert.alert('Oops!', 'Failed to load journal entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Journal Entry',
      'Are you sure you want to delete this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!encryptionKey) return;

    setIsDeleting(true);
    try {
      await deleteJournal(journalId);
      dispatch(deleteJournalAction(journalId));
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting journal:', error);
      Alert.alert('Error', 'Failed to delete journal entry');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: backColor ?? theme.colors.background },
        ]}
      >
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!journal) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: backColor ?? theme.colors.background },
        ]}
      >
        <View style={styles.loadingContainer}>
          <Text variant="bodyLarge">Journal not found</Text>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 16 }}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const markdownStyles = getMarkdownStyles(theme);
  const dateObj = new Date(journal.date);
  const formattedDate = format(dateObj, 'EEEE, MMMM dd, yyyy');
  const formattedTime = format(dateObj, 'h:mm a');

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: backColor ?? theme.colors.background },
      ]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 16 }]}
      >
        {/* Title */}
        {journal.title && (
          <Text variant="headlineMedium" style={styles.title}>
            {journal.title}
          </Text>
        )}

        {/* ✅ IMPROVED Metadata Section */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <IconButton
              icon="calendar-outline"
              size={16}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.metaIcon}
            />
            <Text variant="bodyMedium" style={styles.metaText}>
              {formattedDate}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <IconButton
              icon="clock-outline"
              size={16}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.metaIcon}
            />
            <Text variant="bodyMedium" style={styles.metaText}>
              {formattedTime}
            </Text>
          </View>
        </View>

        {/* ✅ Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <Button
            mode="contained-tonal"
            icon="pencil-outline"
            onPress={() =>
              navigation.navigate('JournalEditor', { journalId: journal.id })
            }
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            Edit
          </Button>

          <Button
            mode="outlined"
            icon="delete-outline"
            onPress={handleDelete}
            disabled={isDeleting}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            textColor={theme.colors.error}
            buttonColor="transparent"
          >
            Delete
          </Button>
        </View>

        <Divider style={styles.divider} />

        {/* Images Gallery */}
        {journal.images && journal.images.length > 0 && (
          <View style={styles.imagesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {journal.images.map((base64, index) => {
                const imageUri = base64ToDataUri(base64);
                return (
                  <TouchableOpacity
                    key={`img-${journal.id}-${index}`}
                    onPress={() => setSelectedImage(imageUri)}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <View style={styles.textContainer}>
          <Markdown style={markdownStyles}>{journal.text}</Markdown>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            Created: {format(new Date(journal.createdAt), 'MMM dd, yyyy h:mm a')}
          </Text>
          {journal.updatedAt && journal.updatedAt !== journal.createdAt && (
            <Text variant="bodySmall" style={styles.footerText}>
              Updated: {format(new Date(journal.updatedAt), 'MMM dd, yyyy h:mm a')}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Image Fullscreen Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <IconButton
            icon="close"
            size={32}
            iconColor="#fff"
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          />
          {selectedImage && (
            <Image
              source={{ uri: selectedImage??""}}
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    padding: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    margin: 0,
    padding: 0,
    height: 20,
    width: 20,
  },
  metaText: {
    opacity: 0.7,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  actionButtonContent: {
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 16,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 8,
  },
  textContainer: {
    marginBottom: 24,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  footerText: {
    marginBottom: 4,
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  fullImage: {
    width: screenWidth,
    height: '100%',
  },
});

export default JournalDetailScreen;
