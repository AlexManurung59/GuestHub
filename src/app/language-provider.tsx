"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

type Language = "id" | "en";

type TranslationKey =
  | "heroTitle"
  | "heroDescription"
  | "registerNow"
  | "visitorRegistration"
  | "welcome"
  | "loginAsUser"
  | "fullName"
  | "fullNamePlaceholder"
  | "visitorType"
  | "guestVisitor"
  | "seafarerVisitor"
  | "company"
  | "companyPlaceholder"
  | "rank"
  | "selectRank"
  | "position"
  | "positionPlaceholder"
  | "purpose"
  | "purposePlaceholder"
  | "phone"
  | "phonePlaceholder"
  | "division"
  | "selectDivision"
  | "pic"
  | "selectPIC"
  | "register"
  | "required"
  | "successTitle"
  | "successMessage"
  | "formIntro"
  | "backHome"
  | "languageLabel";

const translations: Record<Language, Record<TranslationKey, string>> = {
  id: {
    heroTitle: "Selamat datang di",
    heroDescription: "Silakan daftar kunjungan Anda sebelum melanjutkan ke area kami.",
    registerNow: "Daftar Sekarang",
    visitorRegistration: "Registrasi Pengunjung",
    welcome: "Selamat datang di MCS Internasional. Silakan daftarkan kunjungan Anda.",
    fullName: "Nama Lengkap",
    fullNamePlaceholder: "Masukkan nama lengkap",
    loginAsUser:"Masuk sebagai user",
    visitorType: "Jenis pengunjung",
    guestVisitor: "Tamu",
    seafarerVisitor: "Pelaut",
    company: "Nama perusahaan / instansi",
    companyPlaceholder: "Masukkan nama perusahaan / instansi",
    rank: "Rank",
    selectRank: "Pilih rank",
    position: "Jabatan",
    positionPlaceholder: "Masukkan jabatan Anda",
    purpose: "Keperluan",
    purposePlaceholder: "Masukkan keperluan kunjungan",
    phone: "Nomor HP",
    phonePlaceholder: "Masukkan nomor HP",
    division: "Divisi",
    selectDivision: "Pilih divisi",
    pic: "PIC",
    selectPIC: "Pilih PIC",
    register: "Daftar",
    required: "Mohon lengkapi semua data yang wajib diisi.",
    successTitle: "Registrasi berhasil",
    successMessage: "Data kunjungan Anda sudah tercatat. Silakan hubungi petugas kami.",
    formIntro: "Isi data berikut untuk mendapatkan akses kunjungan.",
    backHome: "Kembali ke beranda",
    languageLabel: "English",
  },
  en: {
    heroTitle: "Welcome to",
    heroDescription: "Please register your visit before entering our premises.",
    registerNow: "Register Now",
    visitorRegistration: "Visitor Registration",
    loginAsUser:"Login as User",
    welcome: "Welcome to MCS Internasional. Please register your visit.",
    fullName: "Full Name",
    fullNamePlaceholder: "Enter your full name",
    visitorType: "Visitor type",
    guestVisitor: "Guest",
    seafarerVisitor: "Seafarer",
    company: "Company / institution name",
    companyPlaceholder: "Enter your company or institution name",
    rank: "Rank",
    selectRank: "Select rank",
    position: "Position",
    positionPlaceholder: "Enter your position",
    purpose: "Purpose",
    purposePlaceholder: "Enter the purpose",
    phone: "Phone Number",
    phonePlaceholder: "Enter your phone",
    division: "Division",
    selectDivision: "Select a division",
    pic: "PIC",
    selectPIC: "Select a PIC",
    register: "Register",
    required: "Please complete all required fields.",
    successTitle: "Registration successful",
    successMessage: "Your visit has been recorded. Please contact our staff.",
    formIntro: "Complete the details below to request visitor access.",
    backHome: "Back to home",
    languageLabel: "Indonesia",
  },
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const languageListeners = new Set<() => void>();

function getStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return "id";
  }

  const savedLanguage = window.localStorage.getItem("language");
  return savedLanguage === "en" ? "en" : "id";
}

function subscribeToLanguage(listener: () => void) {
  languageListeners.add(listener);
  return () => languageListeners.delete(listener);
}

function setStoredLanguage(language: Language) {
  window.localStorage.setItem("language", language);
  languageListeners.forEach((listener) => listener());
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getStoredLanguage,
    () => "id" as Language,
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setStoredLanguage, t: (key) => translations[language][key] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const nextLanguage = language === "id" ? "en" : "id";

  return (
    <button
      type="button"
      className="btn btn-light btn-sm shadow-sm"
      onClick={() => setLanguage(nextLanguage)}
      aria-label={`Switch language to ${t("languageLabel")}`}
    >
      {language === "id" ? "ID" : "EN"} / {language === "id" ? "EN" : "ID"}
    </button>
  );
}
