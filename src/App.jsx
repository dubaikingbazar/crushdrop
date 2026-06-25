import { useState, useEffect } from "react";

const APP_URL = "https://crushdrop.vercel.app";
const SUPABASE_URL = "https://tltdhyzxgefvosaurorw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsdGRoeXp4Z2Vmdm9zYXVyb3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTQ4NDIsImV4cCI6MjA5Nzc5MDg0Mn0.SWUZ2zj2iCXmXzx0w2x5PgCy6W4MQLvw-8drXT083Ek";

// ── Supabase Auth ───────────────────────────────────────────
async function signUp(email, password, username) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || data.msg);
  
  const token = data.access_token || data.session?.access_token;
  const userId = data.user?.id || data.id;
  
  if (token && userId) {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ username: username.toLowerCase(), display_name: username, user_id: userId }),
    });
  }
  
  return { ...data, access_token: token, user: { ...data.user, id: userId } };
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || data.msg);
  return data;
}

async function checkUsername(username) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${username.toLowerCase()}&select=username`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const data = await res.json();
  return data.length === 0; // true = available
}

async function getProfile(username) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${username.toLowerCase()}&select=*`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const data = await res.json();
  return data[0] || null;
}

async function getMessages(username, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?profile_username=eq.${username.toLowerCase()}&select=*&order=created_at.desc`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` },
  });
  return res.json();
}

async function sendMessage(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to send");
  return res.json();
}

async function revealMessage(id, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify({ is_revealed: true }),
  });
  return res.json();
}

// ── Cashfree ────────────────────────────────────────────────
async function createCashfreeOrder(amount, orderId) {
  const res = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, orderId, customerEmail: "user@crushdrop.in" }),
  });
  return res.json();
}

async function verifyCashfreePayment(orderId) {
  const res = await fetch("/api/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  return res.json();
}

function loadCashfreeSDK() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve(window.Cashfree);
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(window.Cashfree);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function generateOrderId(prefix = "CD") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Local Storage ───────────────────────────────────────────
function saveSession(token, username) {
  localStorage.setItem("cd_token", token);
  localStorage.setItem("cd_username", username);
}

function getSession() {
  return {
    token: localStorage.getItem("cd_token"),
    username: localStorage.getItem("cd_username"),
  };
}

function clearSession() {
  localStorage.removeItem("cd_token");
  localStorage.removeItem("cd_username");
}

// ── URL helpers ─────────────────────────────────────────────
function getPageFromUrl() {
  const path = window.location.pathname;
  const uMatch = path.match(/^\/u\/([a-zA-Z0-9_]{1,30})$/);
  if (uMatch) return { page: "profile", username: uMatch[1] };
  if (path === "/inbox") return { page: "inbox" };
  if (path === "/login") return { page: "login" };
  if (path === "/signup") return { page: "signup" };
  return { page: "landing" };
}

// ── Petals ──────────────────────────────────────────────────
const petals = Array.from({ length: 8 }, (_, i) => ({
  left: `${(i * 13 + 5) % 100}%`,
  size: `${(i % 3) * 4 + 10}px`,
  duration: `${(i % 4) * 2 + 9}s`,
  delay: `${(i % 5) * 1.8}s`,
  opacity: 0.12 + (i % 3) * 0.06,
}));

// ── Share image canvas ───────────────────────────────────────
async function shareProfileImage(username) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
  bg.addColorStop(0, "#FFF0F3"); bg.addColorStop(0.5, "#FDE8EE"); bg.addColorStop(1, "#F5D5E8");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1920);
  const cx = 540, cardW = 900, cardH = 800, cardY = 560;
  ctx.save(); ctx.shadowColor = "rgba(201,160,180,0.3)"; ctx.shadowBlur = 60;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath(); ctx.roundRect(cx-cardW/2, cardY, cardW, cardH, 60); ctx.fill();
  ctx.restore();
  ctx.font = "140px serif"; ctx.textAlign = "center"; ctx.fillText("💌", cx, cardY+200);
  ctx.fillStyle = "#3D2B35"; ctx.font = "bold 68px Georgia, serif";
  ctx.fillText("Someone has a crush on me? 👀", cx, cardY+320);
  ctx.fillStyle = "#C9A0B4"; ctx.font = "48px Georgia, serif";
  ctx.fillText("Send me an anonymous confession 💌", cx, cardY+420);
  ctx.fillStyle = "rgba(232,114,138,0.15)";
  ctx.beginPath(); ctx.roundRect(cx-320, cardY+490, 640, 90, 45); ctx.fill();
  ctx.fillStyle = "#C9657D"; ctx.font = "bold 44px Georgia, serif";
  ctx.fillText(`crushdrop.vercel.app/u/${username}`, cx, cardY+547);
  ctx.fillStyle = "#C9A0B4"; ctx.font = "36px Georgia, serif";
  ctx.fillText("CrushDrop · Anonymous Confessions", cx, 1820);
  const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
  const file = new File([blob], "crushdrop-story.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "CrushDrop", text: `Send me an anonymous confession 💌 ${APP_URL}/u/${username}` });
    return "shared";
  }
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a"); a.href = url; a.download = "crushdrop-story.png"; a.click();
  return "downloaded";
}

// ── Main App ────────────────────────────────────────────────

// ── SignupForm (standalone — keyboard fix) ──────────────────
function SignupForm({ onSuccess, goTo }) {
  const [fields, setFields] = useState({ username: "", email: "", password: "" });
  const [status, setStatus] = useState({ checking: false, available: null, error: "", loading: false });
  const timerRef = useRef(null);
  const availableRef = useRef(null);

  const updateField = (key, val) => setFields(f => ({ ...f, [key]: val }));

  const onUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    updateField("username", val);
    clearTimeout(timerRef.current);
    if (val.length < 3) { availableRef.current = null; return; }
    timerRef.current = setTimeout(async () => {
      const a = await checkUsername(val);
      availableRef.current = a;
      setStatus(s => ({ ...s, available: a }));
    }, 800);
  };

  const handleSubmit = async () => {
    const { username, email, password } = fields;
    if (!username || !email || !password) { setStatus(s => ({...s, error: "Sab fields bharo"})); return; }
    if (availableRef.current === false) { setStatus(s => ({...s, error: "Username already taken"})); return; }
    setStatus(s => ({...s, loading: true, error: ""}));
    try {
      const data = await signUp(email, password, username);
      onSuccess(data.access_token, username.toLowerCase());
    } catch(e) {
      setStatus(s => ({...s, error: e.message || "Signup failed", loading: false}));
    }
  };

  const { username, email, password } = fields;
  const { available, error, loading } = status;

  return (
    <div className="card">
      <button className="back-btn" onClick={()=>goTo("landing")}>← Back</button>
      <div className="wordmark">CrushDrop 💌</div>
      <h2 style={{marginBottom:6}}>Apna link banao ✨</h2>
      <p className="sub" style={{marginBottom:20}}>Free mein signup karo — 30 second mein link ready</p>
      <label className="label">Username choose karo</label>
      <div className="input-wrap">
        <input className="input" placeholder="e.g. priya, rahul123" value={username}
          onChange={onUsernameChange}
          autoComplete="off" autoCorrect="off" spellCheck="false" style={{paddingRight:80}}/>
        {available === true && <span className="input-badge badge-green">✓ Free</span>}
        {available === false && <span className="input-badge badge-red">✗ Liya</span>}
      </div>
      {username && <p style={{fontSize:11,color:"#C9A0B4",marginBottom:14,marginTop:-10}}>crushdrop.vercel.app/u/{username}</p>}
      <label className="label">Email</label>
      <input className="input" placeholder="tumhari@email.com" value={email}
        onChange={e=>updateField("email", e.target.value)} inputMode="email" autoComplete="email"/>
      <label className="label">Password</label>
      <input className="input" placeholder="Minimum 6 characters" value={password}
        onChange={e=>updateField("password", e.target.value)} type="password" autoComplete="new-password"/>
      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span className="spinner"/>Creating...</span> : "Apna link banao 💌"}
      </button>
      <button className="btn btn-ghost" onClick={()=>goTo("login")}>Already account hai? Login karo</button>
    </div>
  );
}

// ── LoginForm (standalone — keyboard fix) ───────────────────
function LoginForm({ onSuccess, goTo }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError("Sab fields bharo"); return; }
    setLoading(true); setError("");
    try {
      const data = await signIn(email, password);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${data.user.id}&select=username`, {
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${data.access_token}` },
      });
      const profiles = await res.json();
      const uname = profiles[0]?.username || "";
      onSuccess(data.access_token, uname);
    } catch(e) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <button className="back-btn" onClick={()=>goTo("landing")}>← Back</button>
      <div className="wordmark">CrushDrop 💌</div>
      <h2 style={{marginBottom:6}}>Wapas aao 💗</h2>
      <p className="sub" style={{marginBottom:20}}>Login karo aur apne messages dekho</p>
      <label className="label">Email</label>
      <input className="input" placeholder="tumhari@email.com" value={email} onChange={e=>setEmail(e.target.value)} inputMode="email" autoComplete="email"/>
      <label className="label">Password</label>
      <input className="input" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password"/>
      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span className="spinner"/>Logging in...</span> : "Login karo 💌"}
      </button>
      <button className="btn btn-ghost" onClick={()=>goTo("signup")}>Naya account banao</button>
    </div>
  );
}


// ── ProfileForm (standalone — keyboard fix) ─────────────────
function ProfileForm({ profileData, profileUsername, goTo }) {

  const handleSend = async () => {
    if (!msgText.trim()) return;
    setSendingMsg(true); setMsgError("");
    try {
      await sendMessage({
        receiver_name: profileData?.display_name || profileUsername,
        receiver_contact: profileUsername,
        message: msgText,
        sender_name: senderName || null,
        profile_username: profileUsername.toLowerCase(),
        reveal_enabled: !!senderName,
        is_premium: false,
        delivery_status: "delivered",
      });
      setMsgSent(true);
    } catch(e) {
      setMsgError("Kuch gadbad ho gayi, dobara try karo");
    } finally {
      setSendingMsg(false);
    }
  };

  if (!profileData) return (
    <div className="card">
      <div className="loading-box"><div style={{fontSize:32,marginBottom:12}}>💌</div><div>Loading...</div></div>
    </div>
  );

  if (msgSent) return (
    <div className="card">
      <div className="success-box">
        <div className="success-icon">💌</div>
        <h2>Message bhej diya!</h2>
        <p className="sub" style={{marginBottom:20}}>
          <strong>{profileData.display_name}</strong> ko pata nahi tum kaun ho 😏<br/>
          Shayad wo bhi tumhe secretly like karta/karti hai...
        </p>
        <button className="btn btn-primary" onClick={()=>goTo("signup")}>Apna CrushDrop link banao 💌</button>
        <p style={{fontSize:12,color:"#C9A0B4",marginTop:10,textAlign:"center"}}>Pata karo koi tumhe bhi like karta hai 👀</p>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="profile-header">
        <div className="profile-avatar">💌</div>
        <div className="profile-username">{profileData.display_name}</div>
        <div className="profile-link">crushdrop.vercel.app/u/{profileUsername}</div>
        <div className="tagline" style={{marginBottom:0}}>Send an anonymous confession 👇</div>
      </div>
      <label className="label">Tumhara message</label>
      <textarea className="input"
        placeholder={`${profileData.display_name} ko kuch kehna hai? Ye tumhara chance hai... 💌`}
        value={msgText} onChange={e=>setMsgText(e.target.value)}/>
      <label className="label">Tumhara naam <span style={{color:"#C9A0B4",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional — reveal ke liye)</span></label>
      <input className="input" placeholder="Apna naam daalo — sirf ₹11 mein reveal hoga"
        value={senderName} onChange={e=>setSenderName(e.target.value)} autoComplete="off"/>
      {msgError && <p className="error-text">{msgError}</p>}
      <button className="btn btn-primary" onClick={handleSend} disabled={sendingMsg || !msgText.trim()}>
        {sendingMsg ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span className="spinner"/>Sending...</span> : "Send anonymous message 💌"}
      </button>
      <div className="divider"/>
      <div style={{textAlign:"center"}}>
        <p style={{fontSize:12,color:"#B08898",marginBottom:8}}>Tumhara bhi koi crush hai? 👀</p>
        <button className="btn btn-ghost" style={{marginTop:0}} onClick={()=>goTo("signup")}>Apna CrushDrop link banao — FREE</button>
      </div>
    </div>
  );
}

export default function CrushDrop() {
  const urlData = getPageFromUrl();
  const session = getSession();

  const [page, setPage] = useState(urlData.page);
  const [profileUsername, setProfileUsername] = useState(urlData.username || "");
  const [token, setToken] = useState(session.token || "");
  const [myUsername, setMyUsername] = useState(session.username || "");

  // Auth forms

  // Profile page
  const [profileData, setProfileData] = useState(null);

  // Inbox
  const [messages, setMessages] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  // Load profile when on profile page
  useEffect(() => {
    if (page === "profile" && profileUsername) {
      getProfile(profileUsername).then(p => setProfileData(p));
    }
  }, [page, profileUsername]);

  // Load inbox
  useEffect(() => {
    if (page === "inbox" && token && myUsername) {
      setInboxLoading(true);
      getMessages(myUsername, token).then(msgs => {
        setMessages(msgs || []);
        setInboxLoading(false);
      });
    }
  }, [page, token, myUsername]);


  const goTo = (p, uname = "") => {
    setPage(p);
    if (uname) setProfileUsername(uname);
    window.history.pushState({}, "", p === "landing" ? "/" : p === "profile" ? `/u/${uname}` : `/${p}`);
  };




  const handleReveal = async (msgId) => {
    setPaymentLoading(true);
    try {
      const orderId = generateOrderId("REVEAL");
      const order = await createCashfreeOrder(11, orderId);
      if (!order.payment_session_id) throw new Error("No session");
      const cashfree = await loadCashfreeSDK();
      const cf = new cashfree({ mode: "production" });
      cf.checkout({ paymentSessionId: order.payment_session_id, redirectTarget: "_modal" }).then(async (result) => {
        if (result.error) { setPaymentLoading(false); return; }
        const verify = await verifyCashfreePayment(orderId);
        if (verify.success) {
          await revealMessage(msgId, token);
          const msgs = await getMessages(myUsername, token);
          setMessages(msgs || []);
        }
        setPaymentLoading(false);
      });
    } catch(e) {
      setPaymentLoading(false);
    }
  };

  const handleShare = async () => {
    setShareStatus("generating");
    const result = await shareProfileImage(myUsername);
    setShareStatus(result);
  };

  const handleLogout = () => {
    clearSession();
    setToken(""); setMyUsername("");
    goTo("landing");
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes petalFall{0%{transform:translateY(-40px) rotate(0deg);opacity:0;}10%{opacity:var(--op);}90%{opacity:var(--op);}100%{transform:translateY(110vh) rotate(200deg);opacity:0;}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
    @keyframes softPulse{0%,100%{box-shadow:0 4px 24px rgba(232,114,138,0.18);}50%{box-shadow:0 4px 40px rgba(232,114,138,0.38);}}
    @keyframes heartBeat{0%,100%{transform:scale(1);}30%{transform:scale(1.18);}60%{transform:scale(0.95);}}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes shimmer{0%{background-position:-200% center;}100%{background-position:200% center;}}
    html,body{-webkit-text-size-adjust:100%;touch-action:manipulation;}
    .app{min-height:100dvh;background:linear-gradient(160deg,#FFF0F3 0%,#FDE8EE 50%,#F9E4F0 100%);font-family:'DM Sans',sans-serif;color:#3D2B35;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:20px 16px 40px;position:relative;overflow-x:hidden;}
    @media(min-height:700px){.app{justify-content:center;}}
    .petal{position:fixed;pointer-events:none;user-select:none;font-size:var(--size);left:var(--left);top:-40px;opacity:0;animation:petalFall var(--dur) ease-in infinite;animation-delay:var(--delay);will-change:transform;}
    .card{background:rgba(255,255,255,0.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(232,114,138,0.14);border-radius:24px;padding:28px 20px 32px;width:100%;max-width:420px;animation:fadeUp 0.4s cubic-bezier(0.22,1,0.36,1);position:relative;z-index:10;box-shadow:0 8px 40px rgba(201,160,180,0.18),0 2px 8px rgba(232,114,138,0.08);}
    .wordmark{font-family:'Cormorant Garamond',serif;font-size:28px;font-style:italic;color:#C9657D;text-align:center;letter-spacing:0.5px;margin-bottom:3px;}
    .tagline{text-align:center;color:#C9A0B4;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:24px;}
    .hero-icon{width:72px;height:72px;background:linear-gradient(135deg,#FADADD,#F7C5D0);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 18px;animation:heartBeat 2.8s ease-in-out infinite;box-shadow:0 4px 20px rgba(232,114,138,0.2);}
    h2{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#3D2B35;text-align:center;line-height:1.3;margin-bottom:8px;}
    h3{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#3D2B35;margin-bottom:12px;}
    .sub{color:#B08898;font-size:13px;text-align:center;line-height:1.65;margin-bottom:20px;}
    .divider{height:1px;background:linear-gradient(90deg,transparent,rgba(201,160,180,0.3),transparent);margin:18px 0;}
    .btn{width:100%;padding:16px;border-radius:16px;border:none;cursor:pointer;font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif;transition:transform 0.12s ease,opacity 0.12s ease;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
    .btn:active{transform:scale(0.97);opacity:0.9;}
    .btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
    .btn-primary{background:linear-gradient(135deg,#E8728A,#D45A75);color:white;animation:softPulse 3s ease-in-out infinite;box-shadow:0 4px 20px rgba(232,114,138,0.3);}
    .btn-ghost{background:rgba(232,114,138,0.07);color:#C9657D;border:1.5px solid rgba(232,114,138,0.2);margin-top:10px;}
    .btn-mauve{background:linear-gradient(135deg,#C9A0B4,#B08898);color:white;box-shadow:0 4px 16px rgba(201,160,180,0.35);}
    .btn-dark{background:#3D2B35;color:white;}
    .btn-sm{width:auto;padding:10px 20px;font-size:13px;}
    .label{font-size:11px;font-weight:600;color:#B08898;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:7px;}
    .input{width:100%;background:rgba(253,232,238,0.4);border:1.5px solid rgba(201,160,180,0.25);border-radius:14px;padding:14px 16px;color:#3D2B35;font-size:16px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.2s,background 0.2s;margin-bottom:14px;-webkit-appearance:none;appearance:none;}
    .input::placeholder{color:#C9A0B4;font-size:14px;}
    .input:focus{border-color:rgba(232,114,138,0.5);background:rgba(255,255,255,0.9);}
    textarea.input{resize:none;height:100px;line-height:1.65;font-size:14px;}
    .input-wrap{position:relative;margin-bottom:14px;}
    .input-wrap .input{margin-bottom:0;}
    .input-badge{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:600;padding:3px 8px;border-radius:100px;}
    .badge-green{background:rgba(34,197,94,0.1);color:#16a34a;}
    .badge-red{background:rgba(239,68,68,0.1);color:#dc2626;}
    .error-text{color:#E8728A;font-size:13px;margin-bottom:12px;text-align:center;}
    .spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,0.4);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0;display:inline-block;}
    .back-btn{background:none;border:none;color:#C9A0B4;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;padding:8px 0;margin-bottom:16px;display:flex;align-items:center;gap:4px;-webkit-tap-highlight-color:transparent;min-height:44px;}

    /* Profile page */
    .profile-header{text-align:center;margin-bottom:20px;}
    .profile-avatar{width:80px;height:80px;background:linear-gradient(135deg,#FADADD,#F7C5D0);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 12px;box-shadow:0 4px 20px rgba(232,114,138,0.2);}
    .profile-username{font-family:'Cormorant Garamond',serif;font-size:26px;font-style:italic;color:#3D2B35;margin-bottom:4px;}
    .profile-link{font-size:11px;color:#C9A0B4;margin-bottom:16px;}

    /* Message card in inbox */
    .msg-item{background:linear-gradient(135deg,#FFF5F7,#FDE8EE);border:1px solid rgba(232,114,138,0.15);border-radius:16px;padding:16px;margin-bottom:12px;position:relative;}
    .msg-item-text{font-family:'Cormorant Garamond',serif;font-size:17px;font-style:italic;color:#4A3040;line-height:1.7;margin-bottom:10px;border-left:2.5px solid #E8728A;padding-left:12px;}
    .msg-item-time{font-size:11px;color:#C9A0B4;margin-bottom:8px;}
    .msg-item-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;}
    .reveal-badge{background:rgba(232,114,138,0.1);border:1px solid rgba(232,114,138,0.2);border-radius:100px;padding:4px 12px;font-size:12px;color:#C9657D;font-weight:500;}
    .revealed-name{font-size:13px;font-weight:600;color:#C9657D;}

    /* Inbox header */
    .inbox-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
    .inbox-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;color:#3D2B35;}
    .msg-count{background:linear-gradient(135deg,#E8728A,#D45A75);color:white;border-radius:100px;padding:3px 10px;font-size:12px;font-weight:600;}

    /* Share section */
    .share-box{background:linear-gradient(135deg,#FFF0F3,#FDE8EE);border:1.5px dashed rgba(232,114,138,0.3);border-radius:20px;padding:18px;margin-bottom:16px;text-align:center;}
    .share-link{background:rgba(232,114,138,0.07);border:1.5px solid rgba(232,114,138,0.2);border-radius:12px;padding:10px 14px;font-size:12px;color:#C9657D;word-break:break-all;margin:10px 0;font-weight:500;}
    .share-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}
    .share-btn-wa{background:#25D366;color:white;border:none;border-radius:12px;padding:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;}
    .share-btn-copy{background:rgba(232,114,138,0.08);color:#C9657D;border:1.5px solid rgba(232,114,138,0.2);border-radius:12px;padding:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;}
    .native-share-btn{width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#E8728A,#D45A75);color:white;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;}

    /* How it works */
    .hiw{background:rgba(253,232,238,0.4);border-radius:20px;padding:16px;margin:16px 0;}
    .hiw-title{font-size:11px;font-weight:600;color:#B08898;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;}
    .hiw-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;}
    .hiw-row:last-child{margin-bottom:0;}
    .hiw-num{width:26px;height:26px;min-width:26px;background:linear-gradient(135deg,#E8728A,#D45A75);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;}
    .hiw-text{font-size:13px;color:#7A5566;line-height:1.5;padding-top:4px;}
    .hiw-bold{font-weight:600;color:#4A3040;}

    /* Empty state */
    .empty-state{text-align:center;padding:30px 0;}
    .empty-icon{font-size:48px;margin-bottom:12px;}
    .empty-text{color:#B08898;font-size:14px;line-height:1.6;}

    /* Success */
    .success-box{text-align:center;padding:20px 0;}
    .success-icon{font-size:52px;margin-bottom:12px;}

    /* Nav */
    .nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
    .nav-logo{font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;color:#C9657D;}

    .loading-box{text-align:center;padding:40px 0;color:#C9A0B4;font-size:14px;}

    .trust-row{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:12px;}
    .trust-row span{font-size:11px;color:#B08898;}

    .feature-row{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;}
    .feature-icon{width:36px;height:36px;min-width:36px;background:linear-gradient(135deg,#FADADD,#F7C5D0);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;}
    .feature-text{font-size:13px;color:#7A5566;line-height:1.5;padding-top:3px;}
    .feature-title{font-weight:600;color:#4A3040;font-size:13px;}
  `;

  // ── LANDING ─────────────────────────────────────────────
  const Landing = () => (
    <div className="card">
      <div className="wordmark">CrushDrop 💌</div>
      <div className="tagline">Anonymous confessions · Made in India</div>
      <div className="hero-icon">💌</div>
      <h2>Kya koi tumhe secretly like karta hai?</h2>
      <p className="sub">Apna CrushDrop link banao — share karo — anonymous confessions pao 💗</p>

      <div className="hiw">
        <div className="hiw-title">Kaise kaam karta hai</div>
        {[
          ["1","Apna link banao","crushdrop.vercel.app/u/tumhara-naam"],
          ["2","Instagram story pe lagao","Friends dekhenge aur message bhejenge"],
          ["3","Anonymous confessions pao","Reveal karo ₹11 mein — kaun hai pata chalega"],
        ].map(([n,t,d])=>(
          <div className="hiw-row" key={n}>
            <div className="hiw-num">{n}</div>
            <div className="hiw-text"><span className="hiw-bold">{t}</span> — {d}</div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={()=>goTo("signup")}>
        💌 Apna CrushDrop link banao — FREE
      </button>
      <button className="btn btn-ghost" onClick={()=>goTo("login")}>
        Already account hai? Login karo
      </button>
      <div className="trust-row">
        <span>🔒 100% Anonymous</span>
        <span>🇮🇳 Made in India</span>
        <span>✅ Free to use</span>
      </div>
    </div>
  );

  // ── SIGNUP ───────────────────────────────────────────────
  const Signup = () => <SignupForm onSuccess={(token, uname) => {
    setToken(token); setMyUsername(uname); saveSession(token, uname); goTo("inbox");
  }} goTo={goTo}/>;

  // ── LOGIN ────────────────────────────────────────────────
  const Login = () => <LoginForm onSuccess={(token, uname) => {
    setToken(token); setMyUsername(uname); saveSession(token, uname); goTo("inbox");
  }} goTo={goTo}/>;

  // ── PROFILE (public page) ────────────────────────────────
  const Profile = () => <ProfileForm profileData={profileData} profileUsername={profileUsername} goTo={goTo}/>;

  // ── INBOX ────────────────────────────────────────────────
  const Inbox = () => {
    if (!token || !myUsername) {
      return (
        <div className="card" style={{textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>💌</div>
          <p style={{color:"#B08898",marginBottom:16}}>Session expire ho gayi</p>
          <button className="btn btn-primary" onClick={()=>goTo("login")}>Login karo</button>
        </div>
      );
    }

    const myLink = `${APP_URL}/u/${myUsername}`;

    return (
      <div className="card">
        <div className="nav">
          <div className="nav-logo">CrushDrop 💌</div>
          <button className="btn btn-ghost btn-sm" style={{marginTop:0,width:"auto"}} onClick={handleLogout}>Logout</button>
        </div>

        {/* Share section */}
        <div className="share-box">
          <div style={{fontSize:11,fontWeight:600,color:"#B08898",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Tumhara CrushDrop link</div>
          <div className="share-link">{myLink}</div>
          <p style={{fontSize:12,color:"#B08898",marginBottom:10}}>Ye link Instagram story pe lagao — anonymous confessions aane lagenge 🔥</p>
          <div className="share-btns">
            <button className="share-btn-wa" onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(`💌 Send me an anonymous confession!\n${myLink}`)}`)}>💬 WhatsApp</button>
            <button className="share-btn-copy" onClick={()=>{navigator.clipboard.writeText(myLink); alert("Link copied! 💌");}}>🔗 Copy link</button>
          </div>
          <button className="native-share-btn" onClick={handleShare}>
            {shareStatus==="generating" ? <><span className="spinner"/> Generating story...</> : shareStatus==="shared" ? <>✅ Shared!</> : shareStatus==="downloaded" ? <>✅ Downloaded!</> : <>📸 Share to Instagram Story</>}
          </button>
        </div>

        <div className="inbox-header">
          <div className="inbox-title">Tumhare messages</div>
          <div className="msg-count">{messages.length}</div>
        </div>

        {inboxLoading ? (
          <div className="loading-box"><div style={{fontSize:28,marginBottom:8}}>💌</div>Loading...</div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👀</div>
            <div className="empty-text">
              Abhi koi message nahi aaya<br/>
              <strong>Apna link share karo</strong> — messages aane lagenge!
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="msg-item">
              <div className="msg-item-text">"{msg.message}"</div>
              <div className="msg-item-time">{new Date(msg.created_at).toLocaleDateString("en-IN", {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
              <div className="msg-item-footer">
                {msg.is_revealed ? (
                  <div className="revealed-name">💗 {msg.sender_name || "Anonymous 🙈"}</div>
                ) : msg.reveal_enabled ? (
                  <button
                    className="btn btn-mauve btn-sm"
                    style={{marginTop:0,width:"auto"}}
                    onClick={()=>handleReveal(msg.id)}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? "Processing..." : "🔓 Reveal kaun hai — ₹11"}
                  </button>
                ) : (
                  <span className="reveal-badge">Anonymous 🙈</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // ── RENDER ───────────────────────────────────────────────
  const render = () => {
    switch(page) {
      case "landing":  return <Landing/>;
      case "signup":   return <Signup/>;
      case "login":    return <Login/>;
      case "profile":  return <Profile/>;
      case "inbox":    return <Inbox/>;
      default:         return <Landing/>;
    }
  };

  return (
    <div className="app">
      <style>{css}</style>
      {petals.map((p,i)=>(
        <div key={i} className="petal" style={{"--left":p.left,"--size":p.size,"--dur":p.duration,"--delay":p.delay,"--op":p.opacity}}>🌸</div>
      ))}
      {render()}
    </div>
  );
}
