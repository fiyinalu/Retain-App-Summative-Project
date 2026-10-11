import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { useAuth } from "../context/useAuth";
import {
  createExpense,
  deleteExpense,
  getCategories,
  getExpenses,
  updateExpense,
} from "../services/api";
import type { Category } from "../types/category";
import type { ExpenseCreate } from "../types/expense";
import {
  addExpense,
  clearExpenses,
  removeExpense,
  resetExpenseFilters,
  setExpenseError,
  setExpenseFilters,
  setExpenseLoading,
  setExpensePage,
  setExpenses,
  replaceExpense,
} from "../store/expenseSlice";
import { selectFilteredExpenses } from "../store/expenseSelectors";
import type { AppDispatch, RootState } from "../store";

function localDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface ExpenseForm {
  title: string;
  description: string;
  amount: string;
  category_id: string;
  date: string;
  payment_method: string;
  notes: string;
}

const emptyForm = (): ExpenseForm => ({
  title: "",
  description: "",
  amount: "",
  category_id: "",
  date: localDate(),
  payment_method: "Cash",
  notes: "",
});

export function Expenses() {
  const dispatch = useDispatch<AppDispatch>();
  const { token } = useAuth();

  const expenses = useSelector(selectFilteredExpenses);
  const filters = useSelector((state: RootState) => state.expenses.filters);
  const page = useSelector((state: RootState) => state.expenses.page);
  const pageSize = useSelector((state: RootState) => state.expenses.pageSize);
  const status = useSelector((state: RootState) => state.expenses.status);
  const error = useSelector((state: RootState) => state.expenses.error);

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) {
      dispatch(clearExpenses());
      return;
    }

    let cancelled = false;

    async function loadData() {
      dispatch(setExpenseLoading());
      setFormError("");

      try {
        const categoryResults = await getCategories(token!);

        // Load every API page so filters apply across the full collection.
        const firstPage = await getExpenses(token!, 1, 100);
        let allExpenses = [...firstPage.items];

        for (let nextPage = 2; nextPage <= firstPage.total_pages; nextPage += 1) {
          const result = await getExpenses(token!, nextPage, 100);
          allExpenses = allExpenses.concat(result.items);
        }

        if (cancelled) return;

        setCategories(categoryResults);

        dispatch(
          setExpenses({
            items: allExpenses,
            page: 1,
            pageSize: 10,
            total: allExpenses.length,
            totalPages: Math.max(1, Math.ceil(allExpenses.length / 10)),
          }),
        );
      } catch (loadError) {
        if (cancelled) return;

        dispatch(
          setExpenseError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load expenses.",
          ),
        );
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [token, dispatch]);

  const totalPages = Math.max(1, Math.ceil(expenses.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const visibleExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return expenses.slice(start, start + pageSize);
  }, [expenses, currentPage, pageSize]);

  function updateForm<K extends keyof ExpenseForm>(
    key: K,
    value: ExpenseForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEditing(expense: (typeof expenses)[number]) {
    setEditingId(expense.id);
    setForm({
      title: expense.title,
      description: expense.description ?? "",
      amount: String(expense.amount),
      category_id: String(expense.category_id),
      date: expense.date,
      payment_method: expense.payment_method,
      notes: expense.notes ?? "",
    });
    setFormError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setFormError("Your session has expired. Please sign in again.");
      return;
    }

    if (!form.category_id) {
      setFormError("Please select a category.");
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    const payload: ExpenseCreate = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      amount,
      category_id: Number(form.category_id),
      date: form.date,
      payment_method: form.payment_method,
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      if (editingId !== null) {
        const updated = await updateExpense(token, editingId, payload);
        dispatch(replaceExpense(updated));
        setNotice("Expense updated successfully.");
      } else {
        const created = await createExpense(token, payload);
        dispatch(addExpense(created));
        setNotice("Expense added successfully.");
      }

      setEditingId(null);
      setForm(emptyForm());
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save this expense.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;

    if (!window.confirm("Delete this expense? This cannot be undone.")) {
      return;
    }

    setNotice("");
    setFormError("");

    try {
      await deleteExpense(token, id);
      dispatch(removeExpense(id));

      if (editingId === id) {
        cancelEditing();
      }

      setNotice("Expense deleted successfully.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this expense.",
      );
    }
  }

  const currency = (value: number | string) =>
    new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));

  return (
    <main className="expenses-page">
      <header className="expenses-header">
        <div>
          <p className="eyebrow">RETAIN · PERSONAL FINANCES</p>
          <h1>Expenses</h1>
          <p className="muted">Record, review, and manage your spending.</p>
        </div>

        <nav className="page-navigation" aria-label="Main navigation">
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </header>

      <section className="expense-form-card">
        <h2>{editingId === null ? "Add an expense" : "Edit expense"}</h2>

        <form onSubmit={handleSubmit} className="expense-form">
          <label>
            Title
            <input
              required
              minLength={1}
              maxLength={150}
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              placeholder="e.g. Lunch"
            />
          </label>

          <label>
            Amount
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => updateForm("amount", event.target.value)}
              placeholder="0.00"
            />
          </label>

          <label>
            Category
            <select
              required
              value={form.category_id}
              onChange={(event) =>
                updateForm("category_id", event.target.value)
              }
            >
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) => updateForm("date", event.target.value)}
            />
          </label>

          <label>
            Payment method
            <select
              required
              value={form.payment_method}
              onChange={(event) =>
                updateForm("payment_method", event.target.value)
              }
            >
              <option>Cash</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>Mobile Money</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            Description
            <input
              value={form.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
              placeholder="Optional details"
            />
          </label>

          <label className="full-width">
            Notes
            <textarea
              rows={2}
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Additional notes (optional)"
            />
          </label>

          {formError && (
            <p className="form-message error-message" role="alert">
              {formError}
            </p>
          )}

          <div className="form-actions full-width">
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId === null
                  ? "Add expense"
                  : "Save changes"}
            </button>

            {editingId !== null && (
              <button type="button" className="secondary-button" onClick={cancelEditing}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      {notice && (
        <p className="form-message success-message" role="status">
          {notice}
        </p>
      )}

      <section className="expense-list-section">
        <div className="section-heading">
          <div>
            <h2>Your expenses</h2>
            <p className="muted">
              {expenses.length} matching expense{expenses.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              dispatch(resetExpenseFilters());
              setNotice("");
            }}
          >
            Clear filters
          </button>
        </div>

        <div className="expense-filters">
          <label>
            Search
            <input
              value={filters.search}
              onChange={(event) =>
                dispatch(setExpenseFilters({ search: event.target.value }))
              }
              placeholder="Search expenses..."
            />
          </label>

          <label>
            Category
            <select
              value={filters.categoryId}
              onChange={(event) =>
                dispatch(setExpenseFilters({ categoryId: event.target.value }))
              }
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Payment method
            <select
              value={filters.paymentMethod}
              onChange={(event) =>
                dispatch(
                  setExpenseFilters({ paymentMethod: event.target.value }),
                )
              }
            >
              <option value="">All methods</option>
              <option>Cash</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>Mobile Money</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            From date
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) =>
                dispatch(setExpenseFilters({ startDate: event.target.value }))
              }
            />
          </label>

          <label>
            To date
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) =>
                dispatch(setExpenseFilters({ endDate: event.target.value }))
              }
            />
          </label>

          <label>
            Minimum amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.minAmount}
              onChange={(event) =>
                dispatch(setExpenseFilters({ minAmount: event.target.value }))
              }
            />
          </label>

          <label>
            Maximum amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.maxAmount}
              onChange={(event) =>
                dispatch(setExpenseFilters({ maxAmount: event.target.value }))
              }
            />
          </label>

          <label>
            Sort by
            <select
              value={filters.sortBy}
              onChange={(event) =>
                dispatch(
                  setExpenseFilters({
                    sortBy: event.target.value as "date" | "amount",
                  }),
                )
              }
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
            </select>
          </label>

          <label>
            Direction
            <select
              value={filters.sortDirection}
              onChange={(event) =>
                dispatch(
                  setExpenseFilters({
                    sortDirection: event.target.value as "asc" | "desc",
                  }),
                )
              }
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>

        {status === "loading" && <p>Loading expenses...</p>}

        {status === "failed" && (
          <p className="form-message error-message" role="alert">
            {error ?? "Could not load expenses."}
          </p>
        )}

        {status === "succeeded" && visibleExpenses.length === 0 && (
          <div className="empty-state">
            <h3>No expenses found</h3>
            <p>Try changing your filters or add your first expense above.</p>
          </div>
        )}

        {status === "succeeded" && visibleExpenses.length > 0 && (
          <>
            <div className="expense-table-wrapper">
              <table className="expense-table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Payment</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>
                        <strong>{expense.title}</strong>
                        {expense.description && (
                          <small>{expense.description}</small>
                        )}
                      </td>
                      <td>
                        {categories.find(
                          (category) => category.id === expense.category_id,
                        )?.name ?? "Uncategorized"}
                      </td>
                      <td>{expense.date}</td>
                      <td>{expense.payment_method}</td>
                      <td className="amount-cell">{currency(expense.amount)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="secondary-button small-button"
                            onClick={() => startEditing(expense)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger-button small-button"
                            onClick={() => void handleDelete(expense.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                type="button"
                className="secondary-button"
                disabled={currentPage <= 1}
                onClick={() => dispatch(setExpensePage(currentPage - 1))}
              >
                Previous
              </button>

              <span>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="secondary-button"
                disabled={currentPage >= totalPages}
                onClick={() => dispatch(setExpensePage(currentPage + 1))}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
