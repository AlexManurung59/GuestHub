'use client';

import {FormEvent,useState} from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./login.module.css";
import { LanguageSwitcher, useLanguage } from "../language-provider";


export default function LoginPage(){
    const { translate } = useLanguage();
    const [username,setUsername]=useState("");
    const [password, setPassword]=useState("");
    const[error,setError]=useState("");
    const[loading,setLoading]=useState(false);

    async function handleLogin(event:FormEvent<HTMLFormElement>){
        event.preventDefault();
        setError("");
        setLoading(true);

try{
    const response = await fetch("/api/auth/login",{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
        },
        body:JSON.stringify({
            username,
            password,
        }),
    });

    const responseText = await response.text();
    console.log("Login response status:",response.status);
    console.log("Login response body:",responseText);

    let data: {
        user?: { role?: unknown };
        error?: string;
        message?: string;
    } = {};
 try {
    data = responseText ? JSON.parse(responseText) : {};
 } catch(error) {
    console.error("Response is not valid JSON:", error);
    setError(
        `Server returned an invalid response.(${response.status})`
    );
    return;
    }
    if(!response.ok){
        setError(data.error || data.message || "Login failed");
        return;
    }

    const role =
        typeof data.user?.role === "string"
            ? data.user.role.trim().toUpperCase()
            : "";

    if(role === "ADMIN"){
        window.location.assign(new URL("/admin", window.location.origin).href);
    } else if (
        role === "USER"){
            window.location.assign(new URL("/user", window.location.origin).href);
        }else{
            setError("Unknown user role");
        }    
} catch(error){
    console.error("Login error:",error);
    setError("Something went wrong. Please try again.");
} finally{
    setLoading(false);
}
    }

    return (
        <main className={styles.loginPage}>
            <div className="position-absolute top-0 end-0 m-3" style={{ zIndex: 1 }}>
                <LanguageSwitcher />
            </div>
            <Image
                src="/aa.jpg"
                alt=""
                fill
                sizes="100vw"
                preload
                className={styles.backgroundImage}
                aria-hidden="true"
            />
            <div className={styles.backgroundOverlay} aria-hidden="true" />
            <section className={styles.loginPanel} aria-labelledby="login-title">
                <h1 id="login-title" className={styles.title}>
                    {translate("Masuk ke Akun", "Account Login")}
                </h1>
                <form onSubmit={handleLogin} className={styles.loginForm}>
                    <div className={styles.inputRow}>
                        <label htmlFor="username" className="visually-hidden">
                            {translate("Nama pengguna", "Username")}
                        </label>
                        <svg className={styles.fieldIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="8" r="3.5" />
                            <path d="M5 20c.5-3.3 3.2-5.5 7-5.5s6.5 2.2 7 5.5" />
                        </svg>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            placeholder={translate("Nama pengguna", "Username")}
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className={styles.inputRow}>
                        <label htmlFor="password" className="visually-hidden">
                            {translate("Kata sandi", "Password")}
                        </label>
                        <svg className={styles.fieldIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="6.5" y="10" width="11" height="9" rx="1.5" />
                            <path d="M9 10V7.5a3 3 0 0 1 6 0V10" />
                        </svg>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder={translate("Kata sandi", "Password")}
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    <div className={styles.formActions}>
                        {error && (
                            <div className={styles.errorMessage} role="alert">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={loading}
                        >
                            {loading
                                ? translate("Sedang masuk...", "Logging in...")
                                : translate("Masuk", "Login")}
                        </button>
                    </div>
                </form>
                <Link href="/" className={styles.homeLink}>
                    {translate("Kembali ke Beranda", "Back to Home")}
                </Link>
            </section>
        </main>
    );
}