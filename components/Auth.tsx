import React, { useState } from 'react';
import { Alert, StyleSheet, View, AppState, Image, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { Text, Button, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { user },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert(error.message);
    } else if (user) {
      const updates = {
        id: user.id,
        full_name: fullName,
        updated_at: new Date(),
      };

      const { error: updateError } = await supabase.from('profiles').upsert(updates);

      if (updateError) {
        Alert.alert(updateError.message);
      } else {
        Alert.alert('Please check your inbox for email verification!');
      }
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Image source={require('../assets/images/logo.png')} style={styles.logo} />
            <Text style={styles.subHeader}>Please Sign in or Sign up below :)</Text>
          </View>
          <View style={styles.verticallySpaced}>
            <TextInput
              label="Email"
              left={<TextInput.Icon icon="email" />}
              onChangeText={(text) => setEmail(text)}
              value={email}
              placeholder="email@address.com"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
            />
          </View>
          <View style={styles.verticallySpaced}>
            <TextInput
              label="Password"
              left={<TextInput.Icon icon="lock" />}
              onChangeText={(text) => setPassword(text)}
              value={password}
              secureTextEntry
              placeholder="Password"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
            />
          </View>
          {isSignUp && (
            <View style={styles.verticallySpaced}>
              <TextInput
                label="Full Name"
                left={<TextInput.Icon icon="account" />}
                onChangeText={(text) => setFullName(text)}
                value={fullName}
                placeholder="Full Name"
                autoCapitalize="words"
                mode="outlined"
                style={styles.input}
              />
            </View>
          )}
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Button
              mode="contained"
              onPress={isSignUp ? signUpWithEmail : signInWithEmail}
              loading={loading}
              disabled={loading}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              {isSignUp ? 'Complete Sign Up' : 'Sign in'}
            </Button>
          </View>
          <View style={styles.verticallySpaced}>
            <Button
              mode="outlined"
              onPress={() => setIsSignUp(!isSignUp)}
              style={styles.buttonOutlined}
              labelStyle={styles.buttonLabelOutlined}
            >
              {isSignUp ? 'Back to Sign In' : 'Switch to Sign Up'}
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    marginBottom: 40,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Poppins-Bold',
  },
  subHeader: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  verticallySpaced: {
    marginBottom: 20,
  },
  mt20: {
    marginTop: 20,
  },
  input: {
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    paddingVertical: 8,
    justifyContent: 'center',
    fontFamily: 'Poppins-Bold',
  },
  buttonOutlined: {
    width: '100%',
    paddingVertical: 8,
    justifyContent: 'center',
    borderColor: '#6200ee',
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonLabelOutlined: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  logo: {
    width: '100%',
    height: undefined,
    maxHeight: 350, // or any value you prefer
    aspectRatio: 1, // Ensure the aspect ratio is maintained
    alignSelf: 'center',
    resizeMode: 'contain',
  },
});
