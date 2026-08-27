"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "hi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // General
    govt_title: "Department of Consumer Affairs",
    sub_title: "Smart Farmer Procurement Queue & Tracking Platform",
    nav_home: "Home",
    nav_dashboard: "Dashboard",
    nav_book: "Book Slot",
    nav_logout: "Logout",
    nav_login: "Login",
    nav_register: "Register",
    lang_switch: "हिंदी",
    
    // Landing Page
    hero_title: "Direct crop procurement made simple, transparent, and queue-free.",
    hero_desc: "Book your procurement slots online, check live queue status, and track your crop weights and payments direct to your bank account.",
    btn_farmer_login: "Farmer Portal",
    btn_staff_login: "Official Login",
    btn_register: "Register as Farmer",
    
    // Steps
    how_it_works: "How It Works",
    step1: "1. Register Profile",
    step1_desc: "Register with your mobile number, address, and Farmer Registration ID.",
    step2: "2. Book a Slot",
    step2_desc: "Select your nearest procurement centre, choose a date, and select an available time window.",
    step3: "3. Track Live Queue",
    step3_desc: "Monitor estimated waiting times and position from home or en route to the centre.",
    step4: "4. Fast Procurement",
    step4_desc: "Arrive on time, check in, complete crop weighing and moisture checking without waiting in long queues.",
    step5: "5. Track Payment",
    step5_desc: "Receive real-time notifications on bank settlement status and transactions.",

    // Farmer Dashboard
    welcome: "Welcome",
    no_active_bookings: "No active slot bookings found. Please book a procurement slot to continue.",
    btn_book_slot: "Book Procurement Slot",
    active_booking_title: "Your Active Booking",
    token_no: "Token Number",
    queue_pos: "Queue Position",
    est_wait: "Est. Waiting Time",
    minutes: "minutes",
    status_label: "Status",
    centre_label: "Procurement Centre",
    date_label: "Booking Date",
    slot_label: "Time Window",
    crop_label: "Crop Type",
    qty_label: "Approx. Quantity",
    quintal: "Quintal",
    btn_im_here: "I am at the Centre (Check In)",
    btn_cancel_booking: "Cancel Booking",
    checked_in_msg: "You are checked in! Please wait near the counter until your token is called.",
    called_msg: "Your token is being called! Please proceed to the weighing scale immediately.",
    
    // Notifications & SMS
    notifications_title: "Recent Alerts & Notification Inbox",
    sms_log_title: "Mock SMS Gateway Log (Phone Sim)",
    no_notifications: "No alerts in your inbox.",

    // History
    history_title: "Your Procurement & Payment History",
    history_empty: "No past procurements recorded.",
    col_date: "Date",
    col_centre: "Centre",
    col_crop: "Crop & Variety",
    col_qty: "Weighed Qty",
    col_amount: "Net Amount",
    col_status: "Procurement",
    col_payment: "Payment Status",

    // Booking Page
    book_header: "Book Crop Procurement Slot",
    select_centre: "1. Choose Procurement Centre",
    select_date: "2. Choose Date",
    select_slot: "3. Choose Available Time Window",
    enter_crop_details: "4. Enter Crop Details",
    search_dist: "Search District...",
    search_block: "Search Block...",
    btn_search: "Search Centres",
    slots_available: "slots available",
    crop_type_label: "Select Crop Type",
    paddy: "Paddy (धान)",
    wheat: "Wheat (गेहूँ)",
    qty_est: "Estimated Quantity (in Quintals)",
    btn_confirm_booking: "Confirm & Generate Token",
    booking_success: "Booking Successful!",

    // FAQ
    faq_title: "Frequently Asked Questions",
    faq1_q: "How does the token system work?",
    faq1_a: "When you book a slot, you get a unique Token (e.g. A-024). Once you arrive at the centre, click 'Check In'. You will be added to the live active queue. The operator calls tokens sequentially, which updates your position in real-time.",
    faq2_q: "What documents do I need to bring?",
    faq2_a: "Please carry your original Farmer Registration Certificate, Aadhar Card, and a sample of your crop for moisture grading.",
    faq3_q: "How long does payment settlement take?",
    faq3_a: "Once procurement is completed by the operator, the bank settlement process is initiated immediately. You can track progress from your dashboard."
  },
  hi: {
    // General
    govt_title: "उपभोक्ता मामले विभाग",
    sub_title: "स्मार्ट किसान खरीद कतार और ट्रैकिंग प्लेटफॉर्म",
    nav_home: "मुख्य पृष्ठ",
    nav_dashboard: "डैशबोर्ड",
    nav_book: "स्लॉट बुक करें",
    nav_logout: "लॉगआउट",
    nav_login: "लॉगिन",
    nav_register: "पंजीकरण",
    lang_switch: "English",

    // Landing Page
    hero_title: "फसल खरीद अब हुई आसान, पारदर्शी और कतार-मुक्त।",
    hero_desc: "ऑनलाइन खरीद स्लॉट बुक करें, लाइव कतार स्थिति देखें, और अपनी फसल के वजन और भुगतान को सीधे अपने बैंक खाते में ट्रैक करें।",
    btn_farmer_login: "किसान पोर्टल",
    btn_staff_login: "अधिकारी लॉगिन",
    btn_register: "किसान पंजीकरण",

    // Steps
    how_it_works: "यह कैसे काम करता है",
    step1: "1. प्रोफाइल पंजीकृत करें",
    step1_desc: "अपने मोबाइल नंबर, पते और किसान पंजीकरण आईडी के साथ पंजीकरण करें।",
    step2: "2. स्लॉट बुक करें",
    step2_desc: "अपने नजदीकी खरीद केंद्र का चयन करें, एक तारीख और उपलब्ध समय खिड़की चुनें।",
    step3: "3. लाइव कतार ट्रैक करें",
    step3_desc: "घर बैठे या केंद्र के रास्ते में अनुमानित प्रतीक्षा समय और स्थिति की निगरानी करें।",
    step4: "4. त्वरित खरीद प्रक्रिया",
    step4_desc: "समय पर पहुंचें, चेक-इन करें, लंबी कतारों में इंतजार किए बिना वजन और नमी की जांच पूरी करें।",
    step5: "5. भुगतान ट्रैक करें",
    step5_desc: "बैंक भुगतान और लेनदेन की स्थिति पर वास्तविक समय में सूचनाएं प्राप्त करें।",

    // Farmer Dashboard
    welcome: "आपका स्वागत है",
    no_active_bookings: "कोई सक्रिय स्लॉट बुकिंग नहीं मिली। जारी रखने के लिए कृपया एक खरीद स्लॉट बुक करें।",
    btn_book_slot: "खरीद स्लॉट बुक करें",
    active_booking_title: "आपकी सक्रिय बुकिंग",
    token_no: "टोकन नंबर",
    queue_pos: "कतार में स्थिति",
    est_wait: "अनुमानित प्रतीक्षा समय",
    minutes: "मिनट",
    status_label: "स्थिति",
    centre_label: "खरीद केंद्र",
    date_label: "बुकिंग की तारीख",
    slot_label: "समय अंतराल",
    crop_label: "फसल का प्रकार",
    qty_label: "अनुमानित मात्रा",
    quintal: "क्विंटल",
    btn_im_here: "मैं केंद्र पर हूँ (चेक इन करें)",
    btn_cancel_booking: "बुकिंग रद्द करें",
    checked_in_msg: "आप चेक-इन हो चुके हैं! जब तक आपका टोकन न बुलाया जाए, कृपया काउंटर के पास प्रतीक्षा करें।",
    called_msg: "आपका टोकन बुलाया जा रहा है! कृपया तुरंत वजन कांटे पर पहुंचें।",

    // Notifications & SMS
    notifications_title: "हालिया अलर्ट और सूचना इनबॉक्स",
    sms_log_title: "मॉक एसएमएस गेटवे लॉग (फ़ोन सिमुलेटर)",
    no_notifications: "आपके इनबॉक्स में कोई अलर्ट नहीं हैं।",

    // History
    history_title: "आपकी पिछली खरीद और भुगतान का इतिहास",
    history_empty: "कोई पिछला खरीद रिकॉर्ड नहीं मिला।",
    col_date: "दिनांक",
    col_centre: "केंद्र",
    col_crop: "फसल और किस्म",
    col_qty: "तौला गया वजन",
    col_amount: "कुल भुगतान राशि",
    col_status: "खरीद स्थिति",
    col_payment: "भुगतान स्थिति",

    // Booking Page
    book_header: "फसल खरीद स्लॉट बुक करें",
    select_centre: "1. खरीद केंद्र चुनें",
    select_date: "2. दिनांक चुनें",
    select_slot: "3. उपलब्ध समय अंतराल चुनें",
    enter_crop_details: "4. फसल का विवरण दर्ज करें",
    search_dist: "जिला खोजें...",
    search_block: "प्रखंड खोजें...",
    btn_search: "केंद्र खोजें",
    slots_available: "स्लॉट उपलब्ध",
    crop_type_label: "फसल प्रकार चुनें",
    paddy: "धान (Paddy)",
    wheat: "गेहूँ (Wheat)",
    qty_est: "अनुमानित मात्रा (क्विंटल में)",
    btn_confirm_booking: "पुष्टि करें और टोकन बनाएं",
    booking_success: "बुकिंग सफल रही!",

    // FAQ
    faq_title: "अक्सर पूछे जाने वाले प्रश्न",
    faq1_q: "टोकन प्रणाली कैसे काम करती है?",
    faq1_a: "जब आप स्लॉट बुक करते हैं, तो आपको एक विशिष्ट टोकन (जैसे A-024) मिलता है। केंद्र पर पहुंचने पर, 'चेक इन' पर क्लिक करें। आपको लाइव सक्रिय कतार में जोड़ दिया जाएगा। ऑपरेटर टोकन को क्रमानुसार बुलाते हैं, जिससे आपकी स्थिति वास्तविक समय में अपडेट होती है।",
    faq2_q: "मुझे अपने साथ कौन से दस्तावेज लाने होंगे?",
    faq2_a: "कृपया अपना मूल किसान पंजीकरण प्रमाणपत्र, आधार कार्ड और नमी की जांच के लिए अपनी फसल का एक नमूना साथ लाएं।",
    faq3_q: "भुगतान के निपटान में कितना समय लगता है?",
    faq3_a: "एक बार ऑपरेटर द्वारा खरीद पूरी कर ली जाने के बाद, बैंक निपटान प्रक्रिया तुरंत शुरू हो जाती है। आप अपने डैशबोर्ड से प्रगति को ट्रैक कर सकते हैं।"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("procurement_language") as Language;
    if (saved === "en" || saved === "hi") {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("procurement_language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
