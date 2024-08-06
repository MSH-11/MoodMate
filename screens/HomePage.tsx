import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HomepageProps {
  session: Session;
}

const Homepage: React.FC<HomepageProps> = ({ session }) => {
  const navigation = useNavigation<NavigationProp<any>>();
  const [weeklyRatings, setWeeklyRatings] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    fetchWeeklyRatings();
  }, []);

  const fetchWeeklyRatings = async () => {
    const today = new Date();
    const timezoneOffset = today.getTimezoneOffset() * 60000; // offset in milliseconds

    const pastWeek = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      if (i === 0) {
        // Last day (today) with 11:59 PM
        date.setHours(23, 59, 59, 999);
      } else if (i === 6) {
        // First day (6 days ago) with 12:00 AM
        date.setHours(0, 0, 0, 0);
      } else {
        // Other days with start of day
        date.setHours(0, 0, 0, 0);
      }
      // Adjust to local time by removing the timezone offset
      const localDate = new Date(date.getTime() - timezoneOffset);
      return {
        entry_date: localDate.toISOString(),
        rating: null,
      };
    }).reverse();

    const { data, error } = await supabase
      .from('journal_entries')
      .select('entry_date, rating')
      .eq('user_id', session.user.id)
      .gte('entry_date', pastWeek[0].entry_date)
      .lte('entry_date', pastWeek[pastWeek.length - 1].entry_date)
      .order('entry_date', { ascending: true });

    if (error) {
      console.error('Error fetching weekly ratings:', error);
    } else {
      const ratingsMap: { [key: string]: number } = data.reduce((acc: { [key: string]: number }, entry: { entry_date: string; rating: number }) => {
        const localDate = new Date(entry.entry_date).toISOString().split('T')[0];
        acc[localDate] = entry.rating;
        return acc;
      }, {});

      const filledWeek = pastWeek.map(day => ({
        ...day,
        rating: ratingsMap[new Date(day.entry_date).toISOString().split('T')[0]] || null,
      }));

      setWeeklyRatings(filledWeek);
    }
  };

  const getDayAbbreviation = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const handleRateDay = async (rating: number) => {
    if (!selectedDay) return;

    const selectedDate = selectedDay.toISOString().split('T')[0];

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
        rating: rating,
        journal_entry: existingEntry ? existingEntry.journal_entry : null,
      }, { onConflict: 'user_id, entry_date' });

    if (error) {
      console.error('Error rating the day:', error);
    } else {
      setModalVisible(false);
      fetchWeeklyRatings(); // Refresh the ratings
    }
  };

  const getTodayLocal = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Image source={{ uri: 'https://via.placeholder.com/150' }} style={styles.logo} />
        <Text style={styles.greeting}>Hello, {session.user.email}! Welcome to your Journal!</Text>

        <Card style={styles.card}>
          <Card.Title title="Your Daily Ratings for the Past Week" titleStyle={styles.cardTitle} />
          <Card.Content>
            <View style={styles.ratingsContainer}>
              {weeklyRatings.map((item) => (
                <View key={item.entry_date} style={styles.ratingItem}>
                  <Text style={styles.dayAbbreviation}>{getDayAbbreviation(item.entry_date)}</Text>
                  <Text style={styles.rating}>{item.rating ? ['😡', '😢', '😐', '😊', '😍'][item.rating - 1] : '🚫'}</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="How was your day?" titleStyle={styles.cardTitle} />
          <Card.Actions>
            <Button mode="contained" onPress={() => {
              const todayLocal = getTodayLocal();
              setSelectedDay(todayLocal); // Set selected day to today in local time
              setModalVisible(true);
            }} style={styles.button}>
              Rate Your Day
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Write about your day" titleStyle={styles.cardTitle} />
          <Card.Actions>
            <Button mode="contained" onPress={() => navigation.navigate('JournalEntry', { session })} style={styles.button}>
              Fill Your Daily Journal Entry
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="View Past Journal Entries" titleStyle={styles.cardTitle} />
          <Card.Actions>
            <Button mode="contained" onPress={() => navigation.navigate('PastEntries', { session })} style={styles.button}>
              View Past Entries
            </Button>
          </Card.Actions>
        </Card>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate your {selectedDay ? getDayName(selectedDay.toISOString()) : ''}</Text>
            <View style={styles.emojisContainer}>
              {['😡', '😢', '😐', '😊', '😍'].map((emoji, index) => (
                <TouchableOpacity key={index} onPress={() => handleRateDay(index + 1)}>
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button onPress={() => setModalVisible(false)}>Close</Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    alignSelf: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  card: {
    marginVertical: 10,
    borderRadius: 10,
  },
  cardTitle: {
    fontFamily: 'Poppins-Bold',
  },
  ratingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  ratingItem: {
    alignItems: 'center',
  },
  dayAbbreviation: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'Poppins-Regular',
  },
  rating: {
    fontSize: 35,
  },
  button: {
    width: '100%',
    paddingVertical: 8,
    justifyContent: 'center',
    fontFamily: 'Poppins-Bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    fontFamily: 'Poppins-Bold',
  },
  emojisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 40,
  },
});

export default Homepage;
