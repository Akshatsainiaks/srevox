export const getToken    = () => typeof window !== "undefined" ? localStorage.getItem("lz_token")  : null;
export const setToken    = (t: string) => localStorage.setItem("lz_token", t);
export const removeToken = () => {
  localStorage.removeItem("lz_token");
  localStorage.removeItem("lz_user");
  // Always go back to light when logging out
  if (typeof window !== "undefined") {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.backgroundColor = "#f8fafc";
  }
};
export const isAuthenticated = () => !!getToken();

export interface AuthUser {
  id: string; email: string; full_name: string; role: string;
}
export const getUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const u = localStorage.getItem("lz_user");
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};
export const setUser = (u: AuthUser) => localStorage.setItem("lz_user", JSON.stringify(u));