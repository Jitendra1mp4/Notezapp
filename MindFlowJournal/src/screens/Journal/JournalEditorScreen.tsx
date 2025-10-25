import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const JournalEditorScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const handleSave = () => {
    // TODO: Implement save logic in Sprint 3
    console.log('Save journal');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          label="Title (optional)"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.titleInput}
        />

        <TextInput
          label="Write your thoughts..."
          value={text}
          onChangeText={setText}
          mode="outlined"
          multiline
          numberOfLines={15}
          style={styles.textInput}
        />

        <Button mode="contained" onPress={handleSave} style={styles.button}>
          Save Journal
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  titleInput: {
    marginBottom: 16,
  },
  textInput: {
    marginBottom: 16,
    minHeight: 300,
  },
  button: {
    marginTop: 8,
  },
});

export default JournalEditorScreen;
