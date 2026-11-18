import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { Text, useThemeColor } from "@/components/Themed";
import { FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const text = useThemeColor({}, "text");
  const textMuted = useThemeColor({}, "textMuted");
  const danger = useThemeColor({}, "danger");

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={textMuted}
        style={[
          styles.input,
          { backgroundColor: card, borderColor: error ? danger : border, color: text },
          style,
        ]}
        {...rest}
      />
      {error && <Text style={[styles.error, { color: danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.sm,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
  },
  error: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});
