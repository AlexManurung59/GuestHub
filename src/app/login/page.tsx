'use client';

import {FormEvent,useState} from "react";
import Link from "next/link";


export default function LoginPage(){
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

    return(
        <main className="container py-5">
            <div className="row justify-content-center">
<div className="col-md-5 col-lg-4">
<div className="card shadow">
<div className="card-body p-4">
<h2 className="text-center mb-4">
 Guest Visitor Admin and User Login
</h2>
<form onSubmit={handleLogin}>
    {/* Username */}
    <div className="mb-3">
        <label htmlFor="username"
        className="form-label">
Username
        </label>
        <input 
        id="username"
        type="text"
        className="form-control"
        value={username}
        onChange={(event)=>setUsername(event.target.value)} 
        placeholder="Enter username"
        required
        />
    </div>
{/* Password */}
<div className="mb-3">
    <label 
    htmlFor="password"
    className="form-label">
Password
    </label>


<input 
id="password"
type="password" 
className="form-control"
value={password}
onChange={(event)=>
    setPassword(event.target.value)
}
placeholder="Enter password"
required
/>
</div>
{/* Error */}
{error && (
    <div className="alert alert-danger">
        {error}
    </div>
)}

{/* Login button */}
<div className="d-flex flex-column gap-3">
    <button
        type="submit"
        className="btn btn-primary w-100"
        disabled={loading}
    >
        {loading ? "Logging in..." : "Login"}
    </button>
    <Link href="/hero" className="btn btn-primary w-100">
        Back to Home
    </Link>
</div>
</form>
</div>
</div>
</div>
            </div>
        </main>
    )
}