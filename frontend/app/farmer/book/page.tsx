"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../../../lib/LanguageContext";
import { api } from "../../../lib/api";
import { MapPin, Calendar, Clock, Wheat, ArrowRight, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";

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

  // 1. Set default date to today
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    setDate(todayStr);
    
    // Initial fetch of all centres
    fetchCentres("", "");
  }, []);

  // 2. Fetch Centres
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

  // 3. Fetch Slots when Centre or Date changes
  useEffect(() => {
    if (!selectedCentre || !date) return;
    
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setErrorMsg("");
      try {
        const slotsList = await api.getCentreSlots(selectedCentre.id, date);
        setSlots(slotsList);
        setSelectedSlot(null);

        // Smart Slot Recommendation: least congested slot
        // Filter for slots that are not full
        const availableSlots = slotsList.filter((s: any) => s.booked_count < s.max_capacity);
        if (availableSlots.length > 0) {
          // Sort by booked_count ascending to find least congested
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

  // 4. Handle Submit Booking
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
      
      // Redirect back to dashboard after 3 seconds
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">{t("book_header")}</h2>
        <p className="text-xs text-slate-500">
          Book online, receive a token, and arrive at the centre when your turn is close.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {success && createdBooking && (
        <div className="p-6 bg-green-50 border border-green-200 rounded-xl space-y-4 text-center max-w-md mx-auto">
          <CheckCircle2 size={36} className="text-green-700 mx-auto" />
          <h3 className="text-lg font-bold text-green-900">{t("booking_success")}</h3>
          <div className="bg-white p-4 border border-green-200 rounded-lg space-y-2 text-xs text-slate-700">
            <div className="flex justify-between font-medium">
              <span>Token Number:</span>
              <span className="font-extrabold text-blue-900 text-sm">{createdBooking.token_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Centre:</span>
              <span className="font-bold">{selectedCentre?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span className="font-bold">{date}</span>
            </div>
            <div className="flex justify-between">
              <span>Time Slot:</span>
              <span className="font-bold">
                {selectedSlot?.start_time?.substring(0, 5)} - {selectedSlot?.end_time?.substring(0, 5)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 animate-pulse">
            Redirecting you to dashboard live queue tracker...
          </p>
        </div>
      )}

      {!success && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Booking Form Steps */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Step 1: Choose Centre */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <span className="h-5 w-5 bg-green-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                <span>{t("select_centre")}</span>
              </h3>

              {/* Discovery search filters */}
              <form onSubmit={handleSearchCentres} className="grid sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder={t("search_dist")}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
                <input
                  type="text"
                  placeholder={t("search_block")}
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={centresLoading}
                  className="py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
                >
                  {centresLoading ? "Searching..." : t("btn_search")}
                </button>
              </form>

              {/* Centre Selection List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {centres.length > 0 ? (
                  centres.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCentre(c);
                        setSelectedSlot(null);
                      }}
                      className={`w-full text-left p-3 border rounded-lg transition flex justify-between items-center ${
                        selectedCentre?.id === c.id 
                          ? "border-green-600 bg-green-50/50" 
                          : "border-slate-200 hover:border-slate-300 bg-slate-50/20"
                      }`}
                    >
                      <div className="text-xs">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <MapPin size={12} className="text-green-700" />
                          <span>{c.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          District: {c.district} | Block: {c.block} | Village: {c.village}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No active procurement centres found.
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Choose Date & Step 3: Choose Slot */}
            {selectedCentre && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
                {/* Date Picker */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <span className="h-5 w-5 bg-green-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>{t("select_date")}</span>
                  </h3>
                  <div className="relative max-w-xs">
                    <Calendar size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Slots selection */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <span className="h-5 w-5 bg-green-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>{t("select_slot")}</span>
                  </h3>

                  {slotsLoading ? (
                    <div className="text-center py-4 text-xs text-slate-400">Loading slots availability...</div>
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
                            className={`p-3 border rounded-lg transition text-left flex flex-col justify-between h-20 relative ${
                              selectedSlot?.id === s.id 
                                ? "border-green-600 bg-green-50/50" 
                                : isFull 
                                ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            {isRecommended && !isFull && (
                              <span className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Recommended
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-xs font-bold">
                              <Clock size={12} className="text-slate-400" />
                              <span>{s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}</span>
                            </div>
                            <div className="text-[10px]">
                              {isFull ? (
                                <span className="text-red-500 font-semibold">Fully Booked</span>
                              ) : (
                                <span className="text-slate-500 font-medium">
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

            {/* Step 4: Crop Details */}
            {selectedCentre && selectedSlot && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="h-5 w-5 bg-green-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                  <span>{t("enter_crop_details")}</span>
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">{t("crop_type_label")}</label>
                    <select
                      value={cropType}
                      onChange={(e) => setCropType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
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
                      max="500"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={handleConfirmBooking}
                    disabled={loading}
                    className="w-full py-3 bg-green-700 hover:bg-green-800 text-white font-bold text-sm rounded-lg transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    <span>{loading ? "Generating Token..." : t("btn_confirm_booking")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Booking Summary Panel (Right side) */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 shadow space-y-4 text-xs">
              <h3 className="font-bold border-b border-slate-800 pb-2 text-[10px] uppercase text-slate-400 tracking-wider">
                Booking Summary Review
              </h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Mandi Centre</span>
                  <span className="font-bold">{selectedCentre ? selectedCentre.name : "Not selected"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Date</span>
                  <span className="font-bold">{date || "Not selected"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Time Slot</span>
                  <span className="font-bold">
                    {selectedSlot 
                      ? `${selectedSlot.start_time.substring(0, 5)} - ${selectedSlot.end_time.substring(0, 5)}` 
                      : "Not selected"
                    }
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Crop Specifications</span>
                  <span className="font-bold">{cropType} | Estimated Qty: {qty ? `${qty} qtl` : "Not specified"}</span>
                </div>
              </div>

              {selectedCentre && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Mandi Congestion:</span>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 font-bold rounded uppercase tracking-wide">
                      LOW
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Avg Service Time:</span>
                    <span className="text-slate-300 font-bold">{selectedCentre.avg_service_time_mins} minutes/farmer</span>
                  </div>
                </div>
              )}
            </div>

            {/* Smart info tip card */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-[10px] leading-relaxed flex gap-2">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Smart Booking Tip:</span>
                We recommend picking slots marked with the <span className="font-bold text-amber-600">RECOMMENDED</span> badge. These times have historically lower queues and will save you from waiting at the centre.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
