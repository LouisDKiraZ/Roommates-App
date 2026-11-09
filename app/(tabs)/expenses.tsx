import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { AvatarStack } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { currentUser, expenses, getRoommate } from "@/mocks/data";
import { Accent, FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";
import type { ExpenseCategory } from "@/types";

const categoryIcon: Record<ExpenseCategory, keyof typeof Ionicons.glyphMap> = {
  groceries: "cart-outline",
  utilities: "flash-outline",
  household: "home-outline",
  rent: "key-outline",
  other: "ellipsis-horizontal-outline",
};

const categoryLabel: Record<ExpenseCategory, string> = {
  groceries: "Groceries",
  utilities: "Utilities",
  household: "Household",
  rent: "Rent",
  other: "Other",
};

function computeBalance() {
  let youOwe = 0;
  let youAreOwed = 0;

  for (const expense of expenses) {
    if (expense.paidById === currentUser.id) {
      for (const split of expense.splits) {
        if (split.roommateId !== currentUser.id && !split.settled) youAreOwed += split.amount;
      }
    } else {
      const mine = expense.splits.find((s) => s.roommateId === currentUser.id);
      if (mine && !mine.settled) youOwe += mine.amount;
    }
  }

  return { youOwe, youAreOwed, net: youAreOwed - youOwe };
}

export default function ExpensesScreen() {
  const textMuted = useThemeColor({}, "textMuted");
  const { youOwe, youAreOwed, net } = computeBalance();

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title="Expenses" subtitle="Shared spending history" />

      <View style={styles.balanceWrap}>
        <Card>
          <Text style={{ color: textMuted, fontSize: FontSize.sm }}>Your balance</Text>
          <Text
            style={[
              styles.netAmount,
              { color: net >= 0 ? Accent.success : Accent.danger },
            ]}>
            {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(2)}
          </Text>
          <View style={styles.balanceSplit}>
            <View style={styles.balanceItem}>
              <Text style={{ color: textMuted, fontSize: FontSize.xs }}>You owe</Text>
              <Text style={styles.balanceItemValue}>${youOwe.toFixed(2)}</Text>
            </View>
            <View style={[styles.balanceItem, styles.balanceItemRight]}>
              <Text style={{ color: textMuted, fontSize: FontSize.xs }}>You&apos;re owed</Text>
              <Text style={styles.balanceItemValue}>${youAreOwed.toFixed(2)}</Text>
            </View>
          </View>
        </Card>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {expenses.map((expense) => {
          const payer = getRoommate(expense.paidById);
          return (
            <Card key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseTop}>
                <View style={[styles.expenseIcon, { backgroundColor: `${Accent.expenses}1F` }]}>
                  <Ionicons
                    name={categoryIcon[expense.category]}
                    size={20}
                    color={Accent.expenses}
                  />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseTitle} numberOfLines={1}>
                    {expense.title}
                  </Text>
                  <Text style={{ color: textMuted, fontSize: FontSize.xs }}>
                    Paid by {payer?.name} · {expense.date}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
              </View>

              <View style={styles.expenseBottom}>
                <AvatarStack
                  avatars={expense.splits.map((s) => {
                    const r = getRoommate(s.roommateId);
                    return { id: s.roommateId, initials: r?.initials ?? "?", color: r?.avatarColor ?? "#999" };
                  })}
                  size={22}
                />
                <Chip label={categoryLabel[expense.category]} color={Accent.expenses} />
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <Fab comingSoonLabel="Adding an expense" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  netAmount: {
    fontSize: 32,
    fontWeight: FontWeight.bold as any,
    marginTop: 2,
  },
  balanceSplit: {
    flexDirection: "row",
    marginTop: Spacing.md,
  },
  balanceItem: {
    flex: 1,
  },
  balanceItemRight: {
    alignItems: "flex-end",
  },
  balanceItemValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + 56,
    gap: Spacing.md,
  },
  expenseCard: {},
  expenseTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  expenseInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  expenseTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  expenseAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold as any,
  },
  expenseBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(127,127,127,0.15)",
  },
});
