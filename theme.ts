import { DefaultTheme } from 'react-native-paper';
import { useFonts } from 'expo-font';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ee',
    accent: '#03dac4',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#000000',
    placeholder: '#b0bec5',
  },
  roundness: 10,
};

export const useCustomFonts = () => {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
  });
  return fontsLoaded;
};
