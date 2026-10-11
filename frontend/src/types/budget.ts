export interface Budget {
  id: number;
  month: number;
  year: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetCreate {
  month: number;
  year: number;
  amount: number;
}

export interface BudgetUpdate {
  amount: number;
}

export interface BudgetSummary {
  month: number;
  year: number;
  budget_amount: number;
  total_spent: number;
  remaining: number;
  percentage_used: number;
  is_over_budget: boolean;
}
