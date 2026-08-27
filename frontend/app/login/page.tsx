"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { Smartphone, Mail, Lock, LogIn, AlertCircle } from "lucide-react";

function LoginForm() {

  const searchParams = useSearchParams();
  const isStaffParam = searchParams.get("staff") === "true";

  const [isStaff, setIsStaff] = useState(isStaffParam);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setIsStaff(isStaffParam);
  }, [isStaffParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const payload: any = { password };
      if (isStaff) {
        if (!email) throw new Error("Please enter your official email.");
        payload.email = email;
      } else {
        if (!phone) throw new Error("Please enter your mobile number.");
        payload.phone = phone;
      }

      const { user } = await api.login(payload);
      
      // Redirect based on role
      if (user.role === "FARMER") {
        window.location.href = "/farmer";
      } else if (user.role === "CENTRE_OPERATOR") {
        window.location.href = "/operator";
      } else if (user.role === "ADMIN") {
        window.location.href = "/admin";
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">
          {isStaff ? "Official Department Portal" : "Farmer Digital Access Portal"}
        </h2>
        <p className="text-xs text-slate-500">
          {isStaff 
            ? "Sign in as a Procurement Centre Operator or System Admin."
            : "Sign in with your registered mobile number to book slots and track weights."
          }
        </p>
      </div>

      {/* Role Toggle Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => {
            setIsStaff(false);
            setErrorMsg("");
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition ${
            !isStaff ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Farmer Login
        </button>
        <button
          onClick={() => {
            setIsStaff(true);
            setErrorMsg("");
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition ${
            isStaff ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Staff / Operator Login
        </button>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isStaff ? (
          // Staff Email Input
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Official Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@demo.gov"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>
        ) : (
          // Farmer Mobile Input
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Registered Mobile Number</label>
            <div className="relative">
              <Smartphone size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9000000001"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <span className="text-[10px] text-slate-400 block leading-tight">
              Enter 10-digit mobile number. Enter a demo mobile like 9000000001 or 9000000002 to test seeded farmers.
            </span>
          </div>
        )}

        {/* Password Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">Security Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm rounded-lg transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <LogIn size={16} />
          <span>{loading ? "Authenticating Session..." : "Secure Login"}</span>
        </button>
      </form>

      {!isStaff && (
        <div className="pt-4 border-t border-slate-100 text-center">
          <span className="text-xs text-slate-500">New Farmer? </span>
          <a href="/register" className="text-xs text-green-700 font-bold hover:underline">
            Register Profile Here
          </a>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-6 text-xs text-slate-500">Loading auth portals...</div>}>
      <LoginForm />
    </Suspense>
  );
}

