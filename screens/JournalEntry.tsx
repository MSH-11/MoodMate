import React, { useState } from 'react';
import { View, StyleSheet, Alert, Image, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import OpenAI from 'openai';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Markdown from 'react-native-markdown-display';

type RootStackParamList = {
  JournalEntry: { session: Session };
};

type JournalEntryProps = {
  route: RouteProp<RootStackParamList, 'JournalEntry'>;
};

const JournalEntry: React.FC<JournalEntryProps> = ({ route }) => {
  const { session } = route.params;
  const navigation = useNavigation();
  const [journalText, setJournalText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  const handleSubmit = async () => {
    if (journalText.trim() === '') {
      Alert.alert('Error', 'Journal entry cannot be empty.');
      return;
    }

    setLoading(true);

    const selectedDate = new Date().toISOString().split('T')[0];

    // Check if there is already an entry for the selected date
    const { data: existingEntry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .filter('entry_date', 'gte', `${selectedDate}T00:00:00Z`)
      .filter('entry_date', 'lt', `${selectedDate}T23:59:59Z`)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching existing entry:', fetchError);
      setLoading(false);
      return;
    }

    const entryDateTime = existingEntry ? existingEntry.entry_date : new Date().toISOString();

    const { data, error } = await supabase
      .from('journal_entries')
      .upsert({
        user_id: session.user.id,
        entry_date: entryDateTime,
        journal_entry: journalText,
        rating: existingEntry ? existingEntry.rating : null,
      }, { onConflict: 'user_id,entry_date' });

    if (error) {
      console.error('Error submitting journal entry:', error);
      Alert.alert('Error', 'Failed to submit journal entry.');
      setLoading(false);
      return;
    }

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: `Provide a very compassionate feedback on the following journal entry that shows attention and empathy:\n\n"${journalText}"\n\n Following that, start a separate section with header: "Recommended actions:" and recommend some action steps for the user to take care of themselves. ` }],
      });

      const feedbackContent = response.choices[0]?.message?.content?.trim() || '';
      setFeedback(feedbackContent);
    } catch (apiError) {
      console.error('Error fetching feedback:', apiError);
      if (apiError instanceof Error && apiError.message.includes('429')) {
        Alert.alert('Quota Exceeded', 'You have exceeded your current quota. Please check your plan and billing details.');
      } else {
        Alert.alert('Error', 'Failed to fetch feedback.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid={true}
      extraScrollHeight={Platform.OS === 'ios' ? 0 : 100}
    >
      <SafeAreaView style={styles.container}>
        <Image source={require('../assets/images/account.png')} style={styles.photo} />
        <Card style={styles.card}>
          <Card.Title title={feedback ? "Feedback on your day" : "Write about your day"} titleStyle={styles.cardTitle} />
          <Card.Content>
            {feedback ? (
              <Markdown style={markdownStyles}>{feedback}</Markdown>
            ) : (
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={10}
                placeholder="Start writing here..."
                value={journalText}
                onChangeText={setJournalText}
                mode="outlined"
              />
            )}
          </Card.Content>
          {!feedback && (
            <Card.Actions>
              <Button mode="contained" onPress={handleSubmit} style={styles.button} loading={loading} disabled={loading}>
                Submit
              </Button>
            </Card.Actions>
          )}
        </Card>
      </SafeAreaView>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    alignSelf: 'center',
  },
  card: {
    borderRadius: 10,
    padding: 5,
    paddingBottom: 30,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  textInput: {
    height: 200,
    backgroundColor: '#fff',
    marginBottom: 20,
    textAlignVertical: 'top',
    fontFamily: 'Poppins-Regular',
  },
  button: {
    width: '100%',
    paddingVertical: 10,
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: undefined,
    maxHeight: 400,
    aspectRatio: 1, // Ensure the aspect ratio is maintained
    alignSelf: 'center',
    resizeMode: 'contain',
  },
});

const markdownStyles = {
  body: {
    fontSize: 16, // Increase font size
    fontFamily: 'Poppins-Regular',
  },
  // Add more styles as needed
};

export default JournalEntry;
