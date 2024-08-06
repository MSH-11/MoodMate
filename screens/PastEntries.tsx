import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Text, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type RootStackParamList = {
  PastEntries: { session: Session };
};

type PastEntriesProps = {
  route: RouteProp<RootStackParamList, 'PastEntries'>;
};

const PastEntries: React.FC<PastEntriesProps> = ({ route }) => {
  const { session } = route.params;
  const [entries, setEntries] = useState<any[]>([]);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching past entries:', error);
    } else {
      setEntries(data);
    }
  };

  const getDayAbbreviation = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handlePress = (id: string) => {
    setExpandedEntryId(expandedEntryId === id ? null : id);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExpanded = item.entry_date === expandedEntryId;
    return (
      <TouchableOpacity onPress={() => handlePress(item.entry_date)}>
        <Card style={styles.entryContainer}>
          <Card.Title title={getDayAbbreviation(item.entry_date)} subtitle={item.rating ? ['😡', '😢', '😐', '😊', '😍'][item.rating - 1] : '🚫'} />
          <Card.Content>
            <Text style={styles.entryText}>
              {isExpanded ? item.journal_entry : (item.journal_entry ? item.journal_entry.substring(0, 50) + '...' : 'No entry for this day')}
            </Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Past Journal Entries</Text>
      <FlatList style={styles.scrollable}
        data={entries}
        keyExtractor={(item) => item.entry_date}
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  scrollable: {
    flex: 1,
    padding: 5,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  entryContainer: {
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  entryText: {
    fontSize: 16,
    marginTop: 5,
    fontFamily: 'Poppins-Regular',
  },
});

export default PastEntries;
