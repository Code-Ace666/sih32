"use client";

import React from "react";
import { useLanguage } from "../lib/LanguageContext";
import { 
  ArrowRight, CheckCircle2, UserPlus, Calendar, Clock, 
  MapPin, CreditCard, ChevronRight, HelpCircle, FileText 
} from "lucide-react";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-12 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
            ★ SIH 2026 Initiative
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t("hero_title")}
          </h2>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            {t("hero_desc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <a
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg transition shadow-md"
            >
              <UserPlus size={18} />
              <span>{t("btn_register")}</span>
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-lg transition"
            >
              <span>{t("btn_farmer_login")}</span>
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <div className="hidden md:flex flex-1 justify-center">
          {/* Simple Vector Mockup Graphic for Queue */}
          <div className="w-80 h-64 bg-slate-100 border border-slate-200 rounded-xl p-4 flex flex-col justify-between relative shadow-inner overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Live Queue Tracker</span>
              <span className="h-2 w-2 bg-green-500 rounded-full animate-ping" />
            </div>
            
            <div className="space-y-2 py-4">
              <div className="bg-white border border-slate-200 rounded p-2 flex items-center justify-between text-xs">
                <span className="font-bold">Now Serving:</span>
                <span className="px-2 py-0.5 bg-green-150 text-green-800 font-bold border border-green-200 rounded text-[10px]">
                  Token A-002
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-2 flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900">Your Token:</span>
                <span className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded text-[10px]">
                  Token A-004
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                <div className="bg-white border border-slate-200 rounded p-1 text-center">
                  <div className="font-semibold text-slate-400 uppercase">Pos Ahead</div>
                  <div className="text-sm font-extrabold text-slate-800">1 Farmer</div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-1 text-center">
                  <div className="font-semibold text-slate-400 uppercase">Est. Wait</div>
                  <div className="text-sm font-extrabold text-slate-800">8 Mins</div>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-center text-slate-400">
              Direct Bank Settlement tracking active
            </div>
          </div>
        </div>
      </section>

      {/* Before vs After Presentation Card */}
      <section className="bg-slate-900 text-white rounded-xl p-6 md:p-8 shadow-md">
        <h3 className="text-xl font-bold mb-6 text-center border-b border-slate-800 pb-4 text-amber-400">
          Transforming Crop Procurement Operations
        </h3>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Before column */}
          <div className="bg-slate-800/50 border border-red-500/20 rounded-lg p-5 space-y-4">
            <h4 className="font-bold text-red-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Before: Traditional Congested Mandi
            </h4>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex gap-2">
                <span className="text-red-500 font-bold">✗</span>
                Farmers arrive randomly, leading to massive physical congestion at gates.
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 font-bold">✗</span>
                Uncertain waiting times ranging from 4 to 12 hours under open weather.
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 font-bold">✗</span>
                Complete lack of queue visibility or timing transparency.
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 font-bold">✗</span>
                No notification system for turn alerts or weighing calls.
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 font-bold">✗</span>
                Manual billing and tracking make payment status opaque.
              </li>
            </ul>
          </div>

          {/* After column */}
          <div className="bg-slate-800/50 border border-green-500/20 rounded-lg p-5 space-y-4">
            <h4 className="font-bold text-green-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              After: Smart Digital Queue System
            </h4>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex gap-2">
                <span className="text-green-500 font-bold">✓</span>
                Pre-scheduled slot booking dynamically restricts gate entries.
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 font-bold">✓</span>
                Targeted arrival windows reduce physical wait time to under 30 minutes.
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 font-bold">✓</span>
                Live mobile dashboard shows exact position and estimated wait.
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 font-bold">✓</span>
                Automatic "Near Turn" alerts and SMS called-token notifications.
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 font-bold">✓</span>
                Instant weighing slip generation and automated bank transfer tracking.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it Works Workflow Section */}
      <section className="space-y-8">
        <h3 className="text-2xl font-bold text-center text-slate-800">
          {t("how_it_works")}
        </h3>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 hover:shadow-md transition">
            <h4 className="font-bold text-sm text-green-700">{t("step1")}</h4>
            <p className="text-xs text-slate-500">{t("step1_desc")}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 hover:shadow-md transition">
            <h4 className="font-bold text-sm text-green-700">{t("step2")}</h4>
            <p className="text-xs text-slate-500">{t("step2_desc")}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 hover:shadow-md transition">
            <h4 className="font-bold text-sm text-green-700">{t("step3")}</h4>
            <p className="text-xs text-slate-500">{t("step3_desc")}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 hover:shadow-md transition">
            <h4 className="font-bold text-sm text-green-700">{t("step4")}</h4>
            <p className="text-xs text-slate-500">{t("step4_desc")}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 hover:shadow-md transition">
            <h4 className="font-bold text-sm text-green-700">{t("step5")}</h4>
            <p className="text-xs text-slate-500">{t("step5_desc")}</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-6">
        <h3 className="text-2xl font-bold text-center text-slate-800">
          {t("faq_title")}
        </h3>
        
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
            <h4 className="font-bold text-sm text-slate-900 flex items-start gap-2">
              <HelpCircle size={16} className="text-green-700 shrink-0 mt-0.5" />
              <span>{t("faq1_q")}</span>
            </h4>
            <p className="text-xs text-slate-500 pl-6 leading-relaxed">
              {t("faq1_a")}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
            <h4 className="font-bold text-sm text-slate-900 flex items-start gap-2">
              <HelpCircle size={16} className="text-green-700 shrink-0 mt-0.5" />
              <span>{t("faq2_q")}</span>
            </h4>
            <p className="text-xs text-slate-500 pl-6 leading-relaxed">
              {t("faq2_a")}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
            <h4 className="font-bold text-sm text-slate-900 flex items-start gap-2">
              <HelpCircle size={16} className="text-green-700 shrink-0 mt-0.5" />
              <span>{t("faq3_q")}</span>
            </h4>
            <p className="text-xs text-slate-500 pl-6 leading-relaxed">
              {t("faq3_a")}
            </p>
          </div>
        </div>
      </section>

      {/* Official Access Link Banner */}
      <section className="bg-slate-100 border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-slate-900">Are you a Procurement Centre Operator or Admin?</h4>
          <p className="text-xs text-slate-500">Access the operator desk or the department operations dashboard.</p>
        </div>
        <a
          href="/login?staff=true"
          className="inline-flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
        >
          <span>{t("btn_staff_login")}</span>
          <ChevronRight size={14} />
        </a>
      </section>
    </div>
  );
}
