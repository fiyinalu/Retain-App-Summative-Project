import {
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import type {
  Expense,
  ExpenseFilters,
} from "../types/expense";

interface ExpenseState {
  items: Expense[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  filters: ExpenseFilters;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialFilters: ExpenseFilters = {
  search: "",
  categoryId: "",
  paymentMethod: "",
  startDate: "",
  endDate: "",
  minAmount: "",
  maxAmount: "",
  sortBy: "date",
  sortDirection: "desc",
};

const initialState: ExpenseState = {
  items: [],
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
  filters: initialFilters,
  status: "idle",
  error: null,
};

const expenseSlice = createSlice({
  name: "expenses",
  initialState,
  reducers: {
    setExpenses(
      state,
      action: PayloadAction<{
        items: Expense[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      }>,
    ) {
      state.items = action.payload.items;
      state.page = action.payload.page;
      state.pageSize = action.payload.pageSize;
      state.total = action.payload.total;
      state.totalPages = action.payload.totalPages;
      state.status = "succeeded";
      state.error = null;
    },

    addExpense(state, action: PayloadAction<Expense>) {
      state.items.unshift(action.payload);
      state.total += 1;
      state.status = "succeeded";
    },

    replaceExpense(state, action: PayloadAction<Expense>) {
      const index = state.items.findIndex(
        (expense) => expense.id === action.payload.id,
      );

      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },

    removeExpense(state, action: PayloadAction<number>) {
      const previousLength = state.items.length;

      state.items = state.items.filter(
        (expense) => expense.id !== action.payload,
      );

      if (state.items.length < previousLength) {
        state.total = Math.max(0, state.total - 1);
      }
    },

    setExpenseFilters(
      state,
      action: PayloadAction<Partial<ExpenseFilters>>,
    ) {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
      state.page = 1;
    },

    resetExpenseFilters(state) {
      state.filters = { ...initialFilters };
      state.page = 1;
    },

    setExpensePage(state, action: PayloadAction<number>) {
      state.page = Math.max(1, action.payload);
    },

    setExpensePageSize(state, action: PayloadAction<number>) {
      state.pageSize = Math.max(1, action.payload);
      state.page = 1;
    },

    setExpenseLoading(state) {
      state.status = "loading";
      state.error = null;
    },

    setExpenseError(state, action: PayloadAction<string>) {
      state.status = "failed";
      state.error = action.payload;
    },

    clearExpenses(state) {
      state.items = [];
      state.page = 1;
      state.total = 0;
      state.totalPages = 0;
      state.status = "idle";
      state.error = null;
    },
  },
});

export const {
  setExpenses,
  addExpense,
  replaceExpense,
  removeExpense,
  setExpenseFilters,
  resetExpenseFilters,
  setExpensePage,
  setExpensePageSize,
  setExpenseLoading,
  setExpenseError,
  clearExpenses,
} = expenseSlice.actions;

export default expenseSlice.reducer;
