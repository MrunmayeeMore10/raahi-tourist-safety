import React, { useState, useMemo, useEffect } from "react";
import { apiLogin, apiRegister } from "./apiService";

/* ── Helper: read a file as data-URL (for passport photo & ID upload) ── */
function readFile(f, cb, maxPx) {
  if (!f) return cb("", "");
  const done = (url) => cb(f.name, url);
  if (f.type && f.type.indexOf("image/") === 0) {
    const img = new Image();
    const obj = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, (maxPx || 1000) / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(obj);
      done(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(obj); done(""); };
    img.src = obj;
    return;
  }
  const r = new FileReader();
  r.onload = () => done(r.result);
  r.readAsDataURL(f);
}

/* ── Location helpers (used by login flow) ── */
function loadLoc() { try { return JSON.parse(localStorage.getItem("raahi_location") || "null"); } catch { return null; } }
function saveLoc(o) { try { localStorage.setItem("raahi_location", JSON.stringify(o)); } catch {} }
function askLoc(cb) {
  const fail = () => {
    try { localStorage.setItem("raahi_loc_permission", "denied"); } catch {}
    cb();
  };
  if (!navigator.geolocation) return fail();
  navigator.geolocation.getCurrentPosition(
    (p) => {
      const o = {
        status: "allowed",
        lat: p.coords.latitude,
        lon: p.coords.longitude,
        lng: p.coords.longitude,
        accuracy: Math.round(p.coords.accuracy || 15),
        updatedAt: new Date().toISOString()
      };
      saveLoc(o);
      try { localStorage.setItem("raahi_loc_permission", "allowed"); } catch {}
      cb(o);
    },
    fail,
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

/* ── Inline SVG icons ── */
function Eye({ off }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx={12} cy={12} r={3} />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx={12} cy={8} r={4} />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

/* ── Reusable form primitives ── */
function Field({ id, label, children }) {
  return <div className="login-f">{label && <label htmlFor={id} className="login-label">{label}</label>}{children}</div>;
}

function PasswordInput({ id, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="login-in">
      <input id={id} type={show ? "text" : "password"} value={value} placeholder={placeholder} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="login-ico" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>
        <Eye off={show} />
      </button>
    </div>
  );
}

/* ── Constants & Storage Keys ── */
export const USERS_KEY = "raahi_users";
export const ACTIVE_PROFILE_KEY = "raahi_profile";
export const LOGGED_IN_KEY = "raahi_logged_in";

export const DEMO_USER = {
  name: "Demo User",
  username: "demo",
  email: "demo@raahi.app",
  phone: "9876543210",
  country: "India",
  address: "123 Demo Street, Mumbai, Maharashtra 400001",
  emergency: "9876543211",
  phoneCode: "+91",
  emgCode: "+91",
  medical: "None",
  gender: "Prefer not to say",
  idType: "Passport",
  idFile: "",
  idImg: "",
  photo: "",
  password: "demo123"
};

const EMPTY_PROFILE = {
  name: "", username: "", gender: "", email: "", phone: "", country: "India", address: "", emergency: "",
  phoneCode: "+91", emgCode: "+91", medical: "", idType: "Passport", idFile: "", idImg: "", photo: "", password: ""
};

export function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {}
}

export function initUsers() {
  let users = getUsers();
  let changed = false;

  // Import existing legacy profile if present
  try {
    const legacy = JSON.parse(localStorage.getItem(ACTIVE_PROFILE_KEY) || "null");
    if (legacy && (legacy.name || legacy.email || legacy.password)) {
      const exists = users.some(u =>
        (legacy.email && u.email && u.email.toLowerCase() === legacy.email.toLowerCase()) ||
        (legacy.name && u.name && u.name.toLowerCase() === legacy.name.toLowerCase()) ||
        (legacy.username && u.username && u.username.toLowerCase() === legacy.username.toLowerCase())
      );
      if (!exists) {
        users.push({
          ...legacy,
          username: legacy.username || legacy.name || legacy.email || "user",
          password: legacy.password || localStorage.getItem("raahi_password") || "demo123"
        });
        changed = true;
      }
    }
  } catch {}

  const hasDemo = users.some(u =>
    (u.username && u.username.toLowerCase() === "demo") ||
    (u.email && u.email.toLowerCase() === "demo@raahi.app") ||
    (u.name && u.name.toLowerCase() === "demo user")
  );
  if (!hasDemo) {
    users.unshift(DEMO_USER);
    changed = true;
  }

  if (changed || users.length === 0) {
    if (users.length === 0) users = [DEMO_USER];
    saveUsers(users);
  }
  return users;
}

const COUNTRIES = ["India","United States","United Kingdom","Canada","Australia","United Arab Emirates","Singapore","Germany","France","Other"];
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const validEmail = (e) => EMAIL_RE.test(e) && !/\.\./.test(e);
const validPhone = (n) => /^\d{10}$/.test(n);
const CODES = [["+91","IN"],["+1","US/CA"],["+44","UK"],["+61","AU"],["+971","AE"],["+65","SG"],["+49","DE"],["+33","FR"]];
const COUNTRY_CODE = { India:"+91","United States":"+1","United Kingdom":"+44",Canada:"+1",Australia:"+61","United Arab Emirates":"+971",Singapore:"+65",Germany:"+49",France:"+33" };
const codeFor = (country, cur) => COUNTRY_CODE[country] || cur;
const GENDERS = ["Female","Male","Other","Prefer not to say"];
const ID_TYPES = ["Passport","Aadhaar Card","Driving Licence","Voter ID","PAN Card"];
const options = (list) => list.map((c) => <option key={c}>{c}</option>);

function PhoneField({ id, label, code, num, onCode, onNum }) {
  return (
    <div className="login-f">
      <label htmlFor={id} className="login-label">{label}</label>
      <div className="login-phone-row">
        <select aria-label={label + " country code"} value={code} onChange={(e) => onCode(e.target.value)}>
          {CODES.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
        </select>
        <input id={id} type="tel" inputMode="numeric" maxLength={10} value={num} placeholder="10-digit number" autoComplete="tel-national" onChange={(e) => onNum(e.target.value.replace(/\D/g, "").slice(0, 10))} />
      </div>
    </div>
  );
}

/* ── Login Form ── */
function LoginForm({ go, notify, onLogin }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [rem, setRem] = useState(false);

  const submit = async () => {
    const inputUser = u.trim();
    const inputPw = p;

    if (!inputUser || !inputPw) {
      return notify("Enter your username and password.");
    }

    try {
      const res = await apiLogin(inputUser, inputPw);
      if (res.ok && res.raw?.user) {
        const authedUser = { ...res.raw.user, password: inputPw };
        localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(authedUser));
        localStorage.setItem("raahi_password", inputPw);
        localStorage.setItem(LOGGED_IN_KEY, "true");
        notify(`Welcome back, ${authedUser.name || "Traveler"}!`);
        onLogin(authedUser);
        return;
      } else if (!res.offline && !res.backendMissing && res.status !== 405 && res.status !== 404 && res.error) {
        return notify(res.error || "Incorrect username or password. Please try again.");
      }
    } catch {}

    const users = initUsers();
    const lower = inputUser.toLowerCase();
    const phoneClean = inputUser.replace(/\D/g, "");

    const existing = users.find((account) => {
      const accName = (account.name || "").trim().toLowerCase();
      const accUser = (account.username || "").trim().toLowerCase();
      const accEmail = (account.email || "").trim().toLowerCase();
      const accPhone = (account.phone || "").replace(/\D/g, "");

      return (
        (accUser && accUser === lower) ||
        (accEmail && accEmail === lower) ||
        (accName && accName === lower) ||
        (phoneClean.length >= 7 && accPhone && accPhone === phoneClean)
      );
    });

    if (existing) {
      if (existing.password && existing.password !== inputPw) {
        return notify("Incorrect password. Please try again.");
      }
      const activeUser = { ...existing };
      if (!activeUser.password) activeUser.password = inputPw;
      localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(activeUser));
      localStorage.setItem("raahi_password", inputPw);
      localStorage.setItem(LOGGED_IN_KEY, "true");
      onLogin(activeUser);
      return;
    }

    // Do NOT auto-register unregistered users on login. Require an account to exist.
    return notify("Account not found. Please click 'Create an Account' below to sign up.");
  };

  return (
    <div className="login-card">
      <h1>Welcome</h1>
      <p className="login-sub">Here you log in securely</p>
      <Field id="lu" label="Username">
        <div className="login-in">
          <input id="lu" value={u} placeholder="Enter your username or email" autoComplete="username" onChange={(e) => setU(e.target.value)} />
          <span className="login-ico" aria-hidden="true"><UserIcon /></span>
        </div>
      </Field>
      <Field id="lp" label="Password">
        <PasswordInput id="lp" value={p} onChange={setP} placeholder="Enter your password" />
      </Field>
      <div className="login-row">
        <label><input type="checkbox" checked={rem} onChange={(e) => setRem(e.target.checked)} /> Remember me</label>
        <a href="#" onClick={(e) => { e.preventDefault(); notify("Password reset link will be sent to your email."); }}>Forgot password?</a>
      </div>
      <button className="login-btn login-btn-pri" onClick={submit}>Log In</button>
      <button className="login-btn login-btn-out" onClick={() => go("details")}>Sign Up</button>
      <p className="login-foot">Don't have an account? <button onClick={() => go("details")}>Create an Account</button></p>
    </div>
  );
}

/* ── Login Card wrapper (adds location permission modal) ── */
function LoginCard(props) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeUser, setActiveUser] = useState(null);

  const finish = (user) => {
    const finalUser = user || activeUser || props.data || DEMO_USER;
    props.onFinishLogin(finalUser);
  };
  const allow = () => {
    setBusy(true);
    askLoc(() => finish(activeUser));
  };
  const deny = () => {
    try { localStorage.setItem("raahi_loc_permission", "denied"); } catch {}
    finish(activeUser);
  };

  return (
    <>
      <LoginForm
        {...props}
        onLogin={(authedUser) => {
          setActiveUser(authedUser);
          const loc = loadLoc();
          if (loc && loc.status) {
            finish(authedUser);
          } else {
            setAsk(true);
          }
        }}
      />
      {ask && (
        <div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="lt">
          <div className="login-mbox">
            <h2 id="lt">Share your location?</h2>
            <p>RAAHI can use your location in an emergency, so you can send it to your emergency contact. It is saved only on this device.</p>
            <button className="login-btn login-btn-pri" onClick={allow} disabled={busy}>
              {busy ? "Getting location..." : "Allow"}
            </button>
            <button className="login-btn login-btn-out" onClick={deny} disabled={busy}>
              Don't allow
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Details (Step 1 of Sign Up) ── */
function DetailsCard({ go, data, setData }) {
  const [err, setErr] = useState("");
  const set = (k) => (v) => setData({ ...data, [k]: v });
  const next = () => {
    if (!data.name.trim()) return setErr("Enter your full name.");
    if (!data.gender) return setErr("Select your gender.");
    if (!validEmail(data.email)) return setErr("Enter a valid email address, like name@example.com.");
    if (!validPhone(data.phone)) return setErr("Contact number must be exactly 10 digits.");
    if (data.address.trim().length < 4) return setErr("Enter your address.");
    if (!data.emergency || !validPhone(data.emergency)) return setErr("Emergency contact number is required and must be 10 digits.");
    if (data.phone && data.emergency && data.phone === data.emergency) return setErr("Emergency contact number must be different from your primary contact number.");
    setErr(""); go("password");
  };

  return (
    <div className="login-card">
      <span className="login-step">STEP 1 OF 2</span>
      <h1>Create an Account</h1>
      <p className="login-sub">Enter your details to register</p>
      <div className="login-scroll">
        <Field id="dn" label="Full Name *"><input id="dn" value={data.name || ""} placeholder="Your full name" autoComplete="off" onChange={(e) => set("name")(e.target.value)} /></Field>
        <Field id="du" label="Username (Optional)"><input id="du" value={data.username || ""} placeholder="Choose a username (or leave blank to use name/email)" autoComplete="off" onChange={(e) => set("username")(e.target.value)} /></Field>
        <Field id="dg" label="Gender *"><select id="dg" value={data.gender || ""} onChange={(e) => set("gender")(e.target.value)}><option value="">Select gender</option>{options(GENDERS)}</select></Field>
        <Field id="de" label="Email *"><input id="de" type="email" value={data.email || ""} placeholder="name@example.com" autoComplete="off" onChange={(e) => set("email")(e.target.value)} /></Field>
        <PhoneField id="dp" label="Contact Number *" code={data.phoneCode || "+91"} num={data.phone || ""} onCode={set("phoneCode")} onNum={set("phone")} />
        <Field id="dc" label="Your Country *">
          <select id="dc" value={data.country || "India"} onChange={(e) => setData({ ...data, country: e.target.value, phoneCode: codeFor(e.target.value, data.phoneCode), emgCode: codeFor(e.target.value, data.emgCode) })}>
            {options(COUNTRIES)}
          </select>
        </Field>
        <Field id="da" label="Address *"><textarea id="da" value={data.address || ""} placeholder="Street, city, state" rows={2} autoComplete="off" onChange={(e) => set("address")(e.target.value)} /></Field>
        <PhoneField id="dem" label="Emergency Contact Number *" code={data.emgCode || "+91"} num={data.emergency || ""} onCode={set("emgCode")} onNum={set("emergency")} />
        <Field id="dm" label="Medical Notes (Optional)"><input id="dm" value={data.medical || ""} placeholder="e.g. None / Asthma / Blood Type O+" autoComplete="off" onChange={(e) => set("medical")(e.target.value)} /></Field>
        <Field id="dph" label="Profile Photo (Optional)">
          <input id="dph" className="login-file" type="file" accept="image/*" key={data.photo ? "has" : "none"} onChange={(e) => readFile(e.target.files[0], (n, url) => url && setData({ ...data, photo: url }), 600)} />
          {data.photo && <img src={data.photo} alt="Photo preview" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12, marginTop: 8, display: "block", border: "2px solid #174d41" }} />}
        </Field>
      </div>
      {err && <p className="login-err" role="alert">{err}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="login-btn login-btn-pri" style={{ flex: 1, marginBottom: 0 }} onClick={next}>Next →</button>
      </div>
      <p className="login-foot">Already have an account? <button onClick={() => go("login")}>Log In</button></p>
    </div>
  );
}

/* ── Password (Step 2 of Sign Up) ── */
function PasswordCard({ go, data, setData, notify, onFinishLogin }) {
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const checks = useMemo(() => [
    ["At least 6 characters", pw.length >= 6],
    ["Contains a number", /\d/.test(pw)],
    ["Passwords match", pw.length > 0 && pw === cf],
  ], [pw, cf]);

  const create = async () => {
    if (!checks.every((c) => c[1])) return notify("Meet all the password requirements first.");
    const chosenUsername = (data.username && data.username.trim()) || (data.name ? data.name.trim() : (data.email ? data.email.split("@")[0] : "user"));
    const updated = {
      ...data,
      username: chosenUsername,
      password: pw
    };
    if (setData) setData(updated);

    try {
      const res = await apiRegister(updated);
      if (res.ok && res.raw?.user) {
        const authedUser = { ...res.raw.user, password: pw };
        localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(authedUser));
        localStorage.setItem("raahi_password", pw);
        localStorage.setItem(LOGGED_IN_KEY, "true");
        notify("Account created for " + (authedUser.name || "you") + ". Logging you in…");
        onFinishLogin(authedUser);
        return;
      } else if (!res.offline && !res.backendMissing && res.status !== 405 && res.status !== 404 && res.error) {
        return notify(res.error);
      }
    } catch {}

    const users = initUsers();
    const idx = users.findIndex(u =>
      (updated.email && u.email && u.email.toLowerCase() === updated.email.toLowerCase()) ||
      (updated.name && u.name && u.name.toLowerCase() === updated.name.toLowerCase()) ||
      (updated.phone && u.phone && u.phone === updated.phone)
    );
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...updated };
    } else {
      users.push(updated);
    }
    saveUsers(users);

    localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(updated));
    localStorage.setItem("raahi_password", pw);
    localStorage.setItem(LOGGED_IN_KEY, "true");

    notify("Account created for " + (updated.name || "you") + ". Logging you in…");
    onFinishLogin(updated);
  };

  return (
    <div className="login-card">
      <span className="login-step">STEP 2 OF 2</span>
      <h1>Create Password</h1>
      <p className="login-sub">Set a secure password for your account</p>
      <Field id="cp" label="Create Password"><PasswordInput id="cp" value={pw} onChange={setPw} placeholder="Enter password (min 6 characters)" /></Field>
      <Field id="cc" label="Confirm Password"><PasswordInput id="cc" value={cf} onChange={setCf} placeholder="Confirm your password" /></Field>
      <ul className="login-rules">{checks.map(([t, ok]) => <li key={t} className={ok ? "ok" : ""}>{t}</li>)}</ul>
      <button className="login-btn login-btn-pri" onClick={create}>Create Account & Sign In</button>
      <button className="login-btn login-btn-soft" onClick={() => go("details")}>← Back to Step 1</button>
      <p className="login-foot">Already have an account? <button onClick={() => go("login")}>Log In</button></p>
    </div>
  );
}

/* ── Main exported Login screen ── */
export default function LoginScreen({ onAuthenticated }) {
  const [view, setView] = useState("login");
  const [toast, setToast] = useState("");
  const [data, setDataRaw] = useState(() => ({ ...EMPTY_PROFILE }));

  const setData = (d) => {
    setDataRaw(d);
  };

  const go = (nextView) => {
    if (nextView === "details") {
      setDataRaw({ ...EMPTY_PROFILE });
    }
    setView(nextView);
  };

  const notify = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2800);
  };

  const handleFinishLogin = (profileOverride) => {
    const finalProfile = profileOverride || data || DEMO_USER;
    try {
      localStorage.setItem(LOGGED_IN_KEY, "true");
      localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(finalProfile));
    } catch {}
    onAuthenticated(finalProfile);
  };

  const props = { go: setView, data, setData, notify, onFinishLogin: handleFinishLogin };
  let body;
  if (view === "login") body = <LoginCard {...props} />;
  else if (view === "details") body = <DetailsCard {...props} />;
  else body = <PasswordCard {...props} />;

  return (
    <div className="login-screen">
      <div className="login-app">
        <div className="login-root">
          <header className="login-top">
            <div className="login-brand-header">
              <span className="brand-mark">
                R<span>↗</span>
              </span>
              <div className="login-brand-text">
                <span className="login-brand-name">RAAHI</span>
                <span className="login-brand-caption">TOURIST SAFETY</span>
              </div>
            </div>
            <div className="login-brand-tagline">Your safe travel companion</div>
          </header>
          <main className="login-main">{body}</main>
          {toast && <div className="login-toast" role="status">{toast}</div>}
        </div>
      </div>
    </div>
  );
}
