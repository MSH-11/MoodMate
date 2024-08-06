import React, { useState } from 'react';
import { View, StyleSheet, Alert, Image } from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  const handleSubmit = async () => {
    if (journalText.trim() === '') {
      Alert.alert('Error', 'Journal entry cannot be empty.');
      return;
    }

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
    } else {
      Alert.alert('Success', 'Journal entry submitted successfully.');
      navigation.goBack(); // Navigate back to the previous screen
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image source={{ uri: 'https://via.placeholder.com/150' }} style={styles.logo} />
      <Card style={styles.card}>
        <Card.Title title="Write about your day" titleStyle={styles.cardTitle} />
        <Card.Content>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={10}
            placeholder="Start writing here..."
            value={journalText}
            onChangeText={setJournalText}
            mode="outlined"
          />
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={handleSubmit} style={styles.button}>
            Submit
          </Button>
        </Card.Actions>
      </Card>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
  },
  cardTitle: {
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
});

export default JournalEntry;
