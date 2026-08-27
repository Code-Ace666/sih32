"use client";

import React, { useState, useEffect } from "react";
import { api, getCurrentUserLocal, clearAuthToken, User } from "../lib/api";
import { Shield, RefreshCw, UserCheck, ToggleLeft, ToggleRight, ArrowRight } from "lucide-react";

export default function DemoControlPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    // Poll local user state
    const checkUser = () => {
      const user = getCurrentUserLocal();
      setCurrentUser(user);
    };
    checkUser();
    const interval = setInterval(checkUser, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickLogin = async (username: string, role: string) => {
    setLoading(true);
    setStatusMsg(`Logging in as ${role}...`);
    try {
      clearAuthToken();
      let payload = { password: role === "FARMER" ? "Farmer@123" : role === "CENTRE_OPERATOR" ? "Operator@123" : "Admin@123" };
      if (role === "FARMER") {
        Object.assign(payload, { phone: username });
      } else {
        Object.assign(payload, { email: username });
      }

      await api.login(payload);
      setStatusMsg("Login successful!");
      
      // Redirect
      if (role === "FARMER") {
        window.location.href = "/farmer";
      } else if (role === "CENTRE_OPERATOR") {
        window.location.href = "/operator";
      } else {
        window.location.href = "/admin";
      }
    } catch (err: any) {
      setStatusMsg(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReseed = async () => {
    if (!confirm("Are you sure you want to reset and reseed the entire database? All current custom bookings will be cleared.")) {
      return;
    }
    setLoading(true);
    setStatusMsg("Reseeding database...");
    try {
      await api.reseedDatabase();
      setStatusMsg("Database seeded successfully!");
      // Clear token to log out and force reload home
      clearAuthToken();
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (err: any) {
      // In case we are not logged in as Admin, let's bypass check or alert
      setStatusMsg(`Reseed request: ${err.message}`);
      // Fallback: If unauthorized, try logging in as admin and re-trying
      try {
        setStatusMsg("Logging in as Admin to reseed...");
        await api.login({ email: "admin@demo.gov", password: "Admin@123" });
        await api.reseedDatabase();
        clearAuthToken();
        setStatusMsg("Database seeded successfully!");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } catch (retryErr: any) {
        setStatusMsg(`Reseed failed: ${retryErr.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 shadow-2xl rounded-lg overflow-hidden border border-slate-300 bg-white">
      {/* Header bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition"
      >
        <Shield size={16} />
        <span>SIH26032 DEMO CONTROL PANEL</span>
        <span className="ml-2 bg-rose-800 text-white text-xs px-2 py-0.5 rounded">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 w-80 text-xs text-slate-700 space-y-4">
          <div>
            <span className="font-semibold block text-slate-500 mb-1">CURRENT ACTIVE SESSION:</span>
            {currentUser ? (
              <div className="p-2 bg-slate-100 rounded flex items-center justify-between">
                <div>
                  <div className="font-bold">{currentUser.name}</div>
                  <div className="text-slate-500 text-[10px] uppercase font-semibold">{currentUser.role}</div>
                </div>
                <button
                  onClick={() => {
                    clearAuthToken();
                    window.location.href = "/";
                  }}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded font-semibold text-slate-800"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                No active session (Guest Mode)
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="font-semibold block text-slate-500">QUICK LOGIN ACCOUNTS:</span>
            
            <div className="space-y-1">
              <button
                disabled={loading}
                onClick={() => handleQuickLogin("9000000001", "FARMER")}
                className="w-full flex items-center justify-between p-2 text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-900 transition"
              >
                <span>🌾 Farmer 1: Rajesh Kumar</span>
                <ArrowRight size={12} />
              </button>
              <button
                disabled={loading}
                onClick={() => handleQuickLogin("9000000002", "FARMER")}
                className="w-full flex items-center justify-between p-2 text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-900 transition"
              >
                <span>🌾 Farmer 2: Amit Singh</span>
                <ArrowRight size={12} />
              </button>
              <button
                disabled={loading}
                onClick={() => handleQuickLogin("operator@demo.gov", "CENTRE_OPERATOR")}
                className="w-full flex items-center justify-between p-2 text-left bg-green-50 hover:bg-green-100 border border-green-200 rounded text-green-900 transition"
              >
                <span>⚙️ Centre Operator: Vinay</span>
                <ArrowRight size={12} />
              </button>
              <button
                disabled={loading}
                onClick={() => handleQuickLogin("admin@demo.gov", "ADMIN")}
                className="w-full flex items-center justify-between p-2 text-left bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded text-purple-900 transition"
              >
                <span>🛡️ Chief Admin Officer</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-2">
            <button
              disabled={loading}
              onClick={handleReseed}
              className="w-full flex items-center justify-center gap-2 p-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded transition"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={14} />
              RESET & RESEED DATABASE
            </button>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Resets all tables and populates fresh seed data (5 farmers, 2 operators, 1 admin, 3 centres, 15+ bookings, and 8 completed history records).
            </p>
          </div>

          {statusMsg && (
            <div className="p-2 bg-slate-800 text-white rounded font-mono text-[10px] text-center break-all animate-pulse">
              {statusMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
