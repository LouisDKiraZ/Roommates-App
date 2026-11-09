import { StyleSheet, Text, View } from "react-native";

import { FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";

interface ChipProps {
  label: string;
  color: string;
  variant?: "solid" | "soft";
}

export function Chip({ label, color, variant = "soft" }: ChipProps) {
  const isSolid = variant === "solid";

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: isSolid ? color : `${color}1F`,
        },
      ]}>
      <Text style={[styles.label, { color: isSolid ? "#FFFFFF" : color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
  },
});
