import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./index";

export const selectAllExpenses = (state: RootState) =>
  state.expenses.items;

export const selectExpenseFilters = (state: RootState) =>
  state.expenses.filters;

export const selectFilteredExpenses = createSelector(
  [selectAllExpenses, selectExpenseFilters],
  (expenses, filters) => {
    const search = filters.search.trim().toLowerCase();

    const filtered = expenses.filter((expense) => {
      const matchesSearch =
        search === "" ||
        [
          expense.title,
          expense.description ?? "",
          expense.notes ?? "",
          expense.payment_method,
        ].some((value) => value.toLowerCase().includes(search));

      const matchesCategory =
        filters.categoryId === "" ||
        String(expense.category_id) === filters.categoryId;

      const matchesPayment =
        filters.paymentMethod === "" ||
        expense.payment_method === filters.paymentMethod;

      const matchesStartDate =
        filters.startDate === "" ||
        expense.date >= filters.startDate;

      const matchesEndDate =
        filters.endDate === "" ||
        expense.date <= filters.endDate;

      const amount = Number(expense.amount);

      const matchesMinAmount =
        filters.minAmount === "" ||
        amount >= Number(filters.minAmount);

      const matchesMaxAmount =
        filters.maxAmount === "" ||
        amount <= Number(filters.maxAmount);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPayment &&
        matchesStartDate &&
        matchesEndDate &&
        matchesMinAmount &&
        matchesMaxAmount
      );
    });

    return filtered.sort((a, b) => {
      const comparison = filters.sortBy === "amount"
        ? Number(a.amount) - Number(b.amount)
        : a.date.localeCompare(b.date);
      const finalComparison = comparison === 0
        ? b.id - a.id
        : comparison;

      return filters.sortDirection === "asc"
        ? finalComparison
        : -finalComparison;
    });
  },
);
