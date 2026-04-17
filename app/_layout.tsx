import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "SaoChingcha-Bold": require("../assets/fonts/SaoChingcha-Bold.otf"),
    "Anuphan-Thin": require("../assets/fonts/Anuphan-Thin.ttf"),
    "Anuphan-ExtraLight": require("../assets/fonts/Anuphan-ExtraLight.ttf"),
    "Anuphan-Light": require("../assets/fonts/Anuphan-Light.ttf"),
    "Anuphan-Regular": require("../assets/fonts/Anuphan-Regular.ttf"),
    "Anuphan-Medium": require("../assets/fonts/Anuphan-Medium.ttf"),
    "Anuphan-SemiBold": require("../assets/fonts/Anuphan-SemiBold.ttf"),
    "Anuphan-Bold": require("../assets/fonts/Anuphan-Bold.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
