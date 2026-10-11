import type {
  AuthResponse,
  LoginData,
  RegisterData,
  User,
} from "../types/auth";

import type {
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  PaginatedExpenses,
} from "../types/expense";

import type {
  Category,
  CategoryCreate,
  CategoryUpdate,
} from "../types/category";

import type {
  Budget,
  BudgetCreate,
  BudgetSummary,
  BudgetUpdate,
} from "../types/budget";

import type { AdminInsights } from "../types/admin";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Could not connect to the Retain API. Check that the backend is running.",
    );
  }

  if (response.status === 204) {
    if (!response.ok) {
      throw new Error("The request could not be completed.");
    }

    return undefined as T;
  }

  const responseText = await response.text();
  let data: unknown;

  if (responseText) {
    try {
      data = JSON.parse(responseText) as unknown;
    } catch {
      if (!response.ok) {
        throw new Error("The server returned an unexpected error.");
      }

      throw new Error("The server returned an invalid response.");
    }
  }

  if (!response.ok) {
    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data
    ) {
      const detail = data.detail;

      if (typeof detail === "string") {
        throw new Error(detail);
      }

      if (Array.isArray(detail)) {
        throw new Error(
          detail
            .map((item: unknown) => {
              if (
                typeof item === "object" &&
                item !== null &&
                "msg" in item &&
                typeof item.msg === "string"
              ) {
                return item.msg;
              }

              return "Invalid request data.";
            })
            .join(" "),
        );
      }
    }

    throw new Error("Something went wrong. Please try again.");
  }

  return data as T;
}

export function registerUser(
  data: RegisterData,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function loginUser(
  data: LoginData,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCurrentUser(token: string): Promise<User> {
  return apiRequest<User>("/api/auth/me", {}, token);
}

// Expenses

export function getExpenses(
  token: string,
  page = 1,
  pageSize = 10,
): Promise<PaginatedExpenses> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return apiRequest<PaginatedExpenses>(
    `/api/expenses?${params.toString()}`,
    {},
    token,
  );
}

export function getExpense(
  token: string,
  expenseId: number,
): Promise<Expense> {
  return apiRequest<Expense>(
    `/api/expenses/${expenseId}`,
    {},
    token,
  );
}

export function createExpense(
  token: string,
  data: ExpenseCreate,
): Promise<Expense> {
  return apiRequest<Expense>(
    "/api/expenses",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token,
  );
}

export function updateExpense(
  token: string,
  expenseId: number,
  data: ExpenseUpdate,
): Promise<Expense> {
  return apiRequest<Expense>(
    `/api/expenses/${expenseId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token,
  );
}

export function deleteExpense(
  token: string,
  expenseId: number,
): Promise<void> {
  return apiRequest<void>(
    `/api/expenses/${expenseId}`,
    { method: "DELETE" },
    token,
  );
}

// Categories

export function getCategories(token: string): Promise<Category[]> {
  return apiRequest<Category[]>("/api/categories", {}, token);
}

export function createCategory(
  token: string,
  data: CategoryCreate,
): Promise<Category> {
  return apiRequest<Category>(
    "/api/categories",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token,
  );
}

export function updateCategory(
  token: string,
  categoryId: number,
  data: CategoryUpdate,
): Promise<Category> {
  return apiRequest<Category>(
    `/api/categories/${categoryId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token,
  );
}

export function deleteCategory(
  token: string,
  categoryId: number,
): Promise<void> {
  return apiRequest<void>(
    `/api/categories/${categoryId}`,
    { method: "DELETE" },
    token,
  );
}

// Budgets

export function getBudgets(token: string): Promise<Budget[]> {
  return apiRequest<Budget[]>("/api/budgets", {}, token);
}

export function createBudget(
  token: string,
  data: BudgetCreate,
): Promise<Budget> {
  return apiRequest<Budget>(
    "/api/budgets",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token,
  );
}

export function updateBudget(
  token: string,
  budgetId: number,
  data: BudgetUpdate,
): Promise<Budget> {
  return apiRequest<Budget>(
    `/api/budgets/${budgetId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token,
  );
}

export function deleteBudget(
  token: string,
  budgetId: number,
): Promise<void> {
  return apiRequest<void>(
    `/api/budgets/${budgetId}`,
    { method: "DELETE" },
    token,
  );
}

export function getBudgetSummary(
  token: string,
  month: number,
  year: number,
): Promise<BudgetSummary> {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
  });

  return apiRequest<BudgetSummary>(
    `/api/budgets/summary?${params.toString()}`,
    {},
    token,
  );
}


export function getAdminInsights(token: string): Promise<AdminInsights> {
  return apiRequest<AdminInsights>("/api/admin/insights", {}, token);
}
