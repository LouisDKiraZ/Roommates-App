import { StyleSheet, View, type ViewProps } from "react-native";

import { useThemeColor } from "@/components/Themed";
import { Radius, Spacing } from "@/constants/theme";

export function Card({ style, ...rest }: ViewProps) {
  const background = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");

  return (
    <View
      style={[styles.card, { backgroundColor: background, borderColor: border }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
