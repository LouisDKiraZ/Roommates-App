import { Pressable, StyleSheet, View } from "react-native";

import { Text, useThemeColor } from "@/components/Themed";
import { FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";

interface PersonChipProps {
  label: string;
  color?: string;
  selected: boolean;
  onPress: () => void;
}

export function PersonChip({ label, color, selected, onPress }: PersonChipProps) {
  const primary = useThemeColor({}, "primary");
  const primaryMuted = useThemeColor({}, "primaryMuted");
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const text = useThemeColor({}, "text");

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.personChip,
        {
          borderColor: selected ? primary : border,
          backgroundColor: selected ? primaryMuted : card,
        },
      ]}>
      {color && <View style={[styles.personDot, { backgroundColor: color }]} />}
      <Text style={[styles.personChipLabel, { color: selected ? primary : text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  personChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    height: 36,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  personDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  personChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
});
