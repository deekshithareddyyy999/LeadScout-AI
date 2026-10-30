// Budgets are stored in whole rupees. Shared by the Client (posting) and Seeker (browsing) workspaces.

export type BudgetType = "project" | "daily" | "monthly";

export const BUDGET_TYPE_LABELS: Record<BudgetType, { label: string; detail: string; per: string }> = {
  project: { label: "Whole project", detail: "One price for the job", per: "for the project" },
  daily: { label: "Per day", detail: "A day rate", per: "per day" },
  monthly: { label: "Per month", detail: "A monthly retainer", per: "per month" },
};

export const inr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export interface Budget {
  budgetType: BudgetType;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetOpen: boolean;
}

/** e.g. "₹20,000–₹30,000 for the project", "Up to ₹2,000 per day", "Open to quotes · per month". */
export function formatBudget({ budgetType, budgetMin, budgetMax, budgetOpen }: Budget): string {
  const per = BUDGET_TYPE_LABELS[budgetType].per;
  let range: string | null = null;
  if (budgetMin !== null && budgetMax !== null) range = budgetMin === budgetMax ? inr(budgetMin) : `${inr(budgetMin)}–${inr(budgetMax)}`;
  else if (budgetMax !== null) range = `Up to ${inr(budgetMax)}`;
  else if (budgetMin !== null) range = `From ${inr(budgetMin)}`;
  if (!range) return budgetOpen ? `Open to quotes · ${per}` : "Budget not stated";
  return `${range} ${per}${budgetOpen ? " · open to quotes" : ""}`;
}
