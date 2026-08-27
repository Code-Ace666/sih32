"use client";

import React from "react";
import { useLanguage } from "../lib/LanguageContext";
import { 
  ArrowRight, CheckCircle2, UserPlus, Calendar, Clock, 
  MapPin, HelpCircle, ChevronRight, XCircle
} from "lucide-react";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="space-y-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-8 md:p-16 shadow-xl border border-slate-800 text-white flex flex-col lg:flex-row items-center gap-12">
        {/* Glow effect backgrounds */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex-1 space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-300 text-xs font-bold rounded-full border border-amber-500/20 shadow-inner">
            ★ Smart India Hackathon 2026 Initiative
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
            {t("hero_title")}
          </h2>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
            {t("hero_desc")}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
            <a
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-green-900/20 active:scale-95 hover:-translate-y-0.5 duration-200"
            >
              <UserPlus size={16} />
              <span>{t("btn_register")}</span>
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800/80 hover:bg-slate-850 border border-slate-700/85 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition backdrop-blur active:scale-95 duration-200"
            >
              <span>{t("btn_farmer_login")}</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>

        {/* Hero Right: Live Tracker Visualizer */}
        <div className="relative z-10 flex-1 flex justify-center w-full lg:w-auto">
          <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Queue Monitor</span>
              </div>
              <span className="text-[8px] bg-slate-850 px-2 py-0.5 rounded text-slate-400 font-bold border border-slate-800">Room: Patna Central</span>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Now Serving:</span>
                <span className="px-2.5 py-1 bg-green-900/50 text-green-300 font-extrabold border border-green-700/30 rounded-lg text-[10px]">
                  Token A-002
                </span>
              </div>
              <div className="p-3 bg-blue-900/30 border border-blue-700/30 rounded-xl flex items-center justify-between text-xs">
                <span className="text-blue-300 font-bold">Your Token:</span>
                <span className="px-2.5 py-1 bg-blue-600 text-white font-extrabold rounded-lg text-[10px] shadow-sm">
                  Token A-004
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-800/20 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Position Ahead</div>
                  <div className="text-lg font-black text-slate-200 mt-0.5">1 Farmer</div>
                </div>
                <div className="bg-slate-800/20 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Est. Waiting</div>
                  <div className="text-lg font-black text-slate-200 mt-0.5">8 Mins</div>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-center text-slate-500">
              Direct Bank Settlement notifications enabled
            </div>
          </div>
        </div>
      </section>

      {/* Before vs After Impact section */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h3 className="text-2xl font-black text-slate-900">Transforming Crop Procurement Operations</h3>
          <p className="text-xs text-slate-500">See how our digital platform resolves traditional Mandi congestion problems.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Before column */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 hover:shadow-md transition duration-300">
            <h4 className="font-extrabold text-sm text-red-600 flex items-center gap-2">
              <XCircle size={18} />
              <span>Before: Traditional Congested Mandi</span>
            </h4>
            <ul className="space-y-3.5 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-extrabold mt-0.5">✗</span>
                <span>Farmers arrive randomly, leading to massive physical tractor lines at gates.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-extrabold mt-0.5">✗</span>
                <span>Uncertain waiting times ranging from 4 to 12 hours under open weather.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-extrabold mt-0.5">✗</span>
                <span>Complete lack of queue visibility or timing transparency.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-extrabold mt-0.5">✗</span>
                <span>No notification system for turn alerts or weighing counter calls.</span>
              </li>
            </ul>
          </div>

          {/* After column */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 hover:shadow-md transition duration-300">
            <h4 className="font-extrabold text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>After: Smart Digital Queue System</span>
            </h4>
            <ul className="space-y-3.5 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="text-green-600 font-extrabold mt-0.5">✓</span>
                <span>Pre-scheduled slot booking dynamically restricts gate entries.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-600 font-extrabold mt-0.5">✓</span>
                <span>Targeted arrival windows reduce physical wait time to under 30 minutes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-600 font-extrabold mt-0.5">✓</span>
                <span>Live mobile dashboard shows exact position and estimated wait.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-600 font-extrabold mt-0.5">✓</span>
                <span>Automatic "Near Turn" alerts and SMS called-token notifications.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it Works Workflow Section */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h3 className="text-2xl font-black text-slate-900">{t("how_it_works")}</h3>
          <p className="text-xs text-slate-500">A clean 5-step digital path from profile setup to payout settlement.</p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { step: t("step1"), desc: t("step1_desc"), icon: <UserPlus className="text-green-700" size={20} /> },
            { step: t("step2"), desc: t("step2_desc"), icon: <Calendar className="text-green-700" size={20} /> },
            { step: t("step3"), desc: t("step3_desc"), icon: <Clock className="text-green-700" size={20} /> },
            { step: t("step4"), desc: t("step4_desc"), icon: <MapPin className="text-green-700" size={20} /> },
            { step: t("step5"), desc: t("step5_desc"), icon: <CheckCircle2 className="text-green-700" size={20} /> }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:shadow-lg hover:border-slate-300 transition duration-300">
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                {item.icon}
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-slate-800">{item.step}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-8 bg-slate-50 border border-slate-200/80 rounded-3xl p-6 md:p-10">
        <h3 className="text-2xl font-black text-center text-slate-900">{t("faq_title")}</h3>
        
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { q: t("faq1_q"), a: t("faq1_a") },
            { q: t("faq2_q"), a: t("faq2_a") },
            { q: t("faq3_q"), a: t("faq3_a") }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-2">
              <h4 className="font-extrabold text-xs text-slate-900 flex items-start gap-2">
                <HelpCircle size={16} className="text-green-700 shrink-0" />
                <span>{item.q}</span>
              </h4>
              <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Official Access Link Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h4 className="font-extrabold text-slate-900 text-sm">Are you a Mandi official or administrator?</h4>
          <p className="text-xs text-slate-500">Access the operator workspace or view global administrative reports.</p>
        </div>
        <a
          href="/login?staff=true"
          className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
        >
          <span>{t("btn_staff_login")}</span>
          <ChevronRight size={14} />
        </a>
      </section>
    </div>
  );
}
