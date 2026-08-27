"use client";

import React, { useEffect, useState } from "react";
import "./globals.css";
import { LanguageProvider, useLanguage } from "../lib/LanguageContext";
import DemoControlPanel from "../components/DemoControlPanel";
import { Globe, LogOut, User, Landmark } from "lucide-react";
import { getCurrentUserLocal, clearAuthToken, User as UserType } from "../lib/api";

function MainLayout({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  useEffect(() => {
    const user = getCurrentUserLocal();
    setCurrentUser(user);
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    window.location.href = "/";
  };

  return (
    <html lang={language}>
      <head>
        <title>Smart Farmer Procurement Platform (SIH26032)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          body {
            font-family: 'Inter', sans-serif;
          }
        `}</style>
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50/50 text-slate-800 selection:bg-green-100 selection:text-green-800">
        {/* National Flag Color Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-white to-green-600 shadow-sm" />

        {/* Top Mini Header for Govt Registry Link */}
        <div className="bg-slate-900 text-[10px] text-slate-400 py-1.5 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-wide">MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hover:text-slate-200 cursor-pointer transition">GOVERNMENT OF INDIA (भारत सरकार)</span>
            </div>
          </div>
        </div>

        {/* Main Navigation Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            
            {/* Logo Brand Panel */}
            <a href="/" className="flex items-center gap-3 group transition">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-950 flex items-center justify-center text-white shadow-md shadow-blue-900/10 group-hover:scale-105 transition-transform duration-300">
                <Landmark size={20} className="text-amber-400" />
              </div>
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block leading-none">
                  {t("govt_title")}
                </span>
                <h1 className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight mt-0.5 group-hover:text-blue-900 transition-colors">
                  Smart Farmer Procurement
                </h1>
              </div>
            </a>

            {/* Controls panel */}
            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <button
                onClick={() => setLanguage(language === "en" ? "hi" : "en")}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
              >
                <Globe size={14} className="text-blue-900" />
                <span>{t("lang_switch")}</span>
              </button>

              {/* Login/Dashboard Actions */}
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <a
                    href={currentUser.role === "FARMER" ? "/farmer" : currentUser.role === "CENTRE_OPERATOR" ? "/operator" : "/admin"}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-900 transition"
                  >
                    <User size={14} />
                    <span className="hidden md:inline">{currentUser.name}</span>
                  </a>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl transition"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <a
                  href="/login"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-900/10 hover:shadow-blue-900/20"
                >
                  {t("nav_login")}
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Pane */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 text-xs py-8 mt-16 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-1.5">
              <p className="font-bold text-slate-200">
                Department of Consumer Affairs (DoCA) • Ministry of Consumer Affairs, Food & Public Distribution
              </p>
              <p className="text-[10px] text-slate-500">
                Designed & Engineered for Smart India Hackathon (SIH 2026) • Problem Statement ID: SIH26032
              </p>
            </div>
            <div className="flex items-center gap-6 font-semibold">
              <a href="#" className="hover:underline hover:text-slate-200 transition">Privacy Policy</a>
              <a href="#" className="hover:underline hover:text-slate-200 transition">Terms of Service</a>
              <a href="#" className="hover:underline hover:text-slate-200 transition">Help Desk</a>
            </div>
          </div>
        </footer>

        {/* Demo Controller Widget */}
        <DemoControlPanel />
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <MainLayout>{children}</MainLayout>
    </LanguageProvider>
  );
}
