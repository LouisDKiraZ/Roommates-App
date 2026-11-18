import type { Expense, Roommate } from "@/types";

export interface SimplifiedDebt {
  fromId: string;
  toId: string;
  amount: number;
}

export interface BalanceSummary {
  youOwe: number;
  youAreOwed: number;
  net: number;
}

/**
 * Adapts raw/mock expense templates to the actual dynamic roommates of the active apartment.
 * - Payer is distributed across roommates (or maps previous dummy IDs to actual roommates).
 * - Splits are evenly divided across all actual members of the apartment.
 */
export function adaptExpensesToRoommates(
  rawExpenses: Expense[],
  roommates: Roommate[],
  currentUserId: string
): Expense[] {
  if (roommates.length === 0) return [];

  return rawExpenses.map((expense, expIdx) => {
    // Determine payer among current roommates:
    // Alternate between currentUser and other roommates if multiple exist.
    let payerId: string;
    if (roommates.length === 1) {
      payerId = currentUserId;
    } else if (expIdx % 2 === 0 && roommates.length > 1) {
      const other = roommates.find((r) => r.id !== currentUserId);
      payerId = other ? other.id : currentUserId;
    } else {
      payerId = currentUserId;
    }

    // Split amount evenly among all members in the apartment
    const splitAmount = Math.round((expense.amount / roommates.length) * 100) / 100;

    const splits = roommates.map((r, rIdx) => {
      // The payer's own split is settled
      const isPayer = r.id === payerId;
      // Vary settled state believably for demo expenses
      const settled = isPayer ? true : (expIdx + rIdx) % 3 === 0;
      return {
        roommateId: r.id,
        amount: splitAmount,
        settled,
      };
    });

    return {
      ...expense,
      paidById: payerId,
      splits,
    };
  });
}

/**
 * Computes balance for the current user against all expenses,
 * optionally filtered to a specific roommate.
 */
export function computeBalance(
  expenses: Expense[],
  currentUserId: string,
  filterMemberId?: string | "all" | null
): BalanceSummary {
  let youOwe = 0;
  let youAreOwed = 0;

  for (const expense of expenses) {
    if (expense.paidById === currentUserId) {
      for (const split of expense.splits) {
        if (split.roommateId !== currentUserId && !split.settled) {
          if (!filterMemberId || filterMemberId === "all" || split.roommateId === filterMemberId) {
            youAreOwed += split.amount;
          }
        }
      }
    } else {
      if (!filterMemberId || filterMemberId === "all" || expense.paidById === filterMemberId) {
        const mine = expense.splits.find((s) => s.roommateId === currentUserId);
        if (mine && !mine.settled) {
          youOwe += mine.amount;
        }
      }
    }
  }

  const roundedOwe = Math.round(youOwe * 100) / 100;
  const roundedOwed = Math.round(youAreOwed * 100) / 100;

  return {
    youOwe: roundedOwe,
    youAreOwed: roundedOwed,
    net: Math.round((roundedOwed - roundedOwe) * 100) / 100,
  };
}

/**
 * Debt simplification algorithm.
 * Calculates net balances for all roommates from unsettled splits and finds
 * the minimal list of transactions to settle all debts.
 */
export function simplifyDebts(
  expenses: Expense[],
  roommates: Roommate[]
): SimplifiedDebt[] {
  if (roommates.length <= 1) return [];

  const netBalances: Record<string, number> = {};
  for (const r of roommates) {
    netBalances[r.id] = 0;
  }

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (!split.settled && split.roommateId !== expense.paidById) {
        if (netBalances[split.roommateId] !== undefined) {
          netBalances[split.roommateId] -= split.amount;
        }
        if (netBalances[expense.paidById] !== undefined) {
          netBalances[expense.paidById] += split.amount;
        }
      }
    }
  }

  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, net] of Object.entries(netBalances)) {
    const rounded = Math.round(net * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ id, amount: -rounded });
    } else if (rounded > 0.01) {
      creditors.push({ id, amount: rounded });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SimplifiedDebt[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const settleAmount = Math.min(debtors[d].amount, creditors[c].amount);
    const roundedSettle = Math.round(settleAmount * 100) / 100;

    if (roundedSettle > 0.01) {
      transactions.push({
        fromId: debtors[d].id,
        toId: creditors[c].id,
        amount: roundedSettle,
      });
    }

    debtors[d].amount -= settleAmount;
    creditors[c].amount -= settleAmount;

    if (debtors[d].amount < 0.01) d++;
    if (creditors[c].amount < 0.01) c++;
  }

  return transactions;
}

/**
 * Filters expenses by selected member ("all" or a roommate id).
 * An expense matches if the selected member is the payer OR in the splits.
 */
export function filterExpensesByRoommate(
  expenses: Expense[],
  selectedPersonId: string | "all"
): Expense[] {
  if (selectedPersonId === "all") return expenses;
  return expenses.filter(
    (e) => e.paidById === selectedPersonId || e.splits.some((s) => s.roommateId === selectedPersonId)
  );
}
