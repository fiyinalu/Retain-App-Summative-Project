import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import {
  getBudgetSummary,
  getCategories,
  getExpenses,
} from "../services/api";
import type { BudgetSummary } from "../types/budget";
import type { Category } from "../types/category";
import type { Expense } from "../types/expense";

interface CategorySpending {
  id: number;
  name: string;
  amount: number;
}

function formatAmount(amount: number | string): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  const monthLabel = now.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [categoryResults, firstPage] = await Promise.all([
          getCategories(token!),
          getExpenses(token!, 1, 100),
        ]);

        let allExpenses = [...firstPage.items];

        for (let page = 2; page <= firstPage.total_pages; page += 1) {
          const result = await getExpenses(token!, page, 100);
          allExpenses = allExpenses.concat(result.items);
        }

        let budgetResult: BudgetSummary | null = null;

        try {
          budgetResult = await getBudgetSummary(
            token!,
            currentMonth,
            currentYear,
          );
        } catch (budgetError) {
          const message =
            budgetError instanceof Error ? budgetError.message : "";

          if (!message.toLowerCase().includes("no budget exists")) {
            throw budgetError;
          }
        }

        if (cancelled) return;

        setCategories(categoryResults);
        setExpenses(allExpenses);
        setBudget(budgetResult);
      } catch (loadError) {
        if (cancelled) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your dashboard.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [token, currentMonth, currentYear]);

  const monthlyExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(monthKey)),
    [expenses, monthKey],
  );

  const monthlySpent = monthlyExpenses.reduce(
    (total, expense) => total + Number(expense.amount),
    0,
  );

  const highestExpense = expenses.reduce<Expense | null>(
    (highest, expense) =>
      highest === null || Number(expense.amount) > Number(highest.amount)
        ? expense
        : highest,
    null,
  );

  const recentExpenses = [...expenses]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.id - a.id,
    )
    .slice(0, 5);

  const categorySpending: CategorySpending[] = useMemo(() => {
    const totals = new Map<number, number>();

    for (const expense of monthlyExpenses) {
      totals.set(
        expense.category_id,
        (totals.get(expense.category_id) ?? 0) + Number(expense.amount),
      );
    }

    return [...totals.entries()]
      .map(([id, amount]) => ({
        id,
        name:
          categories.find((category) => category.id === id)?.name ??
          "Uncategorized",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthlyExpenses, categories]);

  const displayedCategories = categorySpending.slice(0, 5);
  const highestCategoryAmount = displayedCategories.reduce(
    (highest, category) => Math.max(highest, category.amount),
    0,
  );

  function handleLogout(): void {
    logout();
    navigate("/login");
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">RETAIN · PERSONAL FINANCES</p>
          <h1>Good day, {user?.name?.split(" ")[0] ?? "there"}.</h1>
          <p className="dashboard-muted">
            Here's an overview of your finances for {monthLabel}.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <Link className="dashboard-primary-link" to="/expenses">
            + Add or manage expenses
          </Link>
          <button
            type="button"
            className="dashboard-signout"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <div className="dashboard-error" role="alert">
          {error}
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading" role="status">
          Loading your financial overview...
        </div>
      ) : (
        <>
          <section className="dashboard-metrics" aria-label="Financial summary">
            <article className="dashboard-metric-card">
              <p className="dashboard-metric-label">Spent this month</p>
              <h2>{formatAmount(monthlySpent)}</h2>
              <p className="dashboard-muted">
                {monthlyExpenses.length} expense
                {monthlyExpenses.length === 1 ? "" : "s"} this month
              </p>
            </article>

            <article className="dashboard-metric-card">
              <p className="dashboard-metric-label">Budget remaining</p>
              <h2>
                {budget
                  ? formatAmount(budget.remaining)
                  : "Not set"}
              </h2>
              <p className="dashboard-muted">
                {budget
                  ? budget.is_over_budget
                    ? "You are over your monthly budget"
                    : `${budget.percentage_used.toFixed(1)}% of budget used`
                  : "Create a monthly budget to track your limit"}
              </p>
            </article>

            <article className="dashboard-metric-card">
              <p className="dashboard-metric-label">Monthly budget</p>
              <h2>
                {budget ? formatAmount(budget.budget_amount) : "—"}
              </h2>
              <p className="dashboard-muted">{monthLabel}</p>
            </article>

            <article className="dashboard-metric-card">
              <p className="dashboard-metric-label">Highest individual expense</p>
              <h2>
                {highestExpense
                  ? formatAmount(highestExpense.amount)
                  : "0.00"}
              </h2>
              <p className="dashboard-muted dashboard-truncate">
                {highestExpense?.title ?? "No expenses recorded yet"}
              </p>
            </article>
          </section>

          {budget && (
            <section className="dashboard-budget-panel">
              <div className="dashboard-budget-heading">
                <div>
                  <h2>Monthly budget progress</h2>
                  <p className="dashboard-muted">
                    {formatAmount(monthlySpent)} spent of{" "}
                    {formatAmount(budget.budget_amount)}
                  </p>
                </div>
                <strong>
                  {budget.percentage_used.toFixed(1)}%
                </strong>
              </div>

              <div
                className="dashboard-progress-track"
                role="progressbar"
                aria-label="Monthly budget used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(
                  100,
                  Math.max(0, budget.percentage_used),
                )}
              >
                <div
                  className={`dashboard-progress-fill ${
                    budget.is_over_budget ? "is-over-budget" : ""
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, budget.percentage_used),
                    )}%`,
                  }}
                />
              </div>

              <p className="dashboard-muted">
                {budget.is_over_budget
                  ? `You have exceeded your budget by ${formatAmount(
                      Math.abs(budget.remaining),
                    )}.`
                  : `You have ${formatAmount(
                      budget.remaining,
                    )} remaining this month.`}
              </p>
            </section>
          )}

          <div className="dashboard-content-grid">
            <section className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Spending by category</h2>
                  <p className="dashboard-muted">For {monthLabel}</p>
                </div>
                <Link to="/expenses">View expenses</Link>
              </div>

              {displayedCategories.length === 0 ? (
                <div className="dashboard-empty">
                  <p>No category spending to show this month.</p>
                  <Link to="/expenses">Record an expense</Link>
                </div>
              ) : (
                <div className="dashboard-category-list">
                  {displayedCategories.map((category) => (
                    <div className="dashboard-category-item" key={category.id}>
                      <div className="dashboard-category-heading">
                        <span>{category.name}</span>
                        <strong>{formatAmount(category.amount)}</strong>
                      </div>
                      <div className="dashboard-category-track">
                        <div
                          className="dashboard-category-fill"
                          style={{
                            width: `${
                              highestCategoryAmount > 0
                                ? (category.amount / highestCategoryAmount) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Recent expenses</h2>
                  <p className="dashboard-muted">Your latest recorded spending</p>
                </div>
                <Link to="/expenses">View all</Link>
              </div>

              {recentExpenses.length === 0 ? (
                <div className="dashboard-empty">
                  <p>You haven't recorded any expenses yet.</p>
                  <Link to="/expenses">Add your first expense</Link>
                </div>
              ) : (
                <div className="dashboard-recent-list">
                  {recentExpenses.map((expense) => {
                    const category = categories.find(
                      (item) => item.id === expense.category_id,
                    );

                    return (
                      <div className="dashboard-recent-item" key={expense.id}>
                        <div className="dashboard-recent-icon" aria-hidden="true">
                          {category?.name.charAt(0).toUpperCase() ?? "E"}
                        </div>
                        <div className="dashboard-recent-description">
                          <strong>{expense.title}</strong>
                          <span>
                            {category?.name ?? "Uncategorized"} ·{" "}
                            {formatDate(expense.date)}
                          </span>
                        </div>
                        <strong className="dashboard-recent-amount">
                          {formatAmount(expense.amount)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <footer className="dashboard-footer">
            Signed in as {user?.email}
          </footer>
        </>
      )}
    </main>
  );
}
