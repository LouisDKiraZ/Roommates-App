import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColor } from "@/components/Themed";
import { FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  fullWidth = true,
}: ButtonProps) {
  const primary = useThemeColor({}, "primary");
  const primaryMuted = useThemeColor({}, "primaryMuted");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({}, "border");

  const backgroundColor =
    variant === "primary" ? primary : variant === "secondary" ? primaryMuted : "transparent";
  const textColor = variant === "primary" ? "#FFFFFF" : variant === "secondary" ? primary : text;
  const borderStyle = variant === "ghost" ? { borderWidth: 1, borderColor: border } : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: pressed ? 0.85 : 1 },
        borderStyle,
        fullWidth ? styles.fullWidth : undefined,
      ]}>
      <View style={styles.content}>
        {icon && <Ionicons name={icon} size={18} color={textColor} style={styles.icon} />}
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: Spacing.sm,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
});
