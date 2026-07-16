export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

class ApiClient {
  private get baseUrl() {
    return import.meta.env.VITE_API_URL || "http://localhost:5000";
  }

  private get token() {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lifeos_jwt");
    }
    return null;
  }

  private setToken(token: string | null) {
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("lifeos_jwt", token);
      } else {
        localStorage.removeItem("lifeos_jwt");
      }
    }
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }
    headers.set("Content-Type", "application/json");

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (res.status === 401) {
      this.setToken(null);
      if (typeof window !== "undefined" && window.location.pathname !== "/auth") {
        window.location.href = "/auth";
      }
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      let message = "An error occurred";
      try {
        const errorData = await res.json();
        message = errorData.message || message;
      } catch {}
      throw new Error(message);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  // Auth Operations
  auth = {
    getUser: async (): Promise<User | null> => {
      if (!this.token) return null;
      try {
        return await this.get<User>("/api/auth/me");
      } catch {
        return null;
      }
    },
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const data = await this.post<AuthResponse>("/api/auth/login", { email, password });
      this.setToken(data.token);
      this.auth.notifyAuthStateChange("SIGNED_IN");
      return data;
    },
    register: async (email: string, password: string): Promise<AuthResponse> => {
      const data = await this.post<AuthResponse>("/api/auth/register", { email, password });
      this.setToken(data.token);
      this.auth.notifyAuthStateChange("SIGNED_IN");
      return data;
    },
    signOut: async (): Promise<void> => {
      this.setToken(null);
      this.auth.notifyAuthStateChange("SIGNED_OUT");
    },
    setSessionToken: (token: string) => {
      this.setToken(token);
      this.auth.notifyAuthStateChange("SIGNED_IN");
    },
    onAuthStateChange: (callback: (event: "SIGNED_IN" | "SIGNED_OUT") => void) => {
      const handleStorage = (e: StorageEvent) => {
        if (e.key === "lifeos_jwt") {
          callback(e.newValue ? "SIGNED_IN" : "SIGNED_OUT");
        }
      };
      if (typeof window !== "undefined") {
        window.addEventListener("storage", handleStorage);
        // Also listen to standard custom event for single-tab state change
        window.addEventListener("lifeos_auth_change", ((e: CustomEvent) => {
          callback(e.detail);
        }) as EventListener);
      }
      return {
        subscription: {
          unsubscribe: () => {
            if (typeof window !== "undefined") {
              window.removeEventListener("storage", handleStorage);
            }
          },
        },
      };
    },
    notifyAuthStateChange: (event: "SIGNED_IN" | "SIGNED_OUT") => {
      if (typeof window !== "undefined") {
        const key = "lifeos_jwt";
        const val = localStorage.getItem(key);
        window.dispatchEvent(new StorageEvent("storage", { key, newValue: val }));
        window.dispatchEvent(new CustomEvent("lifeos_auth_change", { detail: event }));
      }
    }
  };
}

export const apiClient = new ApiClient();
