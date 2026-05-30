import axios from "axios";

const BASE = "";

export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("sv_token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("sv_token");
      localStorage.removeItem("lz_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const apiLogin  = (email: string, password: string) =>
  api.post("/api/auth/login",
    new URLSearchParams({ username: email, password }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  ).then(r => r.data);

export const apiSignup  = (data: { email: string; password: string; full_name?: string; org_name?: string }) =>
  api.post("/api/auth/signup", data).then(r => r.data);

export const apiLogout  = () => api.post("/api/auth/logout").then(r => r.data);
export const apiGetMe   = () => api.get("/api/auth/me").then(r => r.data);
export const apiUpdateMe = (data: object) => api.patch("/api/auth/me", data).then(r => r.data);

// ── Incidents ─────────────────────────────────────────────────────────────────
export const fetchIncidents      = (params?: Record<string, string>) =>
  api.get("/api/incidents", { params }).then(r => r.data);
export const fetchIncident       = (id: string) =>
  api.get(`/api/incidents/${id}`).then(r => r.data);
export const fetchIncidentStats  = (params?: Record<string, string>) =>
  api.get("/api/incidents/stats/summary", { params }).then(r => r.data);
export const fetchTrends         = () =>
  api.get("/api/incidents/trends/daily").then(r => r.data);
export const acknowledgeIncident = (id: string) =>
  api.patch(`/api/incidents/${id}/acknowledge`).then(r => r.data);
export const resolveIncident     = (id: string) =>
  api.patch(`/api/incidents/${id}/resolve`).then(r => r.data);
export const diagnoseIncident    = (id: string) =>
  api.post(`/api/incidents/${id}/diagnose`).then(r => r.data);
export const deleteIncident      = (id: string) =>
  api.delete(`/api/incidents/${id}`).then(r => r.data);
export const bulkAcknowledgeIncidents = (ids: string[]) =>
  api.post("/api/incidents/bulk-acknowledge", { ids }).then(r => r.data);
export const bulkResolveIncidents = (ids: string[]) =>
  api.post("/api/incidents/bulk-resolve", { ids }).then(r => r.data);
export const bulkDeleteIncidents = (ids: string[]) =>
  api.post("/api/incidents/bulk-delete", { ids }).then(r => r.data);

// ── Clusters ──────────────────────────────────────────────────────────────────
export const fetchClusters  = () => api.get("/api/clusters").then(r => r.data);
export const fetchCluster   = (id: string) => api.get(`/api/clusters/${id}`).then(r => r.data);
export const createCluster  = (data: object) => api.post("/api/clusters", data).then(r => r.data);
export const updateCluster  = (id: string, data: object) => api.patch(`/api/clusters/${id}`, data).then(r => r.data);
export const deleteCluster  = (id: string) => api.delete(`/api/clusters/${id}`).then(r => r.data);

// ── Channels ──────────────────────────────────────────────────────────────────
export const fetchChannels  = () => api.get("/api/channels").then(r => r.data);
export const fetchChannel   = (id: string) => api.get(`/api/channels/${id}`).then(r => r.data);
export const createChannel  = (data: object) => api.post("/api/channels", data).then(r => r.data);
export const toggleChannel  = (id: string) => api.patch(`/api/channels/${id}/toggle`).then(r => r.data);
export const testChannel    = (id: string) => api.post(`/api/channels/${id}/test`).then(r => r.data);
export const updateChannel  = (id: string, data: object) => api.patch(`/api/channels/${id}`, data).then(r => r.data);
export const deleteChannel  = (id: string) => api.delete(`/api/channels/${id}`).then(r => r.data);

// ── Alert Rules ───────────────────────────────────────────────────────────────
export const fetchRules  = () => api.get("/api/alert-rules").then(r => r.data);
export const createRule  = (data: object) => api.post("/api/alert-rules", data).then(r => r.data);
export const updateRule  = (id: string, data: object) => api.patch(`/api/alert-rules/${id}`, data).then(r => r.data);
export const toggleRule  = (id: string) => api.patch(`/api/alert-rules/${id}/toggle`).then(r => r.data);
export const deleteRule  = (id: string) => api.delete(`/api/alert-rules/${id}`).then(r => r.data);

// ── Users / Team ──────────────────────────────────────────────────────────────
export const fetchUsers        = () => api.get("/api/users").then(r => r.data);
export const inviteUser        = (data: { email: string; role: string }) =>
  api.post("/api/users/invite", data).then(r => r.data);
export const changeUserRole    = (id: string, role: string) =>
  api.patch(`/api/users/${id}/role`, { role }).then(r => r.data);
export const removeUser        = (id: string) =>
  api.delete(`/api/users/${id}`).then(r => r.data);
export const fetchInvitations  = () =>
  api.get("/api/users/invitations").then(r => r.data);
export const cancelInvitation  = (id: string) =>
  api.delete(`/api/users/invitations/${id}`).then(r => r.data);
export const acceptInvite      = (data: { token: string; password: string; full_name?: string }) =>
  api.post("/api/users/accept-invite", data).then(r => r.data);

// ── Service Owners ────────────────────────────────────────────────────────────
export const fetchServiceOwners  = () => api.get("/api/service-owners").then(r => r.data);
export const createServiceOwner  = (data: object) => api.post("/api/service-owners", data).then(r => r.data);
export const deleteServiceOwner  = (id: string) => api.delete(`/api/service-owners/${id}`).then(r => r.data);
export const resolveServiceOwner = (params: { cluster_id: string; namespace: string; pod_name: string }) =>
  api.get("/api/service-owners/resolve", { params }).then(r => r.data);