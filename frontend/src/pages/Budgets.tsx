import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  createBudget,
  deleteBudget,
  getBudgetSummary,
  getBudgets,
  updateBudget,
} from "../services/api";
import type { Budget, BudgetSummary } from "../types/budget";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatAmount(value: number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatus(summary: BudgetSummary) {
  if (summary.is_over_budget || summary.percentage_used >= 100) {
    return { label: "Over budget", className: "budget-status-over" };
  }
  if (summary.percentage_used >= 80) {
    return { label: "Approaching budget", className: "budget-status-warning" };
  }
  return { label: "Within budget", className: "budget-status-ok" };
}

export function Budgets() {
  const { token } = useAuth();
  const now = new Date();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState("");
  const [amountForKey, setAmountForKey] = useState("");
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedBudget = useMemo(
    () => budgets.find((budget) => budget.month === month && budget.year === year),
    [budgets, month, year],
  );
  const selectedBudgetKey = selectedBudget?.id ?? `${year}-${month}`;
  const displayedAmount = amountForKey === String(selectedBudgetKey)
    ? amount
    : selectedBudget ? String(selectedBudget.amount) : "";

  const loadBudgets = useCallback(async () => {
    if (!token) {
      setBudgets([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [budgetList, budgetSummary] = await Promise.all([
        getBudgets(token),
        getBudgetSummary(token, month, year).catch(() => null),
      ]);
      setBudgets(budgetList);
      setSummary(budgetSummary);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load budgets.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, month, year, setBudgets]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBudgets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBudgets]);


  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const numericAmount = Number(displayedAmount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a budget amount greater than zero.");
      return;
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setError("Enter a valid year between 2000 and 2100.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (selectedBudget) {
        await updateBudget(token, selectedBudget.id, {
          amount: numericAmount,
        });
        setMessage(`Budget for ${MONTHS[month - 1]} ${year} updated.`);
      } else {
        await createBudget(token, {
          month,
          year,
          amount: numericAmount,
        });
        setMessage(`Budget for ${MONTHS[month - 1]} ${year} created.`);
      }

      setAmountForKey(String(selectedBudgetKey));
      setAmount(String(numericAmount));
      await loadBudgets();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this budget.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(budget: Budget) {
    if (!token) return;

    const confirmed = window.confirm(
      `Delete the budget for ${MONTHS[budget.month - 1]} ${budget.year}? Your expenses will not be deleted.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteBudget(token, budget.id);
      setMessage(
        `Budget for ${MONTHS[budget.month - 1]} ${budget.year} deleted.`,
      );
      await loadBudgets();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this budget.",
      );
    }
  }

  const status = summary ? getStatus(summary) : null;
  const progress = summary
    ? Math.min(Math.max(summary.percentage_used, 0), 100)
    : 0;

  return (
    <main className="budgets-page">
      <header className="budgets-header">
        <div>
          <p className="page-eyebrow">Retain · Personal Finances</p>
          <h1>Monthly budgets</h1>
          <p>Set a spending limit and keep track of how much you have left.</p>
        </div>

        <nav className="page-navigation" aria-label="Main navigation">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/expenses">Expenses</Link>
          <Link to="/budgets" aria-current="page">Budgets</Link>
        </nav>
      </header>

      {error && (
        <p className="page-alert page-alert-error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="page-alert page-alert-success" role="status">
          {message}
        </p>
      )}

      <section className="budget-editor panel">
        <div className="section-heading">
          <div>
            <h2>{selectedBudget ? "Update a budget" : "Set a monthly budget"}</h2>
            <p>Choose the month and year this spending limit applies to.</p>
          </div>
        </div>

        <form className="budget-form" onSubmit={handleSave}>
          <label>
            Month
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTHS.map((monthName, index) => (
                <option key={monthName} value={index + 1}>
                  {monthName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Year
            <input
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              required
            />
          </label>

          <label>
            Budget amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 500"
              value={displayedAmount}
              onChange={(event) => {
              setAmountForKey(String(selectedBudgetKey));
              setAmount(event.target.value);
            }}
              required
            />
          </label>

          <button
            type="submit"
            disabled={saving || !Number.isInteger(year) || year < 2000 || year > 2100}
          >
            {saving ? "Saving…" : selectedBudget ? "Update budget" : "Create budget"}
          </button>
        </form>
      </section>

      <section className="budget-summary panel">
        <div className="section-heading">
          <div>
            <h2>{MONTHS[month - 1]} {year} overview</h2>
            <p>Your spending compared with the selected monthly limit.</p>
          </div>
          {status && (
            <span className={`budget-status ${status.className}`}>
              {status.label}
            </span>
          )}
        </div>

        {loading ? (
          <p className="page-muted">Loading budget details…</p>
        ) : summary ? (
          <>
            <div className="budget-metrics">
              <article className="budget-metric">
                <span>Monthly budget</span>
                <strong>{formatAmount(summary.budget_amount)}</strong>
              </article>

              <article className="budget-metric">
                <span>Total spent</span>
                <strong>{formatAmount(summary.total_spent)}</strong>
              </article>

              <article className="budget-metric">
                <span>
                  {summary.remaining < 0 ? "Amount over budget" : "Remaining"}
                </span>
                <strong>{formatAmount(Math.abs(summary.remaining))}</strong>
              </article>
            </div>

            <div className="budget-progress-label">
              <span>{formatAmount(summary.percentage_used)}% used</span>
              <span>100% of budget</span>
            </div>

            <div
              className="budget-progress-track"
              role="progressbar"
              aria-label="Monthly budget used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className={`budget-progress-fill ${status?.className ?? ""}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {summary.percentage_used >= 80 &&
              summary.percentage_used < 100 && (
                <p className="budget-tip">
                  You have used at least 80% of this month's budget.
                </p>
              )}

            {summary.percentage_used >= 100 && (
              <p className="budget-tip">
                Your spending has reached or exceeded this month's budget.
              </p>
            )}
          </>
        ) : (
          <div className="budget-empty-state">
            <h3>No budget set for this month yet</h3>
            <p>
              Create a budget above to see spending, remaining balance, and
              budget status here.
            </p>
          </div>
        )}
      </section>

      <section className="budget-list-section">
        <div className="section-heading">
          <div>
            <h2>Your budgets</h2>
            <p>Choose a budget to view or edit it.</p>
          </div>
          <span className="budget-count">
            {budgets.length} {budgets.length === 1 ? "budget" : "budgets"}
          </span>
        </div>

        {loading ? (
          <p className="page-muted">Loading budgets…</p>
        ) : budgets.length === 0 ? (
          <div className="budget-empty-state panel">
            <h3>No budgets created</h3>
            <p>Your saved monthly budgets will appear here.</p>
          </div>
        ) : (
          <div className="budget-list">
            {[...budgets]
              .sort((a, b) => b.year - a.year || b.month - a.month)
              .map((budget) => (
                <article className="budget-list-item panel" key={budget.id}>
                  <button
                    type="button"
                    className="budget-list-select"
                    onClick={() => {
                      setMonth(budget.month);
                      setYear(budget.year);
                    }}
                  >
                    <span className="budget-list-period">
                      {MONTHS[budget.month - 1]} {budget.year}
                    </span>
                    <span className="budget-list-amount">
                      {formatAmount(budget.amount)}
                    </span>
                    <span className="budget-list-hint">
                      {budget.month === month && budget.year === year
                        ? "Currently selected"
                        : "View this budget"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      setMonth(budget.month);
                      setYear(budget.year);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => void handleDelete(budget)}
                  >
                    Delete
                  </button>
                </article>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}
