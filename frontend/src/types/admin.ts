export interface AdminCategorySpending {
  category_id: number;
  category_name: string;
  expense_count: number;
  total_spent: number;
}

export interface AdminInsights {
  generated_at: string;
  overview: {
    total_users: number;
    total_expenses: number;
    total_expense_value: number;
    current_month_expenses: number;
  };
  category_spending: AdminCategorySpending[];
  top_categories: AdminCategorySpending[];
  bottom_categories: AdminCategorySpending[];
  recent_expenses: {
    id: number;
    title: string;
    amount: number;
    date: string;
    category_name: string;
    user_name: string;
    user_email: string;
    created_at: string | null;
  }[];
  recent_users: {
    id: number;
    name: string;
    email: string;
    role: "user" | "admin";
    is_active: boolean;
    created_at: string | null;
  }[];
}
