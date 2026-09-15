import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  contentContainerStyle,
  ...props
}: Props) {
  const mergedContentContainerStyle = [
    contentContainerStyle,
    Platform.OS !== "web" ? { flexGrow: 1 } : null,
  ];
  if (Platform.OS === "web") {
    return (
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        contentContainerStyle={mergedContentContainerStyle}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      contentContainerStyle={mergedContentContainerStyle}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
