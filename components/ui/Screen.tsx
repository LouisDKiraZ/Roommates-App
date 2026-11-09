import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useThemeColor } from "@/components/Themed";

interface ScreenProps {
  children: React.ReactNode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
}

// Thin wrapper so every screen gets the themed background instead of
// relying on React Navigation's default white/black scene background.
export function Screen({ children, edges = ["top", "bottom"], style }: ScreenProps) {
  const background = useThemeColor({}, "background");

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
});
