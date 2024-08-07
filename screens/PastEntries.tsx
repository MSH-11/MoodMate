import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Image, View, Animated } from 'react-native';
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
  const [imageHeight] = useState(new Animated.Value(250));
  const [titleFontSize] = useState(new Animated.Value(30));
  const [marginBottom] = useState(new Animated.Value(20));

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
    if (expandedEntryId === id) {
      Animated.timing(imageHeight, { toValue: 250, duration: 300, useNativeDriver: false }).start();
      Animated.timing(titleFontSize, { toValue: 30, duration: 300, useNativeDriver: false }).start();
      Animated.timing(marginBottom, { toValue: 20, duration: 300, useNativeDriver: false }).start();
      setExpandedEntryId(null);
    } else {
      Animated.timing(imageHeight, { toValue: 150, duration: 300, useNativeDriver: false }).start();
      Animated.timing(titleFontSize, { toValue: 20, duration: 300, useNativeDriver: false }).start();
      Animated.timing(marginBottom, { toValue: 10, duration: 300, useNativeDriver: false }).start();
      setExpandedEntryId(id);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExpanded = item.entry_date === expandedEntryId;
    const emoji = item.rating ? ['😡', '😢', '😐', '😊', '😍'][item.rating - 1] : '🚫';

    return (
      <TouchableOpacity onPress={() => handlePress(item.entry_date)}>
        <Card style={styles.entryContainer}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{getDayAbbreviation(item.entry_date)}</Text>
            <Text style={styles.cardSubtitle}>{emoji}</Text>
          </View>
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
      <Animated.Image source={require('../assets/images/journal.png')} style={[styles.photo, { height: imageHeight }]} />
      <Animated.Text style={[styles.title, { fontSize: titleFontSize, marginBottom: marginBottom }]}>Past Journal Entries</Animated.Text>
      <FlatList
        style={styles.scrollable}
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
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  entryContainer: {
    marginBottom: 40,
    borderRadius: 15,
    elevation: 2,
    paddingLeft: 15,
    paddingTop: 15,
    paddingBottom: 5,
    position: 'relative',
  },
  cardContent: {
    position: 'relative',
  },
  cardTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
  },
  cardSubtitle: {
    fontSize: 40,
    position: 'absolute',
    top: '-140%',
    right: '-5%',
    margin: 0,
  },
  entryText: {
    fontSize: 16,
    marginTop: 20,
    fontFamily: 'Poppins-Regular',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    alignSelf: 'center',
    resizeMode: 'contain',
  },
});

export default PastEntries;
