"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../../../lib/LanguageContext";
import { api } from "../../../lib/api";
import { MapPin, Calendar, Clock, ArrowRight, CheckCircle2, ChevronRight, AlertCircle, Info, Landmark } from "lucide-react";

export default function BookSlotPage() {
  const { t } = useLanguage();
  
  // Selection States
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [centres, setCentres] = useState<any[]>([]);
  const [selectedCentre, setSelectedCentre] = useState<any | null>(null);
  
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [recommendedSlot, setRecommendedSlot] = useState<any | null>(null);

  const [cropType, setCropType] = useState("Paddy");
  const [qty, setQty] = useState("");
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [centresLoading, setCentresLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any | null>(null);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    setDate(todayStr);
    fetchCentres("", "");
  }, []);

  const fetchCentres = async (distFilter: string, blkFilter: string) => {
    setCentresLoading(true);
    setErrorMsg("");
    try {
      const list = await api.getCentres(distFilter, blkFilter);
      setCentres(list);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load procurement centres.");
    } finally {
      setCentresLoading(false);
    }
  };

  const handleSearchCentres = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCentres(district, block);
  };

  useEffect(() => {
    if (!selectedCentre || !date) return;
    
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setErrorMsg("");
      try {
        const slotsList = await api.getCentreSlots(selectedCentre.id, date);
        setSlots(slotsList);
        setSelectedSlot(null);

        const availableSlots = slotsList.filter((s: any) => s.booked_count < s.max_capacity);
        if (availableSlots.length > 0) {
          const sorted = [...availableSlots].sort((a: any, b: any) => a.booked_count - b.booked_count);
          setRecommendedSlot(sorted[0]);
        } else {
          setRecommendedSlot(null);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to fetch time slots.");
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [selectedCentre, date]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCentre || !selectedSlot || !date || !cropType || !qty) {
      setErrorMsg("Please complete all steps before confirming.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        centre_id: selectedCentre.id,
        slot_id: selectedSlot.id,
        booking_date: date,
        crop_type: cropType,
        estimated_quantity_quintal: parseFloat(qty)
      };

      const booking = await api.createBooking(payload);
      setCreatedBooking(booking);
      setSuccess(true);
      
      setTimeout(() => {
        window.location.href = "/farmer";
      }, 3000);

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to book slot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Title */}
      <div className="border-b border-slate-200/80 pb-5">
        <h2 className="text-xl md:text-2xl font-black text-slate-900">{t("book_header")}</h2>
        <p className="text-xs text-slate-500">
          Complete the steps below to reserve your slot and avoid waiting in Mandi lines.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {success && createdBooking && (
        <div className="p-8 bg-green-50 border border-green-200 rounded-3xl space-y-6 text-center max-w-md mx-auto shadow-md">
          <CheckCircle2 size={44} className="text-green-700 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-green-950">{t("booking_success")}</h3>
            <p className="text-xs text-slate-500">Your appointment is confirmed and added to database.</p>
          </div>
          
          <div className="bg-white p-5 border border-green-200 rounded-2xl space-y-3.5 text-xs text-slate-700 text-left">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium">Token Number:</span>
              <span className="font-black text-blue-900 text-sm">{createdBooking.token_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Mandi Centre:</span>
              <span className="font-bold text-slate-800">{selectedCentre?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Booking Date:</span>
              <span className="font-bold text-slate-800">{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Time Window:</span>
              <span className="font-bold text-slate-800">
                {selectedSlot?.start_time?.substring(0, 5)} - {selectedSlot?.end_time?.substring(0, 5)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 animate-pulse font-semibold">
            Opening your live queue dashboard portal...
          </p>
        </div>
      )}

      {!success && (
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Form Steps */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Step 1: Centre Discovery */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="h-6 w-6 bg-green-700 text-white rounded-xl flex items-center justify-center text-[10px] font-black">1</span>
                <span>{t("select_centre")}</span>
              </h3>

              <form onSubmit={handleSearchCentres} className="grid sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder={t("search_dist")}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                />
                <input
                  type="text"
                  placeholder={t("search_block")}
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={centresLoading}
                  className="py-2.5 bg-slate-850 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition uppercase tracking-wider"
                >
                  {centresLoading ? "Searching..." : t("btn_search")}
                </button>
              </form>

              {/* Discovery lists */}
              <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
                {centres.length > 0 ? (
                  centres.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCentre(c);
                        setSelectedSlot(null);
                      }}
                      className={`w-full text-left p-3.5 border rounded-2xl transition flex justify-between items-center ${
                        selectedCentre?.id === c.id 
                          ? "border-green-600 bg-green-50/40" 
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="text-xs">
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Landmark size={14} className="text-green-700" />
                          <span>{c.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          District: {c.district} | Block: {c.block} | Village: {c.village}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No procurement centres matched filters.
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Date & Step 3: Slots */}
            {selectedCentre && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
                
                {/* Date Selection */}
                <div className="space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <span className="h-6 w-6 bg-green-700 text-white rounded-xl flex items-center justify-center text-[10px] font-black">2</span>
                    <span>{t("select_date")}</span>
                  </h3>
                  <div className="relative max-w-xs">
                    <Calendar size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Slots selection */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <span className="h-6 w-6 bg-green-700 text-white rounded-xl flex items-center justify-center text-[10px] font-black">3</span>
                    <span>{t("select_slot")}</span>
                  </h3>

                  {slotsLoading ? (
                    <div className="text-center py-6 text-xs text-slate-400">Syncing slot parameters...</div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {slots.map((s) => {
                        const isFull = s.booked_count >= s.max_capacity;
                        const isRecommended = recommendedSlot?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            disabled={isFull}
                            onClick={() => setSelectedSlot(s)}
                            className={`p-3.5 border rounded-2xl transition text-left flex flex-col justify-between h-20 relative ${
                              selectedSlot?.id === s.id 
                                ? "border-green-600 bg-green-50/40" 
                                : isFull 
                                ? "border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            {isRecommended && !isFull && (
                              <span className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Recommended
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                              <Clock size={12} className="text-slate-400" />
                              <span>{s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}</span>
                            </div>
                            <div className="text-[10px]">
                              {isFull ? (
                                <span className="text-red-500 font-bold">Capacity Full</span>
                              ) : (
                                <span className="text-slate-500 font-semibold">
                                  {s.max_capacity - s.booked_count} {t("slots_available")}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Crop specs */}
            {selectedCentre && selectedSlot && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span className="h-6 w-6 bg-green-700 text-white rounded-xl flex items-center justify-center text-[10px] font-black">4</span>
                  <span>{t("enter_crop_details")}</span>
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">{t("crop_type_label")}</label>
                    <select
                      value={cropType}
                      onChange={(e) => setCropType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none"
                    >
                      <option value="Paddy">{t("paddy")}</option>
                      <option value="Wheat">{t("wheat")}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">{t("qty_est")}</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={handleConfirmBooking}
                    disabled={loading}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow shadow-green-900/10 flex items-center justify-center gap-1.5 active:scale-95 duration-150"
                  >
                    <CheckCircle2 size={16} />
                    <span>{loading ? "Creating booking..." : t("btn_confirm_booking")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Booking Summary Panel */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-white border border-slate-950 rounded-2xl p-5 shadow space-y-4 text-xs">
              <h3 className="font-extrabold border-b border-slate-800 pb-2 text-[10px] uppercase text-slate-500 tracking-widest">
                Booking Summary Review
              </h3>
              
              <div className="space-y-3.5">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block tracking-wider">Mandi Location</span>
                  <span className="font-bold text-slate-200">{selectedCentre ? selectedCentre.name : "Not selected"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block tracking-wider">Appointment Date</span>
                  <span className="font-bold text-slate-200">{date || "Not selected"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block tracking-wider">Time Window</span>
                  <span className="font-bold text-slate-200">
                    {selectedSlot 
                      ? `${selectedSlot.start_time.substring(0, 5)} - ${selectedSlot.end_time.substring(0, 5)}` 
                      : "Not selected"
                    }
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block tracking-wider">Crop Details</span>
                  <span className="font-bold text-slate-200">{cropType} {qty ? `| Qty: ${qty} qtl` : ""}</span>
                </div>
              </div>

              {selectedCentre && (
                <div className="pt-4 border-t border-slate-800 space-y-2.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-medium">Estimated wait:</span>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 font-bold rounded uppercase tracking-wide">
                      LOW
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-medium">Avg processing time:</span>
                    <span className="text-slate-300 font-bold">{selectedCentre.avg_service_time_mins} mins</span>
                  </div>
                </div>
              )}
            </div>

            {/* Smart info badge details */}
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-amber-900 text-[10px] leading-relaxed flex gap-2">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block text-amber-800">Smart Recommendation Badge:</span>
                Picking slots with the <span className="font-bold text-amber-600">RECOMMENDED</span> badge means lower queue times at the Mandi, as calculated by today's operational patterns.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
