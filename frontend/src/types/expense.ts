export interface Expense {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  category_id: number;
  date: string;
  payment_method: string;
  notes: string | null;
}

export interface ExpenseCreate {
  title: string;
  description?: string | null;
  amount: number;
  category_id: number;
  date: string;
  payment_method: string;
  notes?: string | null;
}

export type ExpenseUpdate = Partial<ExpenseCreate>;

export interface PaginatedExpenses {
  items: Expense[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export type ExpenseSortField = "date" | "amount";

export type SortDirection = "asc" | "desc";

export interface ExpenseFilters {
  search: string;
  categoryId: string;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  sortBy: ExpenseSortField;
  sortDirection: SortDirection;
}
