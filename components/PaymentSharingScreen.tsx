import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Expense,
  NettedDebt,
  calculateNettedDebts,
  calculateNetBalances,
  formatRon,
  roundToTwoDecimals,
} from '@/types/expense';
import { DUMMY_EXPENSES } from '@/data/dummyExpenses';

export const PREDEFINED_ROOMMATES = ['Abdullah', 'Sam', 'Jordan', 'Taylor', 'Louis'] as const;

interface PaymentSharingScreenProps {
  initialExpenses?: Expense[];
  onExpensesChange?: (expenses: Expense[]) => void;
}

export default function PaymentSharingScreen({
  initialExpenses = DUMMY_EXPENSES,
  onExpensesChange,
}: PaymentSharingScreenProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // In-app Notification toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add Expense Form state
  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [payer, setPayer] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [formError, setFormError] = useState('');

  // Update expenses and notify external listeners if provided
  const updateExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    if (onExpensesChange) {
      onExpensesChange(newExpenses);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Predefined roommates matching the rest of the application
  const knownRoommates = useMemo(() => {
    const set = new Set<string>(PREDEFINED_ROOMMATES);
    expenses.forEach((e) => {
      if (e.payer) set.add(e.payer.trim());
      if (e.participants) {
        e.participants.forEach((p) => set.add(p.trim()));
      }
    });
    return Array.from(set).filter(Boolean);
  }, [expenses]);

  // Net balances per roommate (total paid minus total fair share)
  const netBalances = useMemo(() => {
    return calculateNetBalances(expenses);
  }, [expenses]);

  // Crucial requirement: Net debt simplification algorithm
  // Netted debts eliminate mutual debts and display ONLY simplified obligations
  const nettedDebts = useMemo(() => {
    return calculateNettedDebts(expenses);
  }, [expenses]);

  // Overall group spending statistics
  const totalSpent = useMemo(() => {
    const sum = expenses.reduce((acc, curr) => acc + curr.totalAmount, 0);
    return roundToTwoDecimals(sum);
  }, [expenses]);

  // Delete expense handler
  const handleDeleteExpense = (id: string, expenseTitle: string) => {
    const confirmDelete = () => {
      const updated = expenses.filter((e) => e.id !== id);
      updateExpenses(updated);
      showToast(`Removed expense "${expenseTitle}"`);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete expense "${expenseTitle}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Expense',
        `Are you sure you want to delete "${expenseTitle}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  // Reset to initial dummy netting scenario
  const handleResetToDummy = () => {
    updateExpenses(DUMMY_EXPENSES);
    showToast('Reset to 5-roommate shared expenses');
  };

  // Modal open & close handlers
  const handleOpenModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setDate(todayStr);
    setPayer(knownRoommates[0] || 'Abdullah');
    // Pre-select all predefined roommates by default for equal split
    setSelectedParticipants([...knownRoommates]);
    setFormError('');
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setTitle('');
    setAmountInput('');
    setPayer('');
    setSelectedParticipants([]);
    setDate('');
    setFormError('');
    setIsModalVisible(false);
  };

  const handleToggleParticipant = (person: string) => {
    if (selectedParticipants.includes(person)) {
      if (selectedParticipants.length === 1) {
        setFormError('At least one participant must be selected.');
        return;
      }
      setSelectedParticipants(selectedParticipants.filter((p) => p !== person));
    } else {
      setSelectedParticipants([...selectedParticipants, person]);
    }
    setFormError('');
  };

  const handleSaveExpense = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Please enter an expense title.');
      return;
    }

    const parsedAmount = parseFloat(amountInput.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }

    const trimmedPayer = payer.trim();
    if (!trimmedPayer) {
      setFormError('Please select who paid.');
      return;
    }

    if (selectedParticipants.length === 0) {
      setFormError('Please select at least one participant.');
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      title: trimmedTitle,
      payer: trimmedPayer,
      totalAmount: roundToTwoDecimals(parsedAmount),
      date: date.trim() || new Date().toISOString().split('T')[0],
      participants: [...selectedParticipants],
    };

    updateExpenses([newExpense, ...expenses]);
    handleCloseModal();
    showToast(`Added "${newExpense.title}" (${formatRon(newExpense.totalAmount)})`);
  };

  // Render individual expense card in the bottom FlatList
  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const splitCount = item.participants.length || 1;
    const perPersonShare = roundToTwoDecimals(item.totalAmount / splitCount);

    return (
      <View style={styles.expenseCard}>
        <View style={styles.expenseCardHeader}>
          <View style={styles.expenseTitleContainer}>
            <Text style={styles.expenseTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.expenseDateBadge}>
              <Text style={styles.expenseDateIcon}>📅</Text>
              <Text style={styles.expenseDateText}>{item.date}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.deleteExpenseButton}
            onPress={() => handleDeleteExpense(item.id, item.title)}
            accessibilityLabel={`Delete ${item.title}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteExpenseButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.expenseDetailsRow}>
          {/* Payer information */}
          <View style={styles.payerBadge}>
            <View style={styles.payerAvatar}>
              <Text style={styles.payerAvatarText}>
                {item.payer.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.payerSubLabel}>Paid by</Text>
              <Text style={styles.payerName}>{item.payer}</Text>
            </View>
          </View>

          {/* Total Amount Tag */}
          <View style={styles.amountContainer}>
            <Text style={styles.totalAmountText}>{formatRon(item.totalAmount)}</Text>
          </View>
        </View>

        {/* Participants and Split Breakdown */}
        <View style={styles.splitBreakdownContainer}>
          <View style={styles.splitHeaderRow}>
            <Text style={styles.splitLabel}>
              Split among {splitCount} {splitCount === 1 ? 'person' : 'people'}:
            </Text>
            <Text style={styles.splitPerPersonShare}>
              {formatRon(perPersonShare)} / person
            </Text>
          </View>

          <View style={styles.participantsChipsRow}>
            {item.participants.map((person, idx) => (
              <View key={idx} style={styles.participantChip}>
                <Text style={styles.participantChipText}>{person}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Top Section: 'Balances Summary' Card showing netted debts (Who owes whom)
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Screen Title & Top Actions Bar - Responsive layout with flexWrap */}
      <View style={styles.topBar}>
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle} numberOfLines={1}>
            Payment Sharing
          </Text>
          <Text style={styles.screenSubtitle} numberOfLines={1}>
            Track expenses & simplified debts
          </Text>
        </View>

        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetToDummy}
            activeOpacity={0.7}
            accessibilityLabel="Reset to test data"
          >
            <Text style={styles.resetButtonText}>Reset Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleOpenModal}
            activeOpacity={0.8}
            accessibilityLabel="Add new expense"
          >
            <Text style={styles.addButtonIcon}>+</Text>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* =========================================================================
          TOP SECTION: BALANCES SUMMARY CARD (Who owes whom)
          Crucial Net Balance Logic: Displays netted debts and eliminates mutual debts.
          ========================================================================= */}
      <View style={styles.balancesSummaryCard}>
        <View style={styles.summaryCardHeader}>
          <View style={styles.summaryTitleRow}>
            <Text style={styles.summaryCardIcon}>⚖️</Text>
            <View>
              <Text style={styles.summaryCardTitle}>Balances Summary</Text>
              <Text style={styles.summaryCardSubtitle}>
                Netted debts (Who owes whom)
              </Text>
            </View>
          </View>

          <View style={styles.settlementBadge}>
            <Text style={styles.settlementBadgeText}>
              {nettedDebts.length === 0
                ? 'All Settled'
                : `${nettedDebts.length} ${
                    nettedDebts.length === 1 ? 'Debt' : 'Debts'
                  } Pending`}
            </Text>
          </View>
        </View>

        {/* Netted Debts List */}
        <View style={styles.nettedDebtsSection}>
          {nettedDebts.length === 0 ? (
            <View style={styles.settledContainer}>
              <Text style={styles.settledEmoji}>🎉</Text>
              <Text style={styles.settledTitle}>All balances are settled up!</Text>
              <Text style={styles.settledSubtitle}>
                No outstanding mutual debts between roommates.
              </Text>
            </View>
          ) : (
            nettedDebts.map((debt: NettedDebt, index: number) => (
              <View key={`${debt.from}-${debt.to}-${index}`} style={styles.nettedDebtRow}>
                {/* Visual Debtor -> Creditor chain */}
                <View style={styles.debtFlowContainer}>
                  {/* Debtor */}
                  <View style={styles.debtorBadge}>
                    <View style={styles.debtorAvatar}>
                      <Text style={styles.avatarText}>
                        {debt.from.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.debtorName}>{debt.from}</Text>
                  </View>

                  {/* Flow Arrow */}
                  <View style={styles.flowArrowContainer}>
                    <Text style={styles.owesLabel}>owes</Text>
                    <Text style={styles.flowArrow}>⟶</Text>
                  </View>

                  {/* Creditor */}
                  <View style={styles.creditorBadge}>
                    <View style={styles.creditorAvatar}>
                      <Text style={styles.avatarText}>
                        {debt.to.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.creditorName}>{debt.to}</Text>
                  </View>
                </View>

                {/* Amount and exact text representation: e.g. "Taylor owes Abdullah 35 RON" */}
                <View style={styles.debtStatementContainer}>
                  <Text style={styles.debtStatementText}>
                    <Text style={styles.debtStatementBold}>{debt.from}</Text> owes{' '}
                    <Text style={styles.debtStatementBold}>{debt.to}</Text>{' '}
                    <Text style={styles.debtStatementAmount}>
                      {formatRon(debt.amount)}
                    </Text>
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Individual Roommate Net Balances Breakdown */}
        {Object.keys(netBalances).length > 0 && (
          <View style={styles.netBalancesOverviewContainer}>
            <Text style={styles.overviewHeader}>Individual Net Balances:</Text>
            <View style={styles.netBalanceChipsRow}>
              {Object.entries(netBalances).map(([roommate, net]) => {
                const isPositive = net > 0.009;
                const isNegative = net < -0.009;

                return (
                  <View
                    key={roommate}
                    style={[
                      styles.netBalanceChip,
                      isPositive && styles.netBalanceChipPositive,
                      isNegative && styles.netBalanceChipNegative,
                    ]}
                  >
                    <Text style={styles.netBalanceChipName}>{roommate}:</Text>
                    <Text
                      style={[
                        styles.netBalanceChipAmount,
                        isPositive && styles.netBalanceChipAmountPositive,
                        isNegative && styles.netBalanceChipAmountNegative,
                      ]}
                    >
                      {isPositive ? `+${formatRon(net)}` : isNegative ? `-${formatRon(Math.abs(net))}` : '0 RON'}
                    </Text>
                    <Text style={styles.netBalanceChipStatus}>
                      {isPositive ? '(gets back)' : isNegative ? '(owes)' : '(settled)'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Total Group Expenses Stat */}
        <View style={styles.summaryFooterRow}>
          <Text style={styles.summaryFooterText}>
            Total Shared Spending:{' '}
            <Text style={styles.summaryFooterBold}>{formatRon(totalSpent)}</Text>
          </Text>
          <Text style={styles.summaryFooterText}>
            Expenses Logged:{' '}
            <Text style={styles.summaryFooterBold}>{expenses.length}</Text>
          </Text>
        </View>
      </View>

      {/* Header for the Bottom FlatList Section */}
      <View style={styles.expenseHistorySectionHeader}>
        <View style={styles.historyTitleRow}>
          <Text style={styles.sectionHeaderTitle}>Expense History</Text>
          <View style={styles.historyCountBadge}>
            <Text style={styles.historyCountBadgeText}>{expenses.length}</Text>
          </View>
        </View>
        <Text style={styles.sectionHeaderSubtitle}>
          List of all recorded purchases and equal splits
        </Text>
      </View>
    </View>
  );

  // Empty list placeholder
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>💳</Text>
      <Text style={styles.emptyTitle}>No Expenses Recorded</Text>
      <Text style={styles.emptySubtitle}>
        Tap "+ Add" above or click "Reset Data" to load the shared expenses scenario.
      </Text>
      <TouchableOpacity
        style={styles.emptyResetButton}
        onPress={handleResetToDummy}
        activeOpacity={0.7}
      >
        <Text style={styles.emptyResetButtonText}>Load Test Scenario</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Toast Banner */}
      {toastMessage && (
        <View style={styles.toastBanner}>
          <Text style={styles.toastIcon}>💬</Text>
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity
            onPress={() => setToastMessage(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.toastDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* =========================================================================
          BOTTOM SECTION: FLATLIST OF EXPENSE HISTORY
          With the Balances Summary card rendered as ListHeaderComponent.
          ========================================================================= */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Expense Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={handleCloseModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Add New Expense</Text>
                <Text style={styles.modalSubtitle}>
                  Split cost equally among chosen roommates
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleCloseModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {formError ? (
                <View style={styles.formErrorBanner}>
                  <Text style={styles.formErrorText}>⚠️ {formError}</Text>
                </View>
              ) : null}

              {/* Title input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Expense Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Weekly Groceries, Cleaning Supplies, WiFi"
                  placeholderTextColor="#999"
                  value={title}
                  onChangeText={(val) => {
                    setTitle(val);
                    setFormError('');
                  }}
                />
              </View>

              {/* Total Amount input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Total Amount (RON) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 50"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  value={amountInput}
                  onChangeText={(val) => {
                    setAmountInput(val);
                    setFormError('');
                  }}
                />
              </View>

              {/* Payer Selector - Tapping predefined buttons only */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Who Paid? *</Text>
                <Text style={styles.formHelperText}>
                  Tap to select the paying roommate:
                </Text>
                <View style={styles.optionsWrap}>
                  {knownRoommates.map((person) => {
                    const isSelected = payer === person;
                    return (
                      <TouchableOpacity
                        key={person}
                        style={[
                          styles.selectableChip,
                          isSelected && styles.selectableChipActive,
                        ]}
                        onPress={() => {
                          setPayer(person);
                          setFormError('');
                        }}
                      >
                        <Text
                          style={[
                            styles.selectableChipText,
                            isSelected && styles.selectableChipTextActive,
                          ]}
                        >
                          {person}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Participants Selector (Split With) - Tapping predefined buttons only */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Split Between (Participants) *
                </Text>
                <Text style={styles.formHelperText}>
                  Tap to include or exclude roommates in the split:
                </Text>
                <View style={styles.optionsWrap}>
                  {knownRoommates.map((person) => {
                    const isIncluded = selectedParticipants.includes(person);
                    return (
                      <TouchableOpacity
                        key={person}
                        style={[
                          styles.selectableChip,
                          isIncluded && styles.selectableChipActive,
                        ]}
                        onPress={() => handleToggleParticipant(person)}
                      >
                        <Text
                          style={[
                            styles.selectableChipText,
                            isIncluded && styles.selectableChipTextActive,
                          ]}
                        >
                          {isIncluded ? `✓ ${person}` : `+ ${person}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Date Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  value={date}
                  onChangeText={setDate}
                />
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitModalButton}
                  onPress={handleSaveExpense}
                >
                  <Text style={styles.submitModalButtonText}>Save Expense</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  listContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Toast Notification
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  toastIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  toastDismiss: {
    color: '#94A3B8',
    fontSize: 14,
    paddingLeft: 8,
  },

  // Top Title Bar - Responsive with flexWrap & gap
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    minWidth: 140,
    marginRight: 6,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  resetButton: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addButtonIcon: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 3,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Balances Summary Card (Top Section)
  balancesSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryCardIcon: {
    fontSize: 22,
  },
  summaryCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  settlementBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  settlementBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },

  // Netted Debts Section
  nettedDebtsSection: {
    gap: 10,
    marginBottom: 14,
  },
  nettedDebtRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  debtFlowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  debtorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 6,
  },
  debtorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  flowArrowContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  owesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flowArrow: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: 'bold',
  },
  creditorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 6,
  },
  creditorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  debtStatementContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  debtStatementText: {
    fontSize: 14,
    color: '#334155',
  },
  debtStatementBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  debtStatementAmount: {
    fontWeight: '800',
    color: '#2563EB',
  },

  // Settled state inside summary
  settledContainer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  settledEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  settledTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
  },
  settledSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Roommate Individual Net Balances
  netBalancesOverviewContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  overviewHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  netBalanceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  netBalanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 4,
  },
  netBalanceChipPositive: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  netBalanceChipNegative: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  netBalanceChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  netBalanceChipAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  netBalanceChipAmountPositive: {
    color: '#16A34A',
  },
  netBalanceChipAmountNegative: {
    color: '#DC2626',
  },
  netBalanceChipStatus: {
    fontSize: 10,
    color: '#64748B',
  },

  // Summary Footer Row
  summaryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  summaryFooterText: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryFooterBold: {
    fontWeight: '700',
    color: '#0F172A',
  },

  // Bottom Section: Expense History Section Header
  expenseHistorySectionHeader: {
    marginBottom: 10,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  historyCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Bottom Section: Expense Card
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  expenseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  expenseTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  expenseDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expenseDateIcon: {
    fontSize: 11,
  },
  expenseDateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  deleteExpenseButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteExpenseButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  expenseDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  payerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerAvatarText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  payerSubLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  payerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  amountContainer: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  totalAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  splitBreakdownContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  splitLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  splitPerPersonShare: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  participantsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  participantChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  participantChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyResetButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyResetButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  modalScrollView: {
    marginBottom: 8,
  },
  formErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  formErrorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formHelperText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectableChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectableChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  selectableChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  selectableChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitModalButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  submitModalButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
