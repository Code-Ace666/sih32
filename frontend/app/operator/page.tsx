"use client";

import React, { useEffect, useState, useRef } from "react";
import { api, User } from "../../lib/api";
import { 
  Play, CheckSquare, UserCheck, Phone, 
  RefreshCw, Info, Landmark, Layers, AlertCircle
} from "lucide-react";

export default function OperatorConsole() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Centre Selection
  const [centres, setCentres] = useState<any[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<string>("");
  const [selectedCentre, setSelectedCentre] = useState<any | null>(null);

  // Dashboard Data
  const [stats, setStats] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  
  // Currently Active Operator Actions
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue");
  const [processingBooking, setProcessingBooking] = useState<any | null>(null);
  
  // Crop record form states
  const [cropVariety, setCropVariety] = useState("Common");
  const [qty, setQty] = useState("");
  const [grade, setGrade] = useState("Common");
  const [moisture, setMoisture] = useState("14.0");
  const [unitPrice, setUnitPrice] = useState("");
  const [deductions, setDeductions] = useState("0.0");

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const loadCentres = async () => {
      setLoading(true);
      try {
        const user = await api.getMe();
        if (user.role !== "CENTRE_OPERATOR" && user.role !== "ADMIN") {
          window.location.href = "/login";
          return;
        }
        setCurrentUser(user);

        const list = await api.getCentres();
        setCentres(list);

        const savedCentreId = localStorage.getItem("operator_centre_id");
        if (savedCentreId && list.some((c: any) => c.id === savedCentreId)) {
          setSelectedCentreId(savedCentreId);
        } else if (list.length > 0) {
          setSelectedCentreId(list[0].id);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load setup parameters.");
      } finally {
        setLoading(false);
      }
    };
    loadCentres();
  }, []);

  useEffect(() => {
    if (!selectedCentreId) return;
    
    localStorage.setItem("operator_centre_id", selectedCentreId);
    const centre = centres.find(c => c.id === selectedCentreId);
    setSelectedCentre(centre || null);

    loadDashboardData();

    const wsUrl = api.getWebSocketUrl(selectedCentreId);
    const connectWS = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "QUEUE_UPDATE") {
            loadDashboardData();
          }
        } catch (err) {
          console.error("WS message parse error", err);
        }
      };

      ws.onclose = () => {
        setTimeout(connectWS, 5000);
      };
    };
    connectWS();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };

  }, [selectedCentreId, centres]);

  const loadDashboardData = async () => {
    if (!selectedCentreId) return;
    setDataLoading(true);
    try {
      const s = await api.getOperatorStats(selectedCentreId);
      setStats(s);

      const list = await api.getOperatorBookings(selectedCentreId);
      setBookings(list);

      const inProc = list.find((b: any) => b.status === "IN_PROCUREMENT");
      if (inProc) {
        setProcessingBooking(inProc);
        setUnitPrice(inProc.crop_type === "Paddy" ? "2183" : "2275");
        setQty(inProc.estimated_quantity_quintal.toString());
      } else {
        setProcessingBooking(null);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCallNext = async () => {
    if (!selectedCentreId) return;
    setActionLoading(true);
    try {
      const res = await api.callNext(selectedCentreId);
      await loadDashboardData();
      if (res.called_token) {
        alert(`Token ${res.called_token} called successfully!`);
      } else {
        alert("No checked-in farmers waiting in the queue.");
      }
    } catch (err: any) {
      alert(err.message || "Call Next failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualCheckIn = async (bookingId: string) => {
    setActionLoading(true);
    try {
      await api.operatorCheckIn(bookingId);
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Manual check-in failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartProcurement = async (bookingId: string) => {
    setActionLoading(true);
    try {
      await api.startProcurement(bookingId);
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to start procurement.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkMissed = async (bookingId: string) => {
    if (!confirm("Are you sure you want to mark this farmer as MISSED?")) return;
    setActionLoading(true);
    try {
      await api.markMissed(bookingId);
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to mark missed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingBooking) return;
    
    setActionLoading(true);
    try {
      const payload = {
        crop_variety: cropVariety,
        quantity_quintal: parseFloat(qty),
        quality_grade: grade,
        moisture_percentage: parseFloat(moisture),
        price_per_quintal: parseFloat(unitPrice),
        deductions: parseFloat(deductions)
      };

      await api.completeProcurement(processingBooking.id, payload);
      setProcessingBooking(null);
      await loadDashboardData();
      alert("Procurement record submitted and payment slip generated!");
    } catch (err: any) {
      alert(err.message || "Failed to complete procurement.");
    } finally {
      setActionLoading(false);
    }
  };

  const calculatedGross = parseFloat(qty || "0") * parseFloat(unitPrice || "0");
  const calculatedNet = calculatedGross - parseFloat(deductions || "0");

  const getCongestionBadge = () => {
    if (!stats) return { label: "LOW", color: "bg-green-500 text-white" };
    const qLen = stats.checked_in_count + stats.processing_count;
    if (qLen > 10) return { label: "HIGH", color: "bg-red-600 text-white" };
    if (qLen > 5) return { label: "MODERATE", color: "bg-amber-500 text-slate-900" };
    return { label: "LOW", color: "bg-green-600 text-white" };
  };
  const congestion = getCongestionBadge();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  const calledFarmer = bookings.find(b => b.status === "CALLED");
  const waitingList = bookings.filter(b => ["CHECKED_IN", "WAITING"].includes(b.status));
  const bookedList = bookings.filter(b => b.status === "BOOKED");
  const completedList = bookings.filter(b => b.status === "COMPLETED");

  return (
    <div className="space-y-6">
      
      {/* Top Banner Dropdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
            <Landmark size={18} className="text-blue-900" />
            <span>Procurement Centre Operations Desk</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage the active mandi queue, check-in upcoming farmers, and record weighed crops.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Mandi Centre:</label>
          <select
            value={selectedCentreId}
            onChange={(e) => setSelectedCentreId(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:bg-white transition"
          >
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Active Queue Line", value: stats.checked_in_count, color: "text-slate-800" },
            { label: "Upcoming Bookings", value: stats.waiting_count, color: "text-slate-800" },
            { label: "In Weighing", value: stats.processing_count, color: "text-slate-800" },
            { label: "Completed Today", value: stats.completed_today_count, color: "text-green-700" }
          ].map((card, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{card.label}</span>
              <span className={`text-2xl font-black ${card.color} mt-1 block`}>{card.value}</span>
            </div>
          ))}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center flex flex-col justify-center items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Mandi Congestion</span>
            <span className={`px-2.5 py-0.5 text-xs font-black rounded-lg uppercase tracking-wider ${congestion.color}`}>
              {congestion.label}
            </span>
          </div>
        </div>
      )}

      {/* Main Panel grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Call Next Controller */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Queue Controller Counter</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                disabled={actionLoading || waitingList.length === 0}
                onClick={handleCallNext}
                className="w-full sm:w-auto px-6 py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <RefreshCw className={actionLoading ? "animate-spin" : ""} size={14} />
                <span>Call Next Farmer</span>
              </button>

              <div className="text-xs text-slate-500 leading-normal text-center sm:text-left">
                {waitingList.length > 0 
                  ? `There are ${waitingList.length} checked-in farmers waiting in the active queue line.`
                  : "No checked-in farmers are currently waiting. Please check in upcoming farmers."
                }
              </div>
            </div>

            {/* Currently Called Banner */}
            {calledFarmer && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-pulse">
                <div>
                  <span className="text-[9px] text-blue-900 font-black block uppercase tracking-widest">Called Token (At counter)</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{calledFarmer.token_number}</div>
                  <div className="text-xs text-slate-700 font-extrabold mt-0.5">{calledFarmer.farmer_name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone size={10} />
                    <span>{calledFarmer.farmer_phone}</span>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStartProcurement(calledFarmer.id)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1"
                  >
                    <Play size={12} />
                    Start Weighing
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleMarkMissed(calledFarmer.id)}
                    className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-650 border border-slate-350 hover:border-red-300 rounded-lg text-xs font-bold transition"
                  >
                    Missed
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Crop record sheet */}
          {processingBooking ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-950 text-sm flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-600 animate-ping" />
                  <span>Crop Record & Weighing Sheet</span>
                </h3>
                <span className="text-xs text-blue-900 font-black uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-lg">
                  Token: {processingBooking.token_number}
                </span>
              </div>

              <form onSubmit={handleCompleteProcurement} className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Crop Type</label>
                    <input
                      type="text"
                      disabled
                      value={processingBooking.crop_type}
                      className="w-full px-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-650 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Variety Name</label>
                    <input
                      type="text"
                      required
                      value={cropVariety}
                      onChange={(e) => setCropVariety(e.target.value)}
                      placeholder="e.g. Sona Masuri"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-505 transition"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Weighed Qty (Quintals)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="e.g. 52.5"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-505 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Moisture %</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={moisture}
                      onChange={(e) => setMoisture(e.target.value)}
                      placeholder="14.0"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-505 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Quality Grade</label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:bg-white transition"
                    >
                      <option value="Grade A">Grade A</option>
                      <option value="Grade B">Grade B</option>
                      <option value="Common">Common</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">MSP Price (₹/Qtl)</label>
                    <input
                      type="number"
                      required
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder="2183"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-505 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Deductions (₹)</label>
                    <input
                      type="number"
                      required
                      value={deductions}
                      onChange={(e) => setDeductions(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-505 transition"
                    />
                  </div>
                </div>

                {/* Calculations layout box */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-[9px] uppercase text-slate-450 block font-bold tracking-wider">Gross Amount</span>
                    <span className="font-extrabold text-slate-800 mt-1 block">
                      ₹{calculatedGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-455 block font-bold tracking-wider">Deductions</span>
                    <span className="font-extrabold text-red-600 mt-1 block">
                      - ₹{parseFloat(deductions || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-l border-slate-200">
                    <span className="text-[9px] uppercase text-slate-460 block font-bold tracking-wider">Net Payable</span>
                    <span className="font-black text-green-700 text-sm mt-0.5 block">
                      ₹{calculatedNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow shadow-green-900/10 flex items-center justify-center gap-1.5 active:scale-95 duration-150"
                >
                  <CheckSquare size={14} />
                  <span>Submit crop weights & complete</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Info size={16} className="text-slate-400 shrink-0" />
              <span>Weighing scale console idle. Call next farmer and click "Start Weighing" to record details.</span>
            </div>
          )}

          {/* Active Queue Line lists */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Active Queue Line (Checked-in Farmers waiting)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px]">
                    <th className="p-3">Sequence</th>
                    <th className="p-3">Token</th>
                    <th className="p-3">Farmer</th>
                    <th className="p-3">Crop</th>
                    <th className="p-3">Estimated Qty</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {waitingList.length > 0 ? (
                    waitingList.map((w, idx) => (
                      <tr key={w.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 font-semibold text-slate-500">#{idx + 1}</td>
                        <td className="p-3 font-extrabold text-blue-900">{w.token_number}</td>
                        <td className="p-3">
                          <span className="font-extrabold block">{w.farmer_name}</span>
                          <span className="text-[10px] text-slate-400">{w.farmer_phone}</span>
                        </td>
                        <td className="p-3 text-slate-655 font-medium">{w.crop_type}</td>
                        <td className="p-3 text-slate-655 font-bold">{w.estimated_quantity_quintal} qtl</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-200 text-[9px] font-black rounded-lg uppercase">
                            {w.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            disabled={actionLoading}
                            onClick={() => handleStartProcurement(w.id)}
                            className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-[10px] font-bold transition inline-flex items-center gap-0.5"
                          >
                            <Play size={10} />
                            Start
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        No checked-in farmers waiting in the active queue line.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "queue" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Upcoming ({bookedList.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Completed Today ({completedList.length})
            </button>
          </div>

          {activeTab === "queue" ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                Today's Booked slots
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {bookedList.length > 0 ? (
                  bookedList.map((b) => (
                    <div key={b.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center gap-4">
                      <div className="text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[9px] font-black">{b.token_number}</span>
                          <span>{b.farmer_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Slot: {b.slot?.start_time?.substring(0, 5)} - {b.slot?.end_time?.substring(0, 5)} | Crop: {b.crop_type}
                        </span>
                      </div>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleManualCheckIn(b.id)}
                        className="px-2.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 shrink-0"
                      >
                        <UserCheck size={10} />
                        Check In
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No upcoming booked slots for today.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                Completed Weighing Slips
              </h3>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {completedList.length > 0 ? (
                  completedList.map((c) => (
                    <div key={c.id} className="p-3.5 bg-green-50/20 border border-green-200 rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between items-center font-bold text-slate-800">
                        <span>{c.token_number} - {c.farmer_name}</span>
                        <span className="text-green-750 font-black text-[9px] uppercase tracking-wider">Completed</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                        <div>Crop: <span className="font-bold text-slate-700">{c.crop_type}</span></div>
                        <div>Weight: <span className="font-bold text-slate-700">{c.procurement ? `${c.procurement.quantity_quintal} qtl` : `${c.estimated_quantity_quintal} qtl`}</span></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No crop procurement completed today.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
