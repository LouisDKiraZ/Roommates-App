import { Expense } from '@/types/expense';

/**
 * Realistic multi-roommate dataset across 5 roommates:
 * 'Abdullah', 'Sam', 'Jordan', 'Taylor', and 'Louis'.
 *
 * Demonstrates complex debt simplification (net balance logic):
 * 1. Abdullah pays 150 RON for all 5 roommates (30 RON each)
 *    -> Abdullah: +120, others: -30 each
 * 2. Sam pays 90 RON for Sam, Jordan, Taylor (30 RON each)
 *    -> Sam: +60, Jordan: -30, Taylor: -30
 * 3. Louis pays 80 RON for Abdullah and Louis (40 RON each)
 *    -> Tests mutual debt netting with Abdullah (Louis paid Abdullah 40, Abdullah paid Louis 30)!
 * 4. Jordan pays 60 RON for Sam, Jordan, Louis (20 RON each)
 *    -> Jordan: +40, Sam: -20, Louis: -20
 * 5. Taylor pays 50 RON for Abdullah and Taylor (25 RON each)
 *    -> Taylor: +25, Abdullah: -25
 *
 * Final Net Balances:
 * - Abdullah: +55 RON (Creditor: gets back 55 RON)
 * - Sam:      +10 RON (Creditor: gets back 10 RON)
 * - Jordan:   -20 RON (Debtor: owes 20 RON)
 * - Taylor:   -35 RON (Debtor: owes 35 RON)
 * - Louis:    -10 RON (Debtor: owes 10 RON)
 *
 * Debt Simplification Result (reduces all cross debts to just 3 direct payments):
 * 1. Taylor owes Abdullah 35 RON
 * 2. Jordan owes Abdullah 20 RON
 * 3. Louis owes Sam 10 RON
 */
export const DUMMY_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    title: 'Monthly High-Speed Internet & Utilities',
    payer: 'Abdullah',
    totalAmount: 150,
    date: '2026-10-25',
    participants: ['Abdullah', 'Sam', 'Jordan', 'Taylor', 'Louis'],
  },
  {
    id: 'exp-2',
    title: 'Kitchen Deep-Clean Supplies & Paper Goods',
    payer: 'Sam',
    totalAmount: 90,
    date: '2026-10-26',
    participants: ['Sam', 'Jordan', 'Taylor'],
  },
  {
    id: 'exp-3',
    title: 'Weekend Pizza & Craft Drinks Night',
    payer: 'Louis',
    totalAmount: 80,
    date: '2026-10-28',
    participants: ['Abdullah', 'Louis'],
  },
  {
    id: 'exp-4',
    title: 'Living Room Coffee Table & Decor',
    payer: 'Jordan',
    totalAmount: 60,
    date: '2026-10-29',
    participants: ['Sam', 'Jordan', 'Louis'],
  },
  {
    id: 'exp-5',
    title: 'Supermarket Pantry Staples & Olive Oil',
    payer: 'Taylor',
    totalAmount: 50,
    date: '2026-10-30',
    participants: ['Abdullah', 'Taylor'],
  },
];
