import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Fab } from "@/components/ui/Fab";
import { PersonChip } from "@/components/ui/PersonChip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextField } from "@/components/ui/TextField";
import { useAppState } from "@/context/AppStateContext";
import {
  computeBalance,
  filterExpensesByRoommate,
  simplifyDebts,
} from "@/lib/expenses";
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

const CATEGORY_OPTIONS: ExpenseCategory[] = [
  "groceries",
  "utilities",
  "household",
  "rent",
  "other",
];

export default function ExpensesScreen() {
  const { apartment, currentUser, expenses, addExpense, removeExpense } = useAppState();
  const textMuted = useThemeColor({}, "textMuted");
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const primary = useThemeColor({}, "primary");
  const primaryMuted = useThemeColor({}, "primaryMuted");
  const text = useThemeColor({}, "text");

  const [selectedPersonId, setSelectedPersonId] = useState<"all" | string>("all");

  const roommates = useMemo(() => apartment?.roommates ?? [], [apartment?.roommates]);
  const currentUserId = currentUser?.id ?? "";

  // Modal form states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("groceries");
  const [paidById, setPaidById] = useState("");
  const [splitWithIds, setSplitWithIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Compute balance using the active apartment members and optionally filtered by selected member
  const { youOwe, youAreOwed, net } = useMemo(
    () => computeBalance(expenses, currentUserId, selectedPersonId),
    [expenses, currentUserId, selectedPersonId]
  );

  // Calculate simplified debts across the dynamic members
  const simplifiedDebtsList = useMemo(
    () => simplifyDebts(expenses, roommates),
    [expenses, roommates]
  );

  const visibleExpenses = useMemo(
    () => filterExpensesByRoommate(expenses, selectedPersonId),
    [expenses, selectedPersonId]
  );

  if (!apartment || !currentUser) return null;

  const selectedPerson =
    selectedPersonId === "all"
      ? null
      : apartment.roommates.find((r) => r.id === selectedPersonId) ?? null;

  const balanceTitle = selectedPerson
    ? selectedPerson.isYou
      ? "Your balance"
      : `Balance with ${selectedPerson.name}`
    : "Your balance";

  function openAddModal() {
    setExpenseTitle("");
    setExpenseAmount("");
    setExpenseCategory("groceries");
    setPaidById(currentUser?.id ?? roommates[0]?.id ?? "");
    setSplitWithIds(roommates.map((r) => r.id));
    setFormError(null);
    setAddModalVisible(true);
  }

  function toggleSplitMember(memberId: string) {
    setSplitWithIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  function handleSelectAllSplits() {
    if (splitWithIds.length === roommates.length) {
      setSplitWithIds([]);
    } else {
      setSplitWithIds(roommates.map((r) => r.id));
    }
  }

  function handleDeleteExpense(expenseId: string, title: string) {
    Alert.alert(
      "Delete Expense",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeExpense(expenseId);
          },
        },
      ]
    );
  }

  // Calculate preview split amount
  const parsedAmount = parseFloat(expenseAmount.replace(/,/g, "."));
  const validAmount = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const splitCount = splitWithIds.length;
  const perPersonPreview =
    splitCount > 0 ? (validAmount / splitCount).toFixed(2) : "0.00";

  async function handleCreateExpense() {
    if (!expenseTitle.trim()) {
      setFormError("Please enter an expense description.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Please enter a valid amount greater than $0.");
      return;
    }
    if (splitWithIds.length === 0) {
      setFormError("Please select at least one roommate to split with.");
      return;
    }
    const payer = paidById || currentUser?.id || roommates[0]?.id;
    if (!payer) {
      setFormError("Please select who paid for this expense.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      await addExpense({
        title: expenseTitle.trim(),
        amount: parsedAmount,
        category: expenseCategory,
        paidById: payer,
        splitWithIds,
      });
      setAddModalVisible(false);
      setExpenseTitle("");
      setExpenseAmount("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't add expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title="Expenses"
        subtitle={expenses.length === 0 ? "No expenses yet" : "Shared spending history"}
        logo={require("@/assets/logo.jpg")}
      />

      <View style={styles.balanceWrap}>
        <Card>
          <Text style={{ color: textMuted, fontSize: FontSize.sm }}>{balanceTitle}</Text>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.personRow}>
        <PersonChip
          label="Everyone"
          selected={selectedPersonId === "all"}
          onPress={() => setSelectedPersonId("all")}
        />
        {apartment.roommates.map((r) => (
          <PersonChip
            key={r.id}
            label={r.isYou ? "You" : r.name}
            color={r.avatarColor}
            selected={selectedPersonId === r.id}
            onPress={() => setSelectedPersonId(r.id)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {selectedPersonId === "all" && simplifiedDebtsList.length > 0 && (
          <View style={styles.simplifiedSection}>
            <Text style={[styles.sectionTitle, { color: textMuted }]}>Simplified settlements</Text>
            <Card style={styles.simplifiedCard}>
              {simplifiedDebtsList.map((t, idx) => {
                const fromR = apartment.roommates.find((r) => r.id === t.fromId);
                const toR = apartment.roommates.find((r) => r.id === t.toId);
                const fromName = fromR ? (fromR.isYou ? "You" : fromR.name) : "Roommate";
                const toName = toR ? (toR.isYou ? "you" : toR.name) : "Roommate";
                return (
                  <View
                    key={idx}
                    style={[
                      styles.simplifiedRow,
                      idx > 0 && styles.simplifiedRowBorder,
                    ]}>
                    <View style={styles.simplifiedInfo}>
                      <Ionicons
                        name="arrow-forward-outline"
                        size={16}
                        color={Accent.expenses}
                      />
                      <Text style={styles.simplifiedText}>
                        <Text style={{ fontWeight: FontWeight.semibold as any }}>
                          {fromName}
                        </Text>{" "}
                        owes{" "}
                        <Text style={{ fontWeight: FontWeight.semibold as any }}>
                          {toName}
                        </Text>
                      </Text>
                    </View>
                    <Text style={[styles.simplifiedAmount, { color: Accent.expenses }]}>
                      ${t.amount.toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {visibleExpenses.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons
              name="wallet-outline"
              size={36}
              color={textMuted}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyTitle, { color: textMuted }]}>
              {selectedPerson
                ? `No expenses found for ${selectedPerson.isYou ? "you" : selectedPerson.name}.`
                : "No expenses yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: textMuted }]}>
              {selectedPerson
                ? "This roommate has no shared spending logged."
                : "Shared expenses and split bills will appear here."}
            </Text>
          </Card>
        ) : (
          visibleExpenses.map((expense) => {
            const payer = apartment.roommates.find((r) => r.id === expense.paidById);
            const payerName = payer ? (payer.isYou ? "You" : payer.name) : "Roommate";

            return (
              <Card key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseTop}>
                  <View
                    style={[
                      styles.expenseIcon,
                      { backgroundColor: `${Accent.expenses}1F` },
                    ]}>
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
                      Paid by {payerName} · {expense.date}
                    </Text>
                  </View>
                  <View style={styles.expenseAmountWrap}>
                    <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
                    <Pressable
                      onPress={() => handleDeleteExpense(expense.id, expense.title)}
                      hitSlop={8}
                      style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={18} color={textMuted} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.expenseBottom}>
                  <AvatarStack
                    avatars={expense.splits.map((s) => {
                      const r = apartment.roommates.find((m) => m.id === s.roommateId);
                      return {
                        id: s.roommateId,
                        initials: r?.initials ?? "?",
                        color: r?.avatarColor ?? "#999",
                      };
                    })}
                    size={22}
                  />
                  <Chip
                    label={categoryLabel[expense.category]}
                    color={Accent.expenses}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Fab onPress={openAddModal} />

      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add an expense</Text>
              <Pressable onPress={() => setAddModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={textMuted} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalBody}>
              <TextField
                label="Description"
                placeholder="e.g. Weekly groceries"
                value={expenseTitle}
                onChangeText={setExpenseTitle}
              />

              <TextField
                label="Total amount ($)"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={expenseAmount}
                onChangeText={setExpenseAmount}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = expenseCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setExpenseCategory(cat)}
                      style={[
                        styles.chipOption,
                        {
                          borderColor: isSelected ? primary : border,
                          backgroundColor: isSelected ? primaryMuted : card,
                        },
                      ]}>
                      <Ionicons
                        name={categoryIcon[cat]}
                        size={16}
                        color={isSelected ? primary : textMuted}
                      />
                      <Text
                        style={[
                          styles.chipLabel,
                          { color: isSelected ? primary : text },
                        ]}>
                        {categoryLabel[cat]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Paid by</Text>
              <View style={styles.chipRow}>
                {apartment.roommates.map((r) => {
                  const isSelected = (paidById || currentUser.id) === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setPaidById(r.id)}
                      style={[
                        styles.chipOption,
                        {
                          borderColor: isSelected ? primary : border,
                          backgroundColor: isSelected ? primaryMuted : card,
                        },
                      ]}>
                      <Avatar initials={r.initials} color={r.avatarColor} size={20} />
                      <Text
                        style={[
                          styles.chipLabel,
                          { color: isSelected ? primary : text },
                        ]}>
                        {r.isYou ? "You" : r.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.splitHeaderRow}>
                <Text style={styles.fieldLabel}>Split between</Text>
                <Pressable onPress={handleSelectAllSplits} hitSlop={6}>
                  <Text style={[styles.selectAllText, { color: primary }]}>
                    {splitWithIds.length === roommates.length ? "Clear all" : "Select all"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.chipRow}>
                {apartment.roommates.map((r) => {
                  const isIncluded = splitWithIds.includes(r.id);
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => toggleSplitMember(r.id)}
                      style={[
                        styles.chipOption,
                        {
                          borderColor: isIncluded ? primary : border,
                          backgroundColor: isIncluded ? primaryMuted : card,
                        },
                      ]}>
                      <Ionicons
                        name={isIncluded ? "checkbox" : "square-outline"}
                        size={16}
                        color={isIncluded ? primary : textMuted}
                      />
                      <Text
                        style={[
                          styles.chipLabel,
                          { color: isIncluded ? primary : text },
                        ]}>
                        {r.isYou ? "You" : r.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {splitCount > 0 && validAmount > 0 && (
                <View style={[styles.splitPreviewCard, { borderColor: border }]}>
                  <Ionicons name="information-circle-outline" size={18} color={primary} />
                  <Text style={[styles.splitPreviewText, { color: textMuted }]}>
                    Split evenly: <Text style={{ color: text, fontWeight: FontWeight.bold as any }}>${perPersonPreview}</Text> / person ({splitCount} {splitCount === 1 ? "roommate" : "roommates"})
                  </Text>
                </View>
              )}

              {formError && (
                <Text style={styles.formErrorText}>{formError}</Text>
              )}

              <View style={{ marginTop: Spacing.md }}>
                <Button
                  label={submitting ? "Adding expense..." : "Add expense"}
                  onPress={handleCreateExpense}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  filterScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
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
  simplifiedSection: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  simplifiedCard: {
    paddingVertical: Spacing.xs,
  },
  simplifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  simplifiedRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(127,127,127,0.15)",
  },
  simplifiedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  simplifiedText: {
    fontSize: FontSize.sm,
  },
  simplifiedAmount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold as any,
    marginLeft: Spacing.sm,
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
  expenseAmountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  deleteButton: {
    padding: Spacing.xs,
    borderRadius: Radius.sm,
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
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    marginBottom: Spacing.sm,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    marginTop: 4,
    textAlign: "center",
    opacity: 0.8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: "85%",
    paddingTop: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.sm,
    opacity: 0.8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  chipOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    gap: Spacing.xs,
  },
  chipLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
  },
  splitHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  selectAllText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
  },
  splitPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  splitPreviewText: {
    fontSize: FontSize.xs,
    flex: 1,
  },
  formErrorText: {
    color: Accent.danger,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
});
