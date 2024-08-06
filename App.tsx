import * as React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Account from './screens/AccountScreen';
import Homepage from './screens/HomePage';
import JournalEntry from './screens/JournalEntry';
import PastEntries from './screens/PastEntries';
import { Session } from '@supabase/supabase-js';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme, useCustomFonts } from './theme';

enableScreens();

type RootStackParamList = {
  Auth: undefined;
  Homepage: { session: Session };
  Account: { session: Session };
  JournalEntry: { session: Session };
  PastEntries: { session: Session };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const fontsLoaded = useCustomFonts();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (!fontsLoaded) {
    return null; // Render a loading screen or null while fonts are loading
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <Stack.Navigator>
            {session && session.user ? (
              <>
                <Stack.Screen name="Homepage" options={{ headerShown: false }}>
                  {props => <Homepage {...props} session={session} />}
                </Stack.Screen>
                <Stack.Screen name="Account" options={{ headerShown: false }}>
                  {props => <Account {...props} key={session.user.id} session={session} />}
                </Stack.Screen>
                <Stack.Screen name="JournalEntry" component={JournalEntry} initialParams={{ session }} options={{ headerShown: false }} />
                <Stack.Screen name="PastEntries" component={PastEntries} initialParams={{ session }} options={{ headerShown: false }} />
              </>
            ) : (
              <Stack.Screen name="Auth" component={Auth} options={{ headerShown: false }} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
