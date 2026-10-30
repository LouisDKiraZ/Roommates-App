/**
 * Core Expense data model for the Payment Sharing module.
 */
export interface Expense {
  id: string;
  title: string;
  payer: string;
  totalAmount: number;
  date: string;
  participants: string[];
}

/**
 * Representation of a simplified, netted debt between two roommates.
 */
export interface NettedDebt {
  from: string; // Debtor (who owes money)
  to: string; // Creditor (who is owed money)
  amount: number; // Net amount in RON
}

/**
 * Detailed breakdown of an individual roommate's balance.
 */
export interface RoommateBalance {
  name: string;
  paid: number;
  share: number;
  net: number; // Positive = gets back money, Negative = owes money
}

export type NewExpenseInput = Omit<Expense, 'id'>;

/**
 * Round a number to two decimal places to prevent floating-point inaccuracy.
 */
export function roundToTwoDecimals(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Format an amount in RON. Integers are displayed without decimals (e.g. "5 RON"),
 * while fractional values display up to 2 decimal places (e.g. "5.50 RON").
 */
export function formatRon(amount: number): string {
  const rounded = roundToTwoDecimals(amount);
  if (Number.isInteger(rounded)) {
    return `${rounded} RON`;
  }
  return `${rounded.toFixed(2)} RON`;
}

/**
 * Computes the net balance for each individual based on all expenses.
 * Net balance = (total amount paid by person) - (total fair share owed by person).
 *
 * @param expenses List of recorded expenses
 * @returns Record mapping roommate name to their net balance (+ means owed, - means owes)
 */
export function calculateNetBalances(expenses: Expense[]): Record<string, number> {
  const balances: Record<string, number> = {};

  for (const exp of expenses) {
    const { payer, totalAmount, participants } = exp;
    if (!payer || typeof totalAmount !== 'number' || totalAmount <= 0) continue;

    const trimmedPayer = payer.trim();
    if (!trimmedPayer) continue;

    // Ensure payer has a balance entry
    if (balances[trimmedPayer] === undefined) {
      balances[trimmedPayer] = 0;
    }

    const effectiveParticipants =
      participants && participants.length > 0
        ? participants.map((p) => p.trim()).filter(Boolean)
        : [trimmedPayer];

    if (effectiveParticipants.length === 0) continue;

    const splitShare = totalAmount / effectiveParticipants.length;

    // Payer is credited the full total amount they covered
    balances[trimmedPayer] += totalAmount;

    // Each participant is debited their equal split share
    for (const participant of effectiveParticipants) {
      if (balances[participant] === undefined) {
        balances[participant] = 0;
      }
      balances[participant] -= splitShare;
    }
  }

  // Round balances to 2 decimal places to eliminate floating point noise
  for (const person of Object.keys(balances)) {
    balances[person] = roundToTwoDecimals(balances[person]);
  }

  return balances;
}

/**
 * Debt Simplification Algorithm (Net Balance Settling).
 *
 * Computes net balances for all participants and greedily matches the greatest
 * debtors to the greatest creditors to resolve all debts in the minimum number
 * of transactions.
 *
 * Guarantees:
 * 1. Mutual debts between any two people are strictly eliminated (never shows mutual debt).
 * 2. In the canonical 2-person scenario:
 *    Person A pays 50 RON for A and B (B owes 25)
 *    Person B pays 40 RON for A and B (A owes 20)
 *    -> Result: ONLY "B owes A 5 RON".
 *
 * @param balancesOrExpenses Map of net balances OR list of Expense items
 * @returns List of simplified netted debts { from, to, amount }
 */
export function simplifyDebts(
  balancesOrExpenses: Record<string, number> | Expense[]
): NettedDebt[] {
  const balances = Array.isArray(balancesOrExpenses)
    ? calculateNetBalances(balancesOrExpenses)
    : balancesOrExpenses;

  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  for (const [name, net] of Object.entries(balances)) {
    const roundedNet = roundToTwoDecimals(net);
    if (roundedNet < -0.01) {
      // Debtor: owes money
      debtors.push({ name, amount: -roundedNet });
    } else if (roundedNet > 0.01) {
      // Creditor: is owed money
      creditors.push({ name, amount: roundedNet });
    }
  }

  // Sort descending by magnitude to minimize total number of transactions
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts: NettedDebt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settled = Math.min(debtor.amount, creditor.amount);
    const roundedSettled = roundToTwoDecimals(settled);

    if (roundedSettled > 0.01) {
      debts.push({
        from: debtor.name,
        to: creditor.name,
        amount: roundedSettled,
      });
    }

    debtor.amount = roundToTwoDecimals(debtor.amount - settled);
    creditor.amount = roundToTwoDecimals(creditor.amount - settled);

    if (debtor.amount <= 0.01) dIdx++;
    if (creditor.amount <= 0.01) cIdx++;
  }

  return debts;
}

/**
 * Calculates pairwise netted debts directly between pairs of individuals.
 * Ensures that between any two people (A and B), debts are netted so only
 * the difference is displayed in a single direction.
 */
export function calculatePairwiseDebts(expenses: Expense[]): NettedDebt[] {
  const ledger: Record<string, number> = {};
  const people = new Set<string>();

  for (const exp of expenses) {
    const { payer, totalAmount, participants } = exp;
    if (!payer || typeof totalAmount !== 'number' || totalAmount <= 0) continue;

    const trimmedPayer = payer.trim();
    if (!trimmedPayer) continue;
    people.add(trimmedPayer);

    const parts =
      participants && participants.length > 0
        ? participants.map((p) => p.trim()).filter(Boolean)
        : [trimmedPayer];

    const share = totalAmount / parts.length;

    for (const participant of parts) {
      people.add(participant);
      if (participant === trimmedPayer) continue;
      const key = `${participant}:${trimmedPayer}`;
      ledger[key] = (ledger[key] || 0) + share;
    }
  }

  const personList = Array.from(people).sort();
  const nettedDebts: NettedDebt[] = [];

  for (let i = 0; i < personList.length; i++) {
    for (let j = i + 1; j < personList.length; j++) {
      const p1 = personList[i];
      const p2 = personList[j];

      const p1OwesP2 = ledger[`${p1}:${p2}`] || 0;
      const p2OwesP1 = ledger[`${p2}:${p1}`] || 0;
      const diff = roundToTwoDecimals(p1OwesP2 - p2OwesP1);

      if (diff > 0.01) {
        nettedDebts.push({ from: p1, to: p2, amount: diff });
      } else if (diff < -0.01) {
        nettedDebts.push({ from: p2, to: p1, amount: -diff });
      }
    }
  }

  return nettedDebts;
}

/**
 * Primary debt netting function: nets mutual obligations and simplifies debts.
 */
export const calculateNettedDebts = simplifyDebts;
