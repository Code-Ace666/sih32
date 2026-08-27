"use client";

import React, { useEffect, useState } from "react";
import "./globals.css";
import { LanguageProvider, useLanguage } from "../lib/LanguageContext";
import DemoControlPanel from "../components/DemoControlPanel";
import { Globe, LogOut, CheckCircle, Smartphone } from "lucide-react";
import { getCurrentUserLocal, clearAuthToken, User } from "../lib/api";

function MainLayout({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check auth on load
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
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased text-slate-800 bg-slate-50">
        {/* National Flag Color Accent Bar */}
        <div className="govt-accent-bar w-full" />

        {/* Government Top Bar Header */}
        <header className="govt-banner-bg text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Ashoka Emblem graphic placeholder */}
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold text-lg text-amber-500 border border-amber-500/20">
                स
              </div>
              <div className="text-center md:text-left">
                <span className="text-[10px] uppercase tracking-wider text-slate-300 block font-semibold leading-none">
                  {t("govt_title")} • भारत सरकार
                </span>
                <h1 className="text-base md:text-lg font-bold leading-tight mt-1">
                  {t("sub_title")}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Language switcher */}
              <button
                onClick={() => setLanguage(language === "en" ? "hi" : "en")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-xs font-semibold tracking-wide border border-white/10 transition"
              >
                <Globe size={14} className="text-amber-400" />
                <span>{t("lang_switch")}</span>
              </button>

              {/* Logged User Indicator */}
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <span className="block font-bold text-white leading-none">{currentUser.name}</span>
                    <span className="text-[9px] uppercase font-bold text-amber-400 block tracking-wider mt-0.5">{currentUser.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-2 bg-red-600/30 hover:bg-red-600/50 text-red-200 hover:text-white rounded-md border border-red-500/20 transition"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <a
                  href="/login"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold rounded-md transition"
                >
                  {t("nav_login")}
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
          {children}
        </main>

        {/* Government Footer */}
        <footer className="bg-slate-900 text-slate-400 text-xs py-6 mt-12 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left space-y-1">
              <p className="font-semibold text-slate-300">
                Department of Consumer Affairs (DoCA) • Ministry of Consumer Affairs, Food & Public Distribution
              </p>
              <p className="text-[10px] text-slate-500">
                Designed and Developed for Smart India Hackathon (SIH 2026) • Problem Statement: SIH26032
              </p>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:underline hover:text-slate-200">Privacy Policy</a>
              <a href="#" className="hover:underline hover:text-slate-200">Terms of Service</a>
              <a href="#" className="hover:underline hover:text-slate-200">Help Desk Support</a>
            </div>
          </div>
        </footer>

        {/* Demo floating panel overlay */}
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
