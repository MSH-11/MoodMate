import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { StyleSheet, View, Alert, Image } from 'react-native'
import { Button, TextInput, Paragraph } from 'react-native-paper'
import { Session } from '@supabase/supabase-js'
import { theme } from '../theme' // Import theme for consistent styling
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (session) getProfile()
  }, [session])

  async function getProfile() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', session?.user.id)
        .single()
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setWebsite(data.website)
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile({
    username,
    website,
    avatar_url,
  }: {
    username: string
    website: string
    avatar_url: string
  }) {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates = {
        id: session?.user.id,
        username,
        website,
        avatar_url,
        updated_at: new Date(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)

      if (error) {
        throw error
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require('../assets/images/account.png')} style={styles.photo} />
      <View style={styles.inputContainer}>
        <TextInput
          label="Email"
          value={session?.user?.email}
          disabled
          mode="outlined"
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          label="Username"
          value={username || ''}
          onChangeText={(text) => setUsername(text)}
          mode="outlined"
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          label="Website"
          value={website || ''}
          onChangeText={(text) => setWebsite(text)}
          mode="outlined"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => updateProfile({ username, website, avatar_url: avatarUrl })}
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Loading ...' : 'Update'}
        </Button>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={() => supabase.auth.signOut()}
        >
          Sign Out
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  inputContainer: {
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 20,
  },
  photo: {
    width: '100%',
    height: undefined,
    maxHeight: 400, // or any value you prefer
    aspectRatio: 1, // Ensure the aspect ratio is maintained
    alignSelf: 'center',
    resizeMode: 'contain'
  },
})
