"use client";

import React, { useEffect, useState, useRef } from "react";
import { useLanguage } from "../../lib/LanguageContext";
import { api, User } from "../../lib/api";
import { 
  Smartphone, MapPin, Calendar, Clock, Activity, CheckCircle2, 
  Trash2, AlertTriangle, ArrowRight, Bell, Inbox, AlertCircle
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

        // Fetch bookings
        const bookingsList = await api.getMyBookings();
        
        // Split active and past
        const active = bookingsList.find((b: any) => 
          ["BOOKED", "CHECKED_IN", "WAITING", "CALLED", "IN_PROCUREMENT"].includes(b.status)
        );
        const past = bookingsList.filter((b: any) => 
          ["COMPLETED", "CANCELLED", "MISSED"].includes(b.status)
        );

        setActiveBooking(active || null);
        setPastBookings(past);

        // Fetch notifications
        const notifList = await api.getNotifications();
        setNotifications(notifList);

        // Populate mock SMS logs (we read this from the notifications that trigger SMS)
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

  // 2. Queue Details & WebSocket Handler for Active Booking
  useEffect(() => {
    if (!activeBooking) {
      // Clean up socket if active booking cancelled
      if (wsRef.current) {
        wsRef.current.close();
      }
      setQueueStatus(null);
      return;
    }

    // Load initial queue details
    const fetchQueueInfo = async () => {
      try {
        const qInfo = await api.getLiveQueue(activeBooking.id);
        setQueueStatus(qInfo);
      } catch (err) {
        console.error("Error fetching live queue status", err);
      }
    };
    fetchQueueInfo();

    // Setup WebSocket with fallback polling
    let pollInterval: any = null;
    const wsUrl = api.getWebSocketUrl(activeBooking.centre_id);
    
    const connectWS = () => {
      console.log("Connecting WebSocket to", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
          if (data.event === "QUEUE_UPDATE") {
            // Trigger data reload
            fetchQueueInfo();
            // Also refresh notifications
            api.getNotifications().then(notifs => {
              setNotifications(notifs);
              if (currentUser) {
                setSmsLogs(notifs.map((n: any) => `[SMS to ${currentUser.phone}]: ${n.title} - ${n.message}`));
              }
            });
          }
        } catch (err) {
          console.error("Error handling WebSocket message", err);
        }
      };

      ws.onerror = (err) => {
        console.warn("WebSocket error, falling back to polling", err);
        setupPolling();
      };

      ws.onclose = () => {
        console.log("WebSocket closed, starting polling check");
        setupPolling();
      };
    };

    const setupPolling = () => {
      if (!pollInterval) {
        pollInterval = setInterval(() => {
          console.log("Polling live queue status...");
          fetchQueueInfo();
        }, 5000);
      }
    };

    connectWS();

    // Clean up
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };

  }, [activeBooking, currentUser]);

  // 3. User Actions: Check-in
  const handleCheckIn = async () => {
    if (!activeBooking) return;
    setActionLoading(true);
    try {
      await api.checkInBooking(activeBooking.id);
      // Reload booking state
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
      // Reload history
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto" />
          <p className="text-xs text-slate-500">Loading your farmer profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greetings Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>{t("welcome")}, {currentUser?.name}!</span>
          </h2>
          <p className="text-xs text-slate-500">
            Reg ID: {currentUser?.farmer_profile?.farmer_registration_id} • 
            Location: {currentUser?.farmer_profile?.village}, {currentUser?.farmer_profile?.block}
          </p>
        </div>
        {!activeBooking && (
          <a
            href="/farmer/book"
            className="px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded-lg transition shadow-md flex items-center gap-1.5"
          >
            <span>{t("btn_book_slot")}</span>
            <ArrowRight size={14} />
          </a>
        )}
      </div>

      {/* Active Slot & Queue Position Widget */}
      {activeBooking ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Booking Details */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <span>{t("active_booking_title")}</span>
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                activeBooking.status === "BOOKED" 
                  ? "bg-slate-100 text-slate-800 border border-slate-200" 
                  : activeBooking.status === "CALLED"
                  ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                  : activeBooking.status === "IN_PROCUREMENT"
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : "bg-green-50 text-green-800 border border-green-200"
              }`}>
                {activeBooking.status}
              </span>
            </div>

            {/* Quick Banner for Called Status */}
            {activeBooking.status === "CALLED" && (
              <div className="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-900 rounded-lg text-xs leading-relaxed font-semibold animate-pulse">
                {t("called_msg")}
              </div>
            )}
            
            {activeBooking.status === "CHECKED_IN" && (
              <div className="p-4 bg-green-50 border-l-4 border-green-600 text-green-900 rounded-lg text-xs leading-relaxed font-semibold">
                {t("checked_in_msg")}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 font-medium block">{t("centre_label")}</span>
                  <span className="font-bold text-slate-800">{activeBooking.centre?.name}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ({activeBooking.centre?.village}, {activeBooking.centre?.block})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{t("crop_label")}</span>
                  <span className="font-bold text-slate-800">{activeBooking.crop_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{t("qty_label")}</span>
                  <span className="font-bold text-slate-800">
                    {activeBooking.estimated_quantity_quintal} {t("quintal")}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 font-medium block">{t("date_label")}</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Calendar size={14} className="text-slate-400" />
                    {activeBooking.booking_date}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{t("slot_label")}</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Clock size={14} className="text-slate-400" />
                    {activeBooking.slot?.start_time?.substring(0, 5)} - {activeBooking.slot?.end_time?.substring(0, 5)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
              {activeBooking.status === "BOOKED" && (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg transition text-xs shadow-sm"
                >
                  {actionLoading ? "Checking In..." : t("btn_im_here")}
                </button>
              )}

              {["BOOKED", "CHECKED_IN", "WAITING"].includes(activeBooking.status) && (
                <button
                  onClick={handleCancelBooking}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-slate-300 hover:border-red-300 rounded-lg transition text-xs font-bold"
                >
                  {t("btn_cancel_booking")}
                </button>
              )}
            </div>
          </div>

          {/* Real-time Queue position widget */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-6 shadow-md flex flex-col justify-between space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Live Queue Widget</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-ping" />
                <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">Live WS</span>
              </span>
            </div>

            {queueStatus ? (
              <div className="space-y-4 py-2">
                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">{t("token_no")}</span>
                  <div className="text-4xl font-black text-amber-400 tracking-tight">{queueStatus.token_number}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-slate-800 py-3 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Now Serving</span>
                    <div className="text-sm font-extrabold text-white">
                      {queueStatus.current_serving_token || "None"}
                    </div>
                  </div>
                  <div className="space-y-0.5 border-l border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Wait Ahead</span>
                    <div className="text-sm font-extrabold text-white">
                      {queueStatus.queue_position > 0 ? `${queueStatus.queue_position - 1} Farmers` : "Called"}
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{t("est_wait")}</span>
                  <div className="text-lg font-black text-white">
                    {queueStatus.queue_position > 0 
                      ? `${queueStatus.estimated_wait_minutes} ${t("minutes")}` 
                      : "Called / Serving Now"
                    }
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                Calculating live queue position...
              </div>
            )}

            <div className="text-[9px] text-center text-slate-500 leading-tight">
              Queue positions recalculate instantly when operators call tokens. Keep this tab open.
            </div>
          </div>
        </div>
      ) : (
        // No active booking
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center max-w-xl mx-auto space-y-4">
          <div className="text-4xl text-slate-300">🌾</div>
          <h3 className="text-lg font-bold text-slate-800">Ready to Sell Crops?</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {t("no_active_bookings")}
          </p>
          <a
            href="/farmer/book"
            className="inline-flex items-center gap-1.5 px-5 py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg transition text-xs shadow"
          >
            <span>{t("btn_book_slot")}</span>
            <ArrowRight size={14} />
          </a>
        </div>
      )}

      {/* Alerts and Mock SMS Gateways Logs */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Alerts In-App Inbox */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Bell size={16} className="text-blue-900" />
            <span>{t("notifications_title")}</span>
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((n: any) => (
                <div key={n.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
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
              <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-1">
                <Inbox size={20} className="text-slate-300" />
                <span>{t("no_notifications")}</span>
              </div>
            )}
          </div>
        </div>

        {/* SMS gateway logs */}
        <div className="bg-slate-900 text-slate-300 border border-slate-800 rounded-xl p-5 shadow-inner space-y-4">
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-1.5 border-b border-slate-800 pb-3">
            <Smartphone size={16} className="text-amber-400" />
            <span>{t("sms_log_title")}</span>
          </h3>

          <div className="font-mono text-[10px] space-y-2.5 max-h-60 overflow-y-auto">
            {smsLogs.length > 0 ? (
              smsLogs.map((log, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950 rounded border border-slate-800 leading-relaxed text-amber-300/90 break-words">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-600">
                [SMS Gateway Idle - Book a slot to trigger SMS notification]
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking History Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
          {t("history_title")}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
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
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap font-medium text-slate-900">{b.booking_date}</td>
                    <td className="p-3 whitespace-nowrap text-slate-600">{b.centre?.name}</td>
                    <td className="p-3 whitespace-nowrap text-slate-600">{b.crop_type}</td>
                    <td className="p-3 whitespace-nowrap text-slate-800 font-bold">
                      {/* Show weighed weight if exists, else estimate */}
                      {b.procurement ? `${b.procurement.quantity_quintal} qtl` : `${b.estimated_quantity_quintal} qtl (Est.)`}
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-900 font-bold">
                      {b.procurement ? `₹${b.procurement.net_payable_amount.toLocaleString()}` : "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        b.status === "COMPLETED" 
                          ? "bg-green-50 text-green-700 border border-green-200" 
                          : b.status === "MISSED"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {b.procurement?.payment ? (
                        <div className="space-y-0.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            b.procurement.payment.status === "PAID"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : b.procurement.payment.status === "PROCESSING"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {b.procurement.payment.status}
                          </span>
                          {b.procurement.payment.transaction_reference && (
                            <span className="block text-[8px] text-slate-400 font-mono">
                              Tx: {b.procurement.payment.transaction_reference}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
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
