import { Alert, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColor } from "@/components/Themed";

interface FabProps {
  icon?: keyof typeof Ionicons.glyphMap;
  comingSoonLabel?: string;
  onPress?: () => void;
}

// Visible on every feature tab so the layout reads as "finished", but with
// no screen behind it yet it just announces that the action isn't built.
export function Fab({ icon = "add", comingSoonLabel = "This feature", onPress }: FabProps) {
  const primary = useThemeColor({}, "primary");

  function handlePress() {
    if (onPress) return onPress();
    Alert.alert("Coming soon", `${comingSoonLabel} isn't built yet in this skeleton.`);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: primary, opacity: pressed ? 0.9 : 1 },
      ]}>
      <Ionicons name={icon} size={26} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
