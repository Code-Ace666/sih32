const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "FARMER" | "CENTRE_OPERATOR" | "ADMIN";
  farmer_profile?: {
    farmer_registration_id: string;
    state: string;
    district: string;
    block: string;
    village: string;
    address: string;
    preferred_language: string;
  };
}

export const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("procurement_token");
  }
  return null;
};

export const setAuthToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("procurement_token", token);
  }
};

export const clearAuthToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("procurement_token");
    localStorage.removeItem("procurement_user");
  }
};

export const getCurrentUserLocal = (): User | null => {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("procurement_user");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
};

export const setCurrentUserLocal = (user: User) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("procurement_user", JSON.stringify(user));
  }
};

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errMessage = "Something went wrong";
    try {
      const parsed = JSON.parse(errorText);
      errMessage = parsed.detail || errMessage;
    } catch {
      errMessage = errorText || errMessage;
    }
    throw new Error(errMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (payload: any) => {
    const res = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setAuthToken(res.access_token);
    
    // Fetch profile context
    const user = await apiRequest("/api/auth/me");
    setCurrentUserLocal(user);
    return { token: res.access_token, user };
  },
  
  register: async (payload: any) => {
    return apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getMe: async () => {
    const user = await apiRequest("/api/auth/me");
    setCurrentUserLocal(user);
    return user;
  },

  // Centres & Slots
  getCentres: async (district?: string, block?: string) => {
    let url = "/api/centres";
    const params = new URLSearchParams();
    if (district) params.append("district", district);
    if (block) params.append("block", block);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    return apiRequest(url);
  },

  getCentreSlots: async (centreId: string, date: string) => {
    return apiRequest(`/api/centres/${centreId}/slots?date=${date}`);
  },

  // Bookings
  createBooking: async (payload: any) => {
    return apiRequest("/api/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getMyBookings: async () => {
    return apiRequest("/api/bookings/my");
  },

  cancelBooking: async (id: string) => {
    return apiRequest(`/api/bookings/${id}`, {
      method: "DELETE",
    });
  },

  checkInBooking: async (id: string) => {
    return apiRequest(`/api/bookings/${id}/check-in`, {
      method: "POST",
    });
  },

  getLiveQueue: async (bookingId: string) => {
    return apiRequest(`/api/bookings/live/${bookingId}`);
  },

  // Operator
  getOperatorStats: async (centreId: string) => {
    return apiRequest(`/api/operator/dashboard-stats?centre_id=${centreId}`);
  },

  getOperatorBookings: async (centreId: string, status?: string) => {
    let url = `/api/operator/bookings?centre_id=${centreId}`;
    if (status) url += `&status_filter=${status}`;
    return apiRequest(url);
  },

  callNext: async (centreId: string) => {
    return apiRequest(`/api/operator/queue/call-next?centre_id=${centreId}`, {
      method: "POST",
    });
  },

  operatorCheckIn: async (bookingId: string) => {
    return apiRequest(`/api/operator/bookings/${bookingId}/check-in`, {
      method: "POST",
    });
  },

  startProcurement: async (bookingId: string) => {
    return apiRequest(`/api/operator/bookings/${bookingId}/start`, {
      method: "POST",
    });
  },

  completeProcurement: async (bookingId: string, payload: any) => {
    return apiRequest(`/api/operator/bookings/${bookingId}/complete`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  markMissed: async (bookingId: string) => {
    return apiRequest(`/api/operator/bookings/${bookingId}/miss`, {
      method: "POST",
    });
  },

  // Admin
  getAdminStats: async () => {
    return apiRequest("/api/admin/dashboard");
  },

  getAdminAnalytics: async () => {
    return apiRequest("/api/admin/analytics");
  },

  reseedDatabase: async () => {
    return apiRequest("/api/admin/reseed", {
      method: "POST",
    });
  },

  // Payments
  getPayments: async () => {
    return apiRequest("/api/payments");
  },

  processPayment: async (paymentId: string) => {
    return apiRequest(`/api/payments/${paymentId}/process`, {
      method: "POST",
    });
  },

  settlePayment: async (paymentId: string) => {
    return apiRequest(`/api/payments/${paymentId}/settle`, {
      method: "POST",
    });
  },

  // Notifications
  getNotifications: async () => {
    return apiRequest("/api/notifications");
  },

  markNotificationRead: async (notifId: string) => {
    return apiRequest(`/api/notifications/${notifId}/read`, {
      method: "POST",
    });
  },

  // WebSocket URL Generator
  getWebSocketUrl: (centreId: string) => {
    const wsBase = BASE_URL.replace(/^http/, "ws");
    return `${wsBase}/api/ws/queue/${centreId}`;
  }
};
