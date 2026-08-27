"use client";

import React, { useEffect, useState } from "react";
import { api, User } from "../../lib/api";
import { 
  Users, CheckCircle, Wallet, Clock, RefreshCw, BarChart2, TrendingUp, Info, ShieldAlert
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#1e3a8a", "#15803d", "#eab308", "#ef4444"];

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Data States
  const [stats, setStats] = useState<any | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const loadAdminData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const user = await api.getMe();
        if (user.role !== "ADMIN") {
          window.location.href = "/login";
          return;
        }
        setCurrentUser(user);

        const s = await api.getAdminStats();
        setStats(s);

        const a = await api.getAdminAnalytics();
        setAnalytics(a);

        const pList = await api.getPayments();
        setPayments(pList);

      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load admin operations dashboard.");
      } finally {
        setLoading(false);
      }
    };
    loadAdminData();
  }, []);

  const reloadData = async () => {
    try {
      const s = await api.getAdminStats();
      setStats(s);
      const a = await api.getAdminAnalytics();
      setAnalytics(a);
      const pList = await api.getPayments();
      setPayments(pList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessPayment = async (id: string) => {
    setActionLoading(true);
    try {
      await api.processPayment(id);
      await reloadData();
    } catch (err: any) {
      alert(err.message || "Payment process request failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettlePayment = async (id: string) => {
    setActionLoading(true);
    try {
      await api.settlePayment(id);
      await reloadData();
    } catch (err: any) {
      alert(err.message || "Payment settlement request failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greetings Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
            <TrendingUp size={18} className="text-blue-900" />
            <span>National Procurement Operations Desk</span>
          </h2>
          <p className="text-xs text-slate-500">
            Monitor mandi utilization parameters, secure payments settlement workflows and system action logs.
          </p>
        </div>
        <button
          onClick={reloadData}
          className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-350 transition flex items-center gap-1.5"
        >
          <RefreshCw size={12} />
          <span>Refresh Console</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-white border-l-4 border-blue-900 border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Today's Appointments</span>
            <div className="text-xl font-black text-slate-800">{stats.today_bookings} Bookings</div>
            <span className="text-[9px] text-slate-400 block">{stats.today_farmers} registered farmers</span>
          </div>

          <div className="bg-white border-l-4 border-amber-500 border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Mandi Queue</span>
            <div className="text-xl font-black text-amber-600">{stats.waiting_farmers} Waiting</div>
            <span className="text-[9px] text-slate-400 block">{stats.currently_processing} currently weighing</span>
          </div>

          <div className="bg-white border-l-4 border-slate-800 border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Crops Secured</span>
            <div className="text-xl font-black text-slate-800">
              {stats.total_procurement_quantity.toLocaleString(undefined, { maximumFractionDigits: 1 })} qtl
            </div>
            <span className="text-[9px] text-slate-400 block">{stats.completed_today} completed today</span>
          </div>

          <div className="bg-white border-l-4 border-green-700 border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Secure Crop Value</span>
            <div className="text-xl font-black text-green-700">
              ₹{stats.total_procurement_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[9px] text-slate-400 block">Total grain value securing</span>
          </div>

          <div className="bg-white border-l-4 border-slate-400 border border-slate-200 rounded-2xl p-4 shadow-sm col-span-2 md:col-span-1 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Average queue wait</span>
            <div className="text-xl font-black text-slate-800">{stats.avg_waiting_time_minutes} mins</div>
            <span className="text-[9px] text-slate-400 block">Queue target benchmark &lt;20m</span>
          </div>
        </div>
      )}

      {/* Analytics Recharts Graphics */}
      {analytics && (
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Chart 1 */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              7-Day Crop Procurement Volumes (in Quintals)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.daily_volumes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                  <Bar dataKey="volume" fill="#15803d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              Crop Share Ratio (Quintals)
            </h3>
            <div className="h-64 flex flex-col justify-between">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={analytics.crop_distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics.crop_distribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-[10px] font-extrabold text-slate-500">
                {analytics.crop_distribution.map((entry: any, index: number) => (
                  <span key={entry.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {entry.name}: {entry.value.toFixed(1)} qtl
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 3 */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              Mandi Capacity Utilization (Today's Bookings vs Daily Capacity Limit)
            </h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.centre_utilization}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="bookings" name="Booked Count" fill="#1e3a8a" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="capacity" name="Max Capacity" fill="#e2e8f0" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Payout Console */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-extrabold text-slate-900 text-sm">
            Mandi Payout Settlement Console
          </h3>
          {stats && (
            <span className="text-[10px] bg-red-50 text-red-800 font-extrabold border border-red-200 px-3 py-1 rounded-xl">
              Pending Payouts: ₹{stats.pending_payment_value.toLocaleString()} ({stats.pending_payments_count} records)
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px]">
                <th className="p-3">Payment Reference ID</th>
                <th className="p-3">Procurement ID</th>
                <th className="p-3">Settlement Amount</th>
                <th className="p-3">Bank Status</th>
                <th className="p-3">Audit Transaction ID</th>
                <th className="p-3 text-right">Settlement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 font-mono font-bold text-slate-800">{p.id.substring(0, 8)}...</td>
                    <td className="p-3 font-mono text-slate-400">{p.procurement_id.substring(0, 8)}...</td>
                    <td className="p-3 font-extrabold text-slate-800">₹{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                        p.status === "PAID"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : p.status === "PROCESSING"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-600">
                      {p.transaction_reference || "Bank Processing..."}
                    </td>
                    <td className="p-3 text-right">
                      {p.status === "PENDING" && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleProcessPayment(p.id)}
                          className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-[10px] font-bold transition inline-flex items-center gap-0.5"
                        >
                          Send to Bank
                        </button>
                      )}
                      {p.status === "PROCESSING" && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleSettlePayment(p.id)}
                          className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-[10px] font-bold transition inline-flex items-center gap-0.5 animate-pulse"
                        >
                          Mark Paid
                        </button>
                      )}
                      {p.status === "PAID" && (
                        <span className="text-green-600 font-extrabold text-[10px] flex items-center justify-end gap-0.5">
                          ✓ Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    No payment settlement sheets recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Panel */}
      {analytics && analytics.audit_logs && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Operations Audit Log Trail (Latest 15 Actions)
          </h3>
          
          <div className="space-y-3 font-mono text-[10px] max-h-60 overflow-y-auto">
            {analytics.audit_logs.map((log: any) => (
              <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="space-y-1">
                  <div className="font-bold text-slate-700">
                    User: <span className="text-blue-900">{log.user_name}</span> | Action: <span className="text-slate-950 uppercase font-black">{log.action}</span>
                  </div>
                  <div className="text-slate-500 font-medium">{log.details}</div>
                </div>
                <div className="text-slate-400 shrink-0 font-bold">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
