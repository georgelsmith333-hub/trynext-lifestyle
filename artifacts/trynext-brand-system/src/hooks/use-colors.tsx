import { useColorScheme } from "react-native";
import { getNativeColors } from "../lib/native-theme";

export function useColors() {
  return getNativeColors(useColorScheme() === "dark" ? "dark" : "light");
}
