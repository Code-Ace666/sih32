"use client";

import React, { useEffect, useState, useRef } from "react";
import { useLanguage } from "../../lib/LanguageContext";
import { api, User } from "../../lib/api";
import { 
  Smartphone, MapPin, Calendar, Clock, Activity, CheckCircle2, 
  Trash2, AlertTriangle, ArrowRight, Bell, Inbox, AlertCircle, RefreshCw
} from "lucide-react";

export default function FarmerDashboard() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Data States
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [queueStatus, setQueueStatus] = useState<any | null>(null);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const wsRef = useRef<WebSocket | null>(null);

  // 1. Initial Load
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const user = await api.getMe();
        if (user.role !== "FARMER") {
          window.location.href = "/login";
          return;
        }
        setCurrentUser(user);

        const bookingsList = await api.getMyBookings();
        
        const active = bookingsList.find((b: any) => 
          ["BOOKED", "CHECKED_IN", "WAITING", "CALLED", "IN_PROCUREMENT"].includes(b.status)
        );
        const past = bookingsList.filter((b: any) => 
          ["COMPLETED", "CANCELLED", "MISSED"].includes(b.status)
        );

        setActiveBooking(active || null);
        setPastBookings(past);

        const notifList = await api.getNotifications();
        setNotifications(notifList);

        const smsMsgs = notifList.map((n: any) => `[SMS to ${user.phone}]: ${n.title} - ${n.message}`);
        setSmsLogs(smsMsgs);

      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // 2. Queue Details & WebSocket Handler
  useEffect(() => {
    if (!activeBooking) {
      if (wsRef.current) wsRef.current.close();
      setQueueStatus(null);
      return;
    }

    const fetchQueueInfo = async () => {
      try {
        const qInfo = await api.getLiveQueue(activeBooking.id);
        setQueueStatus(qInfo);
      } catch (err) {
        console.error("Error fetching live queue status", err);
      }
    };
    fetchQueueInfo();

    let pollInterval: any = null;
    const wsUrl = api.getWebSocketUrl(activeBooking.centre_id);
    
    const connectWS = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "QUEUE_UPDATE") {
            fetchQueueInfo();
            api.getNotifications().then(notifs => {
              setNotifications(notifs);
              if (currentUser) {
                setSmsLogs(notifs.map((n: any) => `[SMS to ${currentUser.phone}]: ${n.title} - ${n.message}`));
              }
            });
          }
        } catch (err) {
          console.error("Error handling WS message", err);
        }
      };

      ws.onerror = (err) => {
        console.warn("WS error, falling back to polling", err);
        setupPolling();
      };

      ws.onclose = () => {
        setupPolling();
      };
    };

    const setupPolling = () => {
      if (!pollInterval) {
        pollInterval = setInterval(() => {
          fetchQueueInfo();
        }, 5000);
      }
    };

    connectWS();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollInterval) clearInterval(pollInterval);
    };

  }, [activeBooking, currentUser]);

  // 3. User Actions: Check-in
  const handleCheckIn = async () => {
    if (!activeBooking) return;
    setActionLoading(true);
    try {
      await api.checkInBooking(activeBooking.id);
      const bookingsList = await api.getMyBookings();
      const active = bookingsList.find((b: any) => b.id === activeBooking.id);
      setActiveBooking(active);
    } catch (err: any) {
      alert(err.message || "Failed to check in.");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. User Actions: Cancel booking
  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    if (!confirm(t("btn_cancel_booking") + "?")) return;
    
    setActionLoading(true);
    try {
      await api.cancelBooking(activeBooking.id);
      setActiveBooking(null);
      const bookingsList = await api.getMyBookings();
      const past = bookingsList.filter((b: any) => 
        ["COMPLETED", "CANCELLED", "MISSED"].includes(b.status)
      );
      setPastBookings(past);
    } catch (err: any) {
      alert(err.message || "Failed to cancel booking.");
    } finally {
      setActionLoading(false);
    }
  };

  // Stepped Timeline Queue Status Helper
  const getTimelineSteps = () => {
    if (!activeBooking) return [];
    const status = activeBooking.status;
    const steps = [
      { label: "Booked", active: true, completed: ["CHECKED_IN", "WAITING", "CALLED", "IN_PROCUREMENT", "COMPLETED"].includes(status) },
      { label: "Checked In", active: ["CHECKED_IN", "WAITING"].includes(status), completed: ["CALLED", "IN_PROCUREMENT", "COMPLETED"].includes(status) },
      { label: "Called", active: status === "CALLED", completed: ["IN_PROCUREMENT", "COMPLETED"].includes(status) },
      { label: "Weighing", active: status === "IN_PROCUREMENT", completed: status === "COMPLETED" },
    ];
    return steps;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700 mx-auto" />
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Syncing data profiles...</p>
        </div>
      </div>
    );
  }

  const timeline = getTimelineSteps();

  return (
    <div className="space-y-8">
      {/* Greetings Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-blue-950 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none">
            {t("welcome")}, {currentUser?.name}!
          </h2>
          <p className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Farmer Reg ID: {currentUser?.farmer_profile?.farmer_registration_id} • Village: {currentUser?.farmer_profile?.village}
          </p>
        </div>
        {!activeBooking && (
          <a
            href="/farmer/book"
            className="w-full sm:w-auto px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-green-900/10 flex items-center justify-center gap-1.5"
          >
            <span>{t("btn_book_slot")}</span>
            <ArrowRight size={14} />
          </a>
        )}
      </div>

      {/* Active Slot & Stepped Queue Progress */}
      {activeBooking ? (
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Booking Details */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span>{t("active_booking_title")}</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                activeBooking.status === "BOOKED" 
                  ? "bg-slate-100 text-slate-800 border-slate-200" 
                  : activeBooking.status === "CALLED"
                  ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                  : activeBooking.status === "IN_PROCUREMENT"
                  ? "bg-blue-100 text-blue-800 border-blue-300"
                  : "bg-green-50 text-green-800 border-green-200"
              }`}>
                {activeBooking.status}
              </span>
            </div>

            {/* Stepped Timeline UI */}
            <div className="py-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-4">Mandi Gate Flow Progress</span>
              <div className="flex items-center justify-between relative">
                {/* Horizontal progress bar background */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-0" />
                
                {timeline.map((step, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center space-y-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition border-2 ${
                      step.completed
                        ? "bg-green-700 border-green-700 text-white"
                        : step.active
                        ? "bg-blue-900 border-blue-900 text-white animate-pulse"
                        : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      {step.completed ? "✓" : idx + 1}
                    </div>
                    <span className={`text-[9px] font-black tracking-wider uppercase ${
                      step.active || step.completed ? "text-slate-800" : "text-slate-400"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts warnings details */}
            {activeBooking.status === "CALLED" && (
              <div className="p-4 bg-amber-500/10 border-l-4 border-amber-500 text-amber-900 rounded-xl text-xs leading-relaxed font-semibold animate-pulse flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>{t("called_msg")}</span>
              </div>
            )}
            
            {activeBooking.status === "CHECKED_IN" && (
              <div className="p-4 bg-green-500/10 border-l-4 border-green-600 text-green-950 rounded-xl text-xs leading-relaxed font-semibold flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-700 shrink-0" />
                <span>{t("checked_in_msg")}</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-6 text-xs border-t border-slate-100 pt-6">
              <div className="space-y-4">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider">{t("centre_label")}</span>
                  <span className="font-extrabold text-slate-800 text-sm">{activeBooking.centre?.name}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {activeBooking.centre?.village}, {activeBooking.centre?.block}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider">{t("crop_label")}</span>
                  <span className="font-extrabold text-slate-800 text-sm">{activeBooking.crop_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider">{t("qty_label")}</span>
                  <span className="font-extrabold text-slate-800 text-sm">
                    {activeBooking.estimated_quantity_quintal} {t("quintal")}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider">{t("date_label")}</span>
                  <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                    <Calendar size={14} className="text-blue-900" />
                    {activeBooking.booking_date}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider">{t("slot_label")}</span>
                  <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                    <Clock size={14} className="text-blue-900" />
                    {activeBooking.slot?.start_time?.substring(0, 5)} - {activeBooking.slot?.end_time?.substring(0, 5)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-6 border-t border-slate-100">
              {activeBooking.status === "BOOKED" && (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow shadow-green-900/10 active:scale-95 duration-150"
                >
                  {actionLoading ? "Processing check-in..." : t("btn_im_here")}
                </button>
              )}

              {["BOOKED", "CHECKED_IN", "WAITING"].includes(activeBooking.status) && (
                <button
                  onClick={handleCancelBooking}
                  disabled={actionLoading}
                  className="px-5 py-3 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 rounded-xl transition text-xs font-extrabold uppercase tracking-wider active:scale-95 duration-150"
                >
                  {t("btn_cancel_booking")}
                </button>
              )}
            </div>
          </div>

          {/* Premium Queue position widget */}
          <div className="bg-slate-900 text-white border border-slate-950 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 relative z-10">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Live Mandi Queue</span>
              <span className="flex items-center gap-1 bg-slate-850 border border-slate-800 px-2 py-0.5 rounded-lg text-[9px] font-bold">
                <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[8px] text-green-400 font-black uppercase tracking-widest">WS Synced</span>
              </span>
            </div>

            {queueStatus ? (
              <div className="space-y-6 py-2 relative z-10">
                <div className="text-center space-y-1">
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{t("token_no")}</span>
                  <div className="text-5xl font-black text-amber-400 tracking-tight leading-none">{queueStatus.token_number}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-slate-800 py-4 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Now Serving</span>
                    <div className="text-sm font-extrabold text-slate-200">
                      {queueStatus.current_serving_token || "None"}
                    </div>
                  </div>
                  <div className="space-y-0.5 border-l border-slate-800">
                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Wait Ahead</span>
                    <div className="text-sm font-extrabold text-slate-200">
                      {queueStatus.queue_position > 0 ? `${queueStatus.queue_position - 1} Farmers` : "At Counter"}
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[9px] uppercase font-black text-slate-500 block tracking-widest">{t("est_wait")}</span>
                  <div className="text-xl font-black text-white">
                    {queueStatus.queue_position > 0 
                      ? `${queueStatus.estimated_wait_minutes} ${t("minutes")}` 
                      : "Called / Serving Now"
                    }
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Connecting queue services...
              </div>
            )}

            <div className="text-[9px] text-center text-slate-500 leading-normal relative z-10">
              Live updates are synced. Keep this dashboard open on your mobile screen.
            </div>
          </div>
        </div>
      ) : (
        // No active booking
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center max-w-xl mx-auto space-y-6">
          <div className="text-5xl">🌾</div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-slate-900">Get Your Procurement Token</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {t("no_active_bookings")}
            </p>
          </div>
          <a
            href="/farmer/book"
            className="inline-flex items-center gap-1.5 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition text-xs shadow shadow-green-900/10 active:scale-95 duration-150"
          >
            <span>{t("btn_book_slot")}</span>
            <ArrowRight size={14} />
          </a>
        </div>
      )}

      {/* Alerts and Mock SMS Gateways Logs */}
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Alerts In-App Inbox */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bell size={16} className="text-blue-900" />
            <span>{t("notifications_title")}</span>
          </h3>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((n: any) => (
                <div key={n.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs space-y-1.5">
                  <div className="font-extrabold text-slate-800 flex items-center justify-between">
                    <span>{t("lang_switch") === " हिंदी" ? n.title : n.title_hi}</span>
                    <span className="text-[9px] text-slate-400 font-normal">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {t("lang_switch") === " हिंदी" ? n.message : n.message_hi}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-1">
                <Inbox size={20} className="text-slate-300" />
                <span>{t("no_notifications")}</span>
              </div>
            )}
          </div>
        </div>

        {/* SMS gateway logs */}
        <div className="bg-slate-900 text-slate-300 border border-slate-950 rounded-2xl p-6 shadow-inner space-y-4">
          <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
            <Smartphone size={16} className="text-amber-400" />
            <span>{t("sms_log_title")}</span>
          </h3>

          <div className="font-mono text-[9px] space-y-3 max-h-60 overflow-y-auto">
            {smsLogs.length > 0 ? (
              smsLogs.map((log, idx) => (
                <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-xl leading-relaxed text-amber-300/80 break-words">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-600">
                [SMS gateway silent - Book a slot to trigger logs]
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-3">
          {t("history_title")}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px]">
                <th className="p-3">{t("col_date")}</th>
                <th className="p-3">{t("col_centre")}</th>
                <th className="p-3">{t("col_crop")}</th>
                <th className="p-3">{t("col_qty")}</th>
                <th className="p-3">{t("col_amount")}</th>
                <th className="p-3">{t("col_status")}</th>
                <th className="p-3">{t("col_payment")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pastBookings.length > 0 ? (
                pastBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 whitespace-nowrap font-semibold text-slate-900">{b.booking_date}</td>
                    <td className="p-3 whitespace-nowrap text-slate-600 font-medium">{b.centre?.name}</td>
                    <td className="p-3 whitespace-nowrap text-slate-600 font-medium">{b.crop_type}</td>
                    <td className="p-3 whitespace-nowrap text-slate-900 font-extrabold">
                      {b.procurement ? `${b.procurement.quantity_quintal} qtl` : `${b.estimated_quantity_quintal} qtl`}
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-900 font-extrabold">
                      {b.procurement ? `₹${b.procurement.net_payable_amount.toLocaleString()}` : "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                        b.status === "COMPLETED" 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : b.status === "MISSED"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {b.procurement?.payment ? (
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                            b.procurement.payment.status === "PAID"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : b.procurement.payment.status === "PROCESSING"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {b.procurement.payment.status}
                          </span>
                          {b.procurement.payment.transaction_reference && (
                            <span className="block text-[8px] text-slate-400 font-mono">
                              Ref: {b.procurement.payment.transaction_reference}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    {t("history_empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
