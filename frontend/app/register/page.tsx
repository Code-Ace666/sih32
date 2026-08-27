"use client";

import React, { useState } from "react";
import { api } from "../../lib/api";
import { UserPlus, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [regId, setRegId] = useState("");
  const [state, setState] = useState("Bihar");
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [village, setVillage] = useState("");
  const [address, setAddress] = useState("");
  const [lang, setLang] = useState("en");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);

    try {
      if (phone.length !== 10) {
        throw new Error("Mobile number must be exactly 10 digits.");
      }

      const payload = {
        phone,
        name,
        password,
        role: "FARMER",
        farmer_registration_id: regId,
        state,
        district,
        block,
        village,
        address,
        preferred_language: lang,
      };

      await api.register(payload);
      setSuccess(true);
      
      // Auto redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = `/login?staff=false&phone=${phone}`;
      }, 2500);

    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Mobile number might be already registered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-6 bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Farmer Registration Portal</h2>
        <p className="text-xs text-slate-500">
          Create your digital profile to enable online procurement slot booking and queue priority.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-900 text-xs flex items-center gap-2 font-semibold">
          <CheckCircle size={18} className="text-green-700 shrink-0" />
          <span>Profile created successfully! Redirecting you to login portal...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Details */}
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Personal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Full Name (पूरा नाम)</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rajesh Kumar"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Mobile Number (मोबाइल नंबर)</label>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9999999999"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Govt Registration & Language */}
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Government ID & Language</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Farmer Reg ID (पंजीकरण संख्या)</label>
              <input
                type="text"
                required
                value={regId}
                onChange={(e) => setRegId(e.target.value)}
                placeholder="REG1001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Preferred Language (भाषा)</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address details */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">3. Location details (Address)</h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">State</label>
              <input
                type="text"
                disabled
                value={state}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-500 focus:outline-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">District (जिला)</label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Patna"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Block (प्रखंड)</label>
              <input
                type="text"
                required
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                placeholder="Danapur"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Village (ग्राम)</label>
              <input
                type="text"
                required
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Khagaul"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Full Residential Address (पता)</label>
            <textarea
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Gola Road, Khagaul, Patna, Bihar, 801503"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Security Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">Security Password (पासवर्ड)</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || success}
          className="w-full py-3 bg-green-700 hover:bg-green-800 text-white font-bold text-sm rounded-lg transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <UserPlus size={16} />
          <span>{loading ? "Registering Profile..." : "Register & Complete Profile"}</span>
        </button>
      </form>

      <div className="pt-4 border-t border-slate-100 text-center">
        <span className="text-xs text-slate-500">Already registered? </span>
        <a href="/login" className="text-xs text-blue-900 font-bold hover:underline">
          Login here
        </a>
      </div>
    </div>
  );
}
