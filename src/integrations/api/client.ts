export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  position: number;
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  durationSeconds: number;
  addedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  category: string;
  title: string;
  body: string;
  icon?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
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

  // Playlists Operations
  playlists = {
    getAll: async (): Promise<Playlist[]> => {
      const data = await this.get<any[]>("/api/playlists");
      return data.map((p) => ({
        id: p.id,
        userId: p.userId ?? p.user_id,
        name: p.name,
        itemCount: p.itemCount ?? p.item_count ?? 0,
        createdAt: p.createdAt ?? p.created_at,
        updatedAt: p.updatedAt ?? p.updated_at,
      }));
    },
    create: async (name: string): Promise<Playlist> => {
      const p = await this.post<any>("/api/playlists", { name });
      return {
        id: p.id,
        userId: p.userId ?? p.user_id,
        name: p.name,
        itemCount: p.itemCount ?? p.item_count ?? 0,
        createdAt: p.createdAt ?? p.created_at,
        updatedAt: p.updatedAt ?? p.updated_at,
      };
    },
    rename: async (id: string, name: string): Promise<Playlist> => {
      const p = await this.patch<any>(`/api/playlists/${id}`, { name });
      return {
        id: p.id,
        userId: p.userId ?? p.user_id,
        name: p.name,
        itemCount: p.itemCount ?? p.item_count ?? 0,
        createdAt: p.createdAt ?? p.created_at,
        updatedAt: p.updatedAt ?? p.updated_at,
      };
    },
    delete: (id: string): Promise<void> => {
      return this.delete<void>(`/api/playlists/${id}`);
    },
    getItems: async (id: string): Promise<PlaylistItem[]> => {
      const data = await this.get<any[]>(`/api/playlists/${id}/items`);
      return data.map((item) => ({
        id: item.id,
        playlistId: item.playlistId ?? item.playlist_id,
        position: item.position,
        videoId: item.videoId ?? item.video_id,
        title: item.title,
        thumbnail: item.thumbnail,
        channelName: item.channelName ?? item.channel_name,
        durationSeconds: item.durationSeconds ?? item.duration_seconds ?? 0,
        addedAt: item.addedAt ?? item.added_at,
      }));
    },
    addItem: async (
      id: string,
      item: {
        videoId: string;
        title: string;
        thumbnail: string;
        channelName: string;
        durationSeconds: number;
      }
    ): Promise<PlaylistItem> => {
      // Backend uses SnakeCaseLower JSON — send snake_case keys & normalize response
      const itemData = await this.post<any>(`/api/playlists/${id}/items`, {
        video_id: item.videoId,
        title: item.title,
        thumbnail: item.thumbnail,
        channel_name: item.channelName,
        duration_seconds: item.durationSeconds,
      });
      return {
        id: itemData.id,
        playlistId: itemData.playlistId ?? itemData.playlist_id,
        position: itemData.position,
        videoId: itemData.videoId ?? itemData.video_id,
        title: itemData.title,
        thumbnail: itemData.thumbnail,
        channelName: itemData.channelName ?? itemData.channel_name,
        durationSeconds: itemData.durationSeconds ?? itemData.duration_seconds ?? 0,
        addedAt: itemData.addedAt ?? itemData.added_at,
      };
    },
    removeItem: (id: string, itemId: string): Promise<void> => {
      return this.delete<void>(`/api/playlists/${id}/items/${itemId}`);
    },
    reorderItems: (id: string, items: { id: string; position: number }[]): Promise<void> => {
      return this.patch<void>(`/api/playlists/${id}/items/reorder`, { items });
    },
  };

  // Notifications Operations
  notifications = {
    getAll: (): Promise<AppNotification[]> =>
      this.get<AppNotification[]>("/api/notifications"),

    create: (n: {
      category: string;
      title: string;
      body: string;
      icon?: string;
      link?: string;
    }): Promise<AppNotification> =>
      this.post<AppNotification>("/api/notifications", n),

    markRead: (id: string, isRead = true): Promise<AppNotification> =>
      this.patch<AppNotification>(`/api/notifications/${id}/read`, { isRead }),

    markAllRead: (): Promise<void> =>
      this.patch<void>("/api/notifications/read-all"),

    delete: (id: string): Promise<void> =>
      this.delete<void>(`/api/notifications/${id}`),

    deleteAll: (): Promise<void> =>
      this.delete<void>("/api/notifications"),
  };

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
