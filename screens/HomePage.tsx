import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
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
  const [ratePressed, setRatePressed] = useState(false);
  const [journalPressed, setJournalPressed] = useState(false);
  const [fullName, setFullName] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      fetchWeeklyRatings();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setFullName(data.full_name);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

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
        <Image source={require('../assets/images/logo.png')} style={styles.logo} />
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Account')}
        >
          <Image source={require('../assets/images/profile-icon.png')} style={styles.profileIcon} />
        </TouchableOpacity>
        
        <Text style={styles.greeting}>Hey, {fullName || session.user.email} :)</Text>

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

        <View style={styles.horizontalCardContainer}>
          <TouchableOpacity
            style={[
              styles.card,
              styles.cardSideBySide,
              styles.transparentCard,
              ratePressed && styles.filledCard,
            ]}
            onPressIn={() => setRatePressed(true)}
            onPressOut={() => setRatePressed(false)}
            onPress={() => {
              const todayLocal = getTodayLocal();
              setSelectedDay(todayLocal);
              setModalVisible(true);
            }}
          >
            <Card.Content>
              <Text
                style={[
                  styles.actionCardTitle,
                  ratePressed ? styles.pressedText : styles.unpressedText,
                ]}
              >
                Rate Your Day
              </Text>
            </Card.Content>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card,
              styles.cardSideBySide,
              styles.transparentCard,
              journalPressed && styles.filledCard,
            ]}
            onPressIn={() => setJournalPressed(true)}
            onPressOut={() => setJournalPressed(false)}
            onPress={() => navigation.navigate('JournalEntry', { session })}
          >
            <Card.Content>
              <Text
                style={[
                  styles.actionCardTitle,
                  journalPressed ? styles.pressedText : styles.unpressedText,
                ]}
              >
                Journal Now
              </Text>
            </Card.Content>
          </TouchableOpacity>
        </View>

        <Image source={require('../assets/images/account.png')} style={styles.separator} />

        <Card style={styles.card}>
          <Card.Title title="I wonder how far we've come ;)" titleStyle={styles.actionCardTitle2} />
          <Card.Actions>
            <Button mode="contained" onPress={() => navigation.navigate('PastEntries', { session })} style={styles.button} labelStyle={styles.buttonLabel}>
              View Past Entries
            </Button>
          </Card.Actions>
        </Card>
        
        <Image source={require('../assets/images/account.png')} style={styles.End} />
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>How was your {selectedDay ? getDayName(selectedDay.toISOString()) : ''}?</Text>
            <View style={styles.emojisContainer}>
              {['😡', '😢', '😐', '😊', '😍'].map((emoji, index) => (
                <TouchableOpacity key={index} onPress={() => handleRateDay(index + 1)}>
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button mode="contained" onPress={() => setModalVisible(false)} style={styles.button} labelStyle={styles.buttonLabel}>
              Close
            </Button>
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
    width: '100%',
    height: undefined,
    maxHeight: 400, // or any value you prefer
    aspectRatio: 1, // Ensure the aspect ratio is maintained
    alignSelf: 'center',
    resizeMode: 'contain'
  },
  profileButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginVertical: 15,
    padding: 10,
    paddingVertical: 20,
    borderRadius: 10,
  },
  cardSideBySide: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 30,
  },
  horizontalCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
  },
  actionCardTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  actionCardTitle2: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  separator: {
    width: '100%',
    height: 15,
    resizeMode: 'contain',
    marginVertical: 15,
  },
  End: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    marginVertical: 15,
  },
  ratingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
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
  transparentCard: {
    borderWidth: 2,
    borderColor: '#6936b3',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filledCard: {
    backgroundColor: '#6936b3',
  },
  unpressedText: {
    color: '#6936b3',
  },
  pressedText: {
    color: '#fff',
  },
  button: {
    width: '100%',
    paddingVertical: 8,
    justifyContent: 'center',
    fontFamily: 'Poppins-Bold',
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '85%',
    padding: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6936b3',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    fontFamily: 'Poppins-Bold',
  },
  emojisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 50,
  },
});

export default Homepage;
