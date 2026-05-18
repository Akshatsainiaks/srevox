export const getToken    = () => typeof window !== "undefined" ? localStorage.getItem("sv_token") : null;
export const setToken    = (t: string) => localStorage.setItem("sv_token", t);
export const removeToken = () => {
  localStorage.removeItem("sv_token");
  localStorage.removeItem("lz_user");
  if (typeof window !== "undefined") {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.backgroundColor = "#f8fafc";
  }
};
export const isAuthenticated = () => !!getToken();

export interface AuthUser {
  id: string; email: string; full_name: string; role: string; org_id?: string;
}

export const getUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const u = localStorage.getItem("lz_user");
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};

export const setUser = (u: AuthUser) => {
  localStorage.setItem("lz_user", JSON.stringify(u));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sv_user_updated", { detail: u }));
  }
};

// FIX 1: Use same BASE as api.ts so fetch hits port 4000, not 3000
const BASE = "";

export const refreshUser = async (): Promise<AuthUser | null> => {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE}/api/auth/me`, {  // FIX 1: was "/api/auth/me"
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) removeToken();
      return null;
    }
    const data = await res.json();
    const user: AuthUser = {
      id:        data.id,
      email:     data.email,
      full_name: data.full_name,
      role:      data.role,
      org_id:    data.org_id,
    };
    setUser(user); // always fires sv_user_updated → Navbar re-renders
    return user;
  } catch {
    return null;
  }
};

export const startRoleSync = (intervalMs = 15_000): (() => void) => {
  if (typeof window === "undefined") return () => {};
  refreshUser(); // FIX 2: fire immediately on mount, don't wait for first interval
  const id = window.setInterval(() => {
    if (!getToken()) return;
    refreshUser();
  }, intervalMs);
  return () => window.clearInterval(id);
};