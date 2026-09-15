import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";

export function useDesignSystemFonts() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    // Compatibility aliases keep existing screen styles on the shared Jakarta
    // font while the mobile UI is migrated to semantic font names.
    Inter_400Regular: PlusJakartaSans_400Regular,
    Inter_500Medium: PlusJakartaSans_500Medium,
    Inter_600SemiBold: PlusJakartaSans_600SemiBold,
    Inter_700Bold: PlusJakartaSans_700Bold,
  });

  return {
    fontsLoaded,
    fontError,
    fonts: {
      heading: "Outfit_700Bold",
      body: "PlusJakartaSans_400Regular",
      bodyMedium: "PlusJakartaSans_500Medium",
      bodySemibold: "PlusJakartaSans_600SemiBold",
      bodyBold: "PlusJakartaSans_700Bold",
    },
  } as const;
}
