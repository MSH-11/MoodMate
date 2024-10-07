# MoodMate

![MoodMate Demo](./MoodMate.gif)

MoodMate is a daily journaling app designed to help users reflect on their day and receive personalized feedback and recommendations based on their journal entries. The app allows users to rate their mood, write journal entries, and access past entries, making it a valuable tool for self-reflection and mental well-being.

## Features

- **Daily Mood Rating:** Users can rate their day on a scale from 😠 (Very Bad) to 😁 (Very Good).
- **Journal Entries:** Write and save journal entries to document your thoughts and feelings.
- **Personalized Feedback:** Receive compassionate feedback and recommended actions from an AI-powered assistant based on your journal entries.
- **Past Entries Access:** Easily review and reflect on past journal entries and mood ratings.
- **User Authentication:** Secure user authentication using Supabase, with options to sign up and sign in using email and password.

## Why MoodMate?

MoodMate is designed to promote self-care and mental well-being by encouraging daily reflection and providing AI-powered feedback. Whether you're looking to track your emotional health, gain insights into your daily patterns, or simply have a space to vent, MoodMate is a helpful companion on your journey.

## Prerequisites

- **Node.js** (v14 or later)
- **Expo CLI** (v5.0.0 or later)
- **Supabase Account:** Set up a Supabase project and configure the necessary database tables.
- **OpenAI Account:** Obtain an API key from OpenAI to enable AI-powered feedback.

## Setting Up Supabase

To set up your Supabase project, follow these steps:

1. Create a new project in Supabase.

2. In the SQL editor, run the following queries to set up the necessary tables and policies:

    ```sql
    -- Create a table for public profiles
    create table profiles (
      id uuid references auth.users on delete cascade not null primary key,
      updated_at timestamp with time zone,
      username text unique,
      full_name text,
      avatar_url text,
      website text,
      constraint username_length check (char_length(username) >= 3)
    );

    -- Set up Row Level Security (RLS)
    alter table profiles enable row level security;

    create policy "Public profiles are viewable by everyone." on profiles for select using (true);

    create policy "Users can insert their own profile." on profiles for insert with check ((select auth.uid()) = id);

    create policy "Users can update own profile." on profiles for update using ((select auth.uid()) = id);

    -- Trigger to create profile on user sign-up
    create function public.handle_new_user() returns trigger as $$
    begin
      insert into public.profiles (id, full_name, avatar_url)
      values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
      return new;
    end;
    $$ language plpgsql security definer;

    create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

    -- Set up Storage for avatars
    insert into storage.buckets (id, name) values ('avatars', 'avatars');

    -- Storage access policies
    create policy "Avatar images are publicly accessible." on storage.objects for select using (bucket_id = 'avatars');

    create policy "Anyone can upload an avatar." on storage.objects for insert with check (bucket_id = 'avatars');
    ```

    ```sql
    -- Create a table for journal entries
    create table journal_entries (
      id uuid default uuid_generate_v4() not null primary key,
      user_id uuid references profiles(id) on delete cascade not null,
      entry_date date not null,
      journal_entry text,
      rating int check (rating >= 1 and rating <= 5),
      created_at timestamp with time zone default now() not null,
      updated_at timestamp with time zone default now() not null,
      unique (user_id, entry_date)
    );

    -- Set up Row Level Security (RLS)
    alter table journal_entries enable row level security;

    create policy "Journal entries are viewable by the user who created them." on journal_entries for select using (auth.uid() = user_id);

    create policy "Users can insert their own journal entries." on journal_entries for insert with check (auth.uid() = user_id);

    create policy "Users can update their own journal entries." on journal_entries for update using (auth.uid() = user_id);

    create policy "Users can delete their own journal entries." on journal_entries for delete using (auth.uid() = user_id);
    ```

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/MSH-11/moodmate.git
    cd moodmate
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env.local` file in the root directory and add your Supabase credentials and OpenAI API key:

    ```plaintext
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    OPENAI_API_KEY=your_openai_api_key
    ```

## Running the App

### Using Expo Go

1. Start the development server:

    ```bash
    npx expo start
    ```

2. Download the [Expo Go](https://expo.dev/client) app on your iOS or Android device.

3. Scan the QR code displayed in the terminal or browser with your device to open the app.

### Using Xcode (iOS Simulator on macOS)

1. Start the development server:

    ```bash
    npx expo start
    ```

2. Open Xcode and start an iOS simulator.

3. In the Expo development server, press `i` to run the app in the iOS simulator.

### Using Android Emulator

1. Start an Android emulator (e.g., Android Studio).

2. Start the development server:

    ```bash
    npx expo start
    ```

3. In the Expo development server, press `a` to run the app in the Android emulator.

## Contributing

If you'd like to contribute to MoodMate, please fork the repository and use a feature branch. Pull requests are warmly welcome.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
