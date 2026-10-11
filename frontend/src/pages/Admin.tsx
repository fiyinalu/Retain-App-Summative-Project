import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  createCategory,
  deleteCategory,
  getAdminInsights,
  getCategories,
  updateCategory,
} from "../services/api";
import type { AdminCategorySpending, AdminInsights } from "../types/admin";
import type { Category } from "../types/category";

function amount(value: number | string): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function dateLabel(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function CategoryRanking({
  title,
  items,
}: {
  title: string;
  items: AdminCategorySpending[];
}) {
  return (
    <section className="admin-panel">
      <div className="admin-section-heading">
        <h2>{title}</h2>
        <span>{items.length} categories</span>
      </div>
      {items.length === 0 ? (
        <p className="admin-empty">No category spending to show yet.</p>
      ) : (
        <div className="admin-ranking-list">
          {items.map((item, index) => (
            <div className="admin-ranking-row" key={item.category_id}>
              <span className="admin-ranking-number">{index + 1}</span>
              <div className="admin-ranking-main">
                <strong>{item.category_name}</strong>
                <span>{item.expense_count} expense{item.expense_count === 1 ? "" : "s"}</span>
              </div>
              <strong>{amount(item.total_spent)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function Admin() {
  const { user, token } = useAuth();
  const [insights, setInsights] = useState<AdminInsights | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [result, categoryList] = await Promise.all([
        getAdminInsights(token),
        getCategories(token),
      ]);
      setInsights(result);
      setCategories(categoryList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !categoryName.trim()) return;
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (editingId !== null) {
        await updateCategory(token, editingId, { name: categoryName.trim() });
        setNotice("Category updated successfully.");
      } else {
        await createCategory(token, { name: categoryName.trim() });
        setNotice("Category created successfully.");
      }
      setCategoryName("");
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the category.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(category: Category) {
    if (!token || category.is_default) return;
    if (!window.confirm(
      `Delete "${category.name}"? Expenses in this category will be reassigned to Uncategorized.`,
    )) return;

    setError("");
    setNotice("");
    try {
      await deleteCategory(token, category.id);
      if (editingId === category.id) {
        setEditingId(null);
        setCategoryName("");
      }
      setNotice(`"${category.name}" was deleted. Its expenses, if any, were reassigned to Uncategorized.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the category.");
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">RETAIN · ADMINISTRATION</p>
          <h1>Admin dashboard</h1>
          <p className="admin-muted">Platform-wide spending insights and category management.</p>
          <p className="admin-muted">Signed in as {user?.name ?? "Administrator"}</p>
        </div>
        <nav className="admin-nav" aria-label="Main navigation">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/expenses">Expenses</Link>
          <Link to="/budgets">Budgets</Link>
          <button type="button" onClick={() => void loadData()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh data"}
          </button>
        </nav>
      </header>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {notice && <div className="admin-alert admin-alert-success" role="status">{notice}</div>}

      {loading && !insights ? (
        <section className="admin-panel">Loading platform insights…</section>
      ) : insights ? (
        <>
          <section className="admin-metrics" aria-label="Platform overview">
            <article className="admin-metric-card">
              <span>Registered users</span>
              <strong>{insights.overview.total_users.toLocaleString()}</strong>
              <small>All accounts</small>
            </article>
            <article className="admin-metric-card">
              <span>Total expenses</span>
              <strong>{insights.overview.total_expenses.toLocaleString()}</strong>
              <small>Across all users</small>
            </article>
            <article className="admin-metric-card">
              <span>Total expense value</span>
              <strong>{amount(insights.overview.total_expense_value)}</strong>
              <small>All recorded expenses</small>
            </article>
            <article className="admin-metric-card">
              <span>Expenses this month</span>
              <strong>{insights.overview.current_month_expenses.toLocaleString()}</strong>
              <small>Based on expense date</small>
            </article>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <div>
                <h2>Spending by category</h2>
                <p className="admin-muted">Expense counts and total recorded spending.</p>
              </div>
            </div>
            {insights.category_spending.length === 0 ? (
              <p className="admin-empty">No categories available.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Category</th><th>Expenses</th><th>Total spent</th></tr></thead>
                  <tbody>
                    {insights.category_spending.map((item) => (
                      <tr key={item.category_id}>
                        <td>{item.category_name}</td>
                        <td>{item.expense_count}</td>
                        <td>{amount(item.total_spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="admin-two-column">
            <CategoryRanking title="Top 5 categories" items={insights.top_categories} />
            <CategoryRanking title="Bottom 5 categories" items={insights.bottom_categories} />
          </div>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <div>
                <h2>Category management</h2>
                <p className="admin-muted">Create, rename, or delete expense categories.</p>
              </div>
            </div>
            <form className="admin-category-form" onSubmit={submitCategory}>
              <label htmlFor="admin-category-name">Category name</label>
              <input
                id="admin-category-name"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="e.g. Transport"
                maxLength={100}
                required
              />
              <button type="submit" disabled={saving || !categoryName.trim()}>
                {saving ? "Saving…" : editingId === null ? "Add category" : "Save changes"}
              </button>
              {editingId !== null && (
                <button className="admin-button-secondary" type="button" onClick={() => {
                  setEditingId(null);
                  setCategoryName("");
                }}>Cancel</button>
              )}
            </form>
            <div className="admin-category-list">
              {categories.map((category) => (
                <div className="admin-category-row" key={category.id}>
                  <div>
                    <strong>{category.name}</strong>
                    {category.is_default && <span className="admin-default-tag">Default</span>}
                  </div>
                  <div className="admin-row-actions">
                    <button
                      className="admin-button-secondary"
                      type="button"
                      disabled={category.is_default}
                      onClick={() => {
                        setEditingId(category.id);
                        setCategoryName(category.name);
                        setError("");
                        setNotice("");
                      }}
                    >Edit</button>
                    <button
                      className="admin-button-danger"
                      type="button"
                      disabled={category.is_default}
                      onClick={() => void removeCategory(category)}
                    >Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="admin-help-text">
              Uncategorized is the default category and cannot be renamed or deleted.
              Deleting another category reassigns its expenses to Uncategorized.
            </p>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading"><h2>Recent expenses</h2><span>Latest 10 records</span></div>
            {insights.recent_expenses.length === 0 ? <p className="admin-empty">No expenses recorded yet.</p> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Expense</th><th>User</th><th>Category</th><th>Date</th><th>Amount</th></tr></thead>
                  <tbody>
                    {insights.recent_expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.title}</td>
                        <td><strong>{expense.user_name}</strong><small className="admin-cell-subtitle">{expense.user_email}</small></td>
                        <td>{expense.category_name}</td>
                        <td>{dateLabel(expense.date)}</td>
                        <td>{amount(expense.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading"><h2>Recent users</h2><span>Latest 10 accounts</span></div>
            {insights.recent_users.length === 0 ? <p className="admin-empty">No users registered yet.</p> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
                  <tbody>
                    {insights.recent_users.map((recentUser) => (
                      <tr key={recentUser.id}>
                        <td>{recentUser.name}</td>
                        <td>{recentUser.email}</td>
                        <td><span className="admin-role-tag">{recentUser.role}</span></td>
                        <td>{recentUser.is_active ? "Active" : "Inactive"}</td>
                        <td>{dateLabel(recentUser.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <p className="admin-footnote">Insights last generated: {dateLabel(insights.generated_at)}</p>
        </>
      ) : !error ? (
        <section className="admin-panel">No admin insights are available.</section>
      ) : null}
    </main>
  );
}
