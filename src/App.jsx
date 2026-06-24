import { useState, useEffect } from "react";

const APP_URL = "https://crushdrop.vercel.app";
const SUPABASE_URL = "https://tltdhyzxgefvosaurorw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsdGRoeXp4Z2Vmdm9zYXVyb3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTQ4NDIsImV4cCI6MjA5Nzc5MDg0Mn0.SWUZ2zj2iCXmXzx0w2x5PgCy6W4MQLvw-8drXT083Ek";

// ── Supabase helpers ────────────────────────────────────────
async function supabaseInsert(data) {
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
  if (!res.ok) throw new Error("Failed to save message");
  const result = await res.json();
  return result[0];
}

async function supabaseFetchById(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${id}&select=*`, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  const result = await res.json();
  return result[0] || null;
}

async function supabaseReveal(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify({ is_revealed: true }),
  });
  if (!res.ok) throw new Error("Failed to reveal");
  const result = await res.json();
  return result[0];
}

// ── Cashfree helpers ────────────────────────────────────────
async function createCashfreeOrder(amount, orderId, customerEmail) {
  const res = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, orderId, customerEmail }),
  });
  if (!res.ok) throw new Error("Order create failed");
  return res.json();
}

async function verifyCashfreePayment(orderId) {
  const res = await fetch("/api/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  if (!res.ok) throw new Error("Verify failed");
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

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function getMessageIdFromUrl() {
  const path = window.location.pathname;
  const match = path.match(/\/r\/([a-f0-9-]{36})/);
  return match && isValidUUID(match[1]) ? match[1] : null;
}

function generateOrderId(prefix = "CD") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

const SCREENS = {
  LANDING: "landing",
  FORM: "form",
  PAYMENT: "payment",
  SENT: "sent",
  RECEIVER: "receiver",
  RECEIVER_NOT_FOUND: "receiver_not_found",
  REVEAL_PAYMENT: "reveal_payment",
  SHARE: "share",
};

const INITIAL_FORM = { senderName: "", name: "", contact: "", message: "", reveal: true, isPremium: false };

const petals = Array.from({ length: 10 }, (_, i) => ({
  left: `${(i * 11 + 5) % 100}%`,
  size: `${(i % 3) * 5 + 12}px`,
  duration: `${(i % 4) * 2 + 8}s`,
  delay: `${(i % 5) * 1.5}s`,
  opacity: 0.15 + (i % 3) * 0.07,
}));

// ── Canvas ──────────────────────────────────────────────────
function generateStoryCanvas(variant = "sender", senderName = null) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
  bg.addColorStop(0, "#FFF0F3"); bg.addColorStop(0.5, "#FDE8EE"); bg.addColorStop(1, "#F5D5E8");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1920);
  const blob = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  blob(200,300,340,"rgba(232,114,138,0.18)"); blob(900,700,300,"rgba(201,160,180,0.15)");
  blob(150,1600,280,"rgba(232,114,138,0.12)"); blob(950,1400,260,"rgba(201,160,180,0.12)");
  const petalPos = [[120,280],[880,440],[200,900],[900,1100],[140,1450],[860,1600]];
  ctx.font = "72px serif"; ctx.globalAlpha = 0.25;
  petalPos.forEach(([x,y]) => ctx.fillText("🌸", x, y)); ctx.globalAlpha = 1;
  const cx = 540, cardW = 860, cardH = 900, cardY = 480;
  ctx.save(); ctx.shadowColor = "rgba(201,160,180,0.3)"; ctx.shadowBlur = 60;
  ctx.fillStyle = "rgba(255,255,255,0.88)"; roundRect(ctx, cx-cardW/2, cardY, cardW, cardH, 60); ctx.restore();
  ctx.font = "160px serif"; ctx.textAlign = "center"; ctx.fillText("💌", cx, cardY+220);
  ctx.fillStyle = "#3D2B35"; ctx.font = "bold 72px Georgia, serif";
  if (variant === "sender") {
    wrapText(ctx, "I just sent my crush", cx, cardY+320, 740, 86);
    wrapText(ctx, "an anonymous message 😏", cx, cardY+406, 740, 86);
  } else if (variant === "receiver" && senderName) {
    wrapText(ctx, `${senderName} secretly`, cx, cardY+320, 740, 86);
    wrapText(ctx, "has a crush on me 🥺", cx, cardY+406, 740, 86);
  } else {
    wrapText(ctx, "Someone secretly", cx, cardY+320, 740, 86);
    wrapText(ctx, "has a crush on me 🥺", cx, cardY+406, 740, 86);
  }
  ctx.fillStyle = "#C9A0B4"; ctx.font = "44px Georgia, serif";
  wrapText(ctx, "Find out who has a crush on you 👇", cx, cardY+620, 760, 56);
  const pillY = cardY+730;
  ctx.fillStyle = "rgba(232,114,138,0.12)"; roundRect(ctx, cx-300, pillY, 600, 80, 40);
  ctx.fillStyle = "#C9657D"; ctx.font = "bold 40px Georgia, serif"; ctx.textAlign = "center";
  ctx.fillText("crushdrop.vercel.app", cx, pillY+52);
  ctx.fillStyle = "#C9A0B4"; ctx.font = "36px Georgia, serif";
  ctx.fillText("CrushDrop · Anonymous confessions", cx, 1820);
  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); ctx.fill();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" "); let line = ""; let cy = y;
  words.forEach((w,i) => {
    const test = line+w+" ";
    if (ctx.measureText(test).width > maxW && i > 0) { ctx.fillText(line.trim(),x,cy); line=w+" "; cy+=lineH; }
    else line=test;
  });
  ctx.fillText(line.trim(),x,cy);
}

async function shareImage(variant, senderName = null) {
  const canvas = generateStoryCanvas(variant, senderName);
  const blob = await new Promise(res => canvas.toBlob(res,"image/png"));
  const file = new File([blob],"crushdrop-story.png",{type:"image/png"});
  if (navigator.canShare && navigator.canShare({files:[file]})) {
    await navigator.share({files:[file],title:"CrushDrop",text:`Someone has a crush on you 👀 ${APP_URL}`});
    return "shared";
  }
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a"); a.href=url; a.download="crushdrop-story.png"; a.click();
  return "downloaded";
}

// ── Form ────────────────────────────────────────────────────
function FormScreen({ form, setForm, setScreen, onSend, sending, sendError }) {
  const isValid = form.name && form.contact && form.message;
  return (
    <div className="card">
      <button className="back-btn" onClick={() => setScreen(SCREENS.LANDING)}>← Back</button>
      <div className="step-bar">{[true,false,false].map((d,i)=><div key={i} className={`step-seg ${d?"done":""}`}/>)}</div>
      <h2 style={{textAlign:"left"}}>Your message ✍️</h2>
      <p className="sub" style={{textAlign:"left",marginBottom:20}}>Free to send. Your name stays hidden unless they pay to reveal.</p>

      <label className="label">Your name <span style={{color:"#C9A0B4",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional — for reveal only)</span></label>
      <input className="input" placeholder="e.g. Rahul — only shown if they pay ₹11" value={form.senderName} onChange={e=>setForm({...form,senderName:e.target.value})} autoComplete="off" autoCorrect="off"/>

      <label className="label">Their name</label>
      <input className="input" placeholder="e.g. Priya" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoComplete="off" autoCorrect="off" spellCheck="false"/>

      <label className="label">Their WhatsApp or email</label>
      <input className="input" placeholder="98XXXXXXXX or priya@gmail.com" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} inputMode="email" autoComplete="off"/>

      <label className="label">Your message</label>
      <textarea className="input" placeholder="Every time you smile, I forget what I was going to say..." value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>

      <div className="toggle-row on" style={{cursor:"default"}}>
        <div className="pill-switch on" style={{opacity:0.7}}/>
        <div>
          <div className="toggle-label">Let them reveal your name 🔒</div>
          <div className="toggle-sub">They pay ₹11 to find out who sent this — always on</div>
        </div>
      </div>

      <div className={`toggle-row premium-row ${form.isPremium?"on":""}`} onClick={()=>setForm({...form,isPremium:!form.isPremium})}>
        <div className={`pill-switch premium-pill ${form.isPremium?"on":""}`}/>
        <div>
          <div className="toggle-label">✨ Premium delivery — ₹21</div>
          <div className="toggle-sub">Animated heart card + priority send</div>
        </div>
      </div>

      {sendError && <p style={{color:"#E8728A",fontSize:13,marginBottom:10,textAlign:"center"}}>{sendError}</p>}

      <button className="btn btn-primary" style={{marginTop:10,opacity:(!isValid||sending)?0.6:1}}
        onClick={()=>{ if(isValid&&!sending){ form.isPremium ? setScreen(SCREENS.PAYMENT) : onSend(); }}}
        disabled={!isValid||sending}>
        {sending?"Sending... 💫": form.isPremium?"Continue to payment →":"Send for FREE 💌"}
      </button>
      {!isValid && <p style={{textAlign:"center",fontSize:12,color:"#C9A0B4",marginTop:10}}>Fill name, contact and message to continue</p>}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────
export default function CrushDrop() {
  const [screen, setScreen]           = useState(SCREENS.LANDING);
  const [form, setForm]               = useState(INITIAL_FORM);
  const [revealed, setRevealed]       = useState(false);
  const [shareVariant, setShareVariant] = useState("sender");
  const [shareSenderName, setShareSenderName] = useState(null);
  const [copied, setCopied]           = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [messageBlurred, setMessageBlurred] = useState(true);
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState("");
  const [sentMsgId, setSentMsgId]     = useState(null);
  const [receiverMsg, setReceiverMsg] = useState(null);
  const [receiverLoading, setReceiverLoading] = useState(false);
  const [currentMsgId, setCurrentMsgId] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const msgId = getMessageIdFromUrl();
    if (!msgId) return;
    setCurrentMsgId(msgId);
    setReceiverLoading(true);
    setScreen(SCREENS.RECEIVER);
    supabaseFetchById(msgId)
      .then(msg => {
        if (!msg) setScreen(SCREENS.RECEIVER_NOT_FOUND);
        else { setReceiverMsg(msg); if(msg.is_revealed) setRevealed(true); }
        setReceiverLoading(false);
      })
      .catch(() => { setScreen(SCREENS.RECEIVER_NOT_FOUND); setReceiverLoading(false); });
  }, []);

  const resetAll = () => {
    setForm(INITIAL_FORM); setSentMsgId(null); setSendError("");
    setRevealed(false); setMessageBlurred(true); setReceiverMsg(null);
    setPaymentError("");
  };

  const goLanding = () => { resetAll(); setScreen(SCREENS.LANDING); };
  const goShare = (variant, senderName = null) => { setShareVariant(variant); setShareSenderName(senderName); setShareStatus(""); setScreen(SCREENS.SHARE); };
  const goReceiver = () => { setRevealed(false); setMessageBlurred(true); setReceiverMsg(null); setCurrentMsgId(null); setScreen(SCREENS.RECEIVER); };

  const handleSend = async () => {
    setSending(true); setSendError("");
    try {
      const saved = await supabaseInsert({
        receiver_name: form.name,
        receiver_contact: form.contact,
        message: form.message,
        sender_name: form.senderName || null,
        is_premium: false,
        reveal_enabled: true,
        delivery_status: "pending",
      });
      setSentMsgId(saved.id);
      setScreen(SCREENS.SENT);
    } catch(e) {
      setSendError("Kuch gadbad ho gayi, dobara try karo 😕");
    } finally {
      setSending(false);
    }
  };

  // ── Cashfree Payment (Premium sender) ──────────────────
  const handlePremiumPayment = async () => {
    setPaymentLoading(true); setPaymentError("");
    try {
      const orderId = generateOrderId("PREMIUM");
      const order = await createCashfreeOrder(21, orderId, form.contact.includes("@") ? form.contact : "user@crushdrop.in");
      if (!order.payment_session_id) throw new Error("No session");

      const cashfree = await loadCashfreeSDK();
      const cf = new cashfree({ mode: "production" });

      cf.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_modal",
      }).then(async (result) => {
        if (result.error) { setPaymentError("Payment failed, try again 😕"); setPaymentLoading(false); return; }
        // verify
        const verify = await verifyCashfreePayment(orderId);
        if (verify.success) {
          const saved = await supabaseInsert({
            receiver_name: form.name,
            receiver_contact: form.contact,
            message: form.message,
            sender_name: form.senderName || null,
            is_premium: true,
            reveal_enabled: true,
            txn_id: orderId,
            delivery_status: "pending",
          });
          setSentMsgId(saved.id);
          setScreen(SCREENS.SENT);
        } else {
          setPaymentError("Payment not confirmed, try again 😕");
        }
        setPaymentLoading(false);
      });
    } catch(e) {
      setPaymentError("Kuch gadbad ho gayi 😕");
      setPaymentLoading(false);
    }
  };

  // ── Cashfree Payment (Reveal) ───────────────────────────
  const handleRevealPayment = async () => {
    if (!currentMsgId) return;
    setPaymentLoading(true); setPaymentError("");
    try {
      const orderId = generateOrderId("REVEAL");
      const order = await createCashfreeOrder(11, orderId, "user@crushdrop.in");
      if (!order.payment_session_id) throw new Error("No session");

      const cashfree = await loadCashfreeSDK();
      const cf = new cashfree({ mode: "production" });

      cf.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_modal",
      }).then(async (result) => {
        if (result.error) { setPaymentError("Payment failed, try again 😕"); setPaymentLoading(false); return; }
        const verify = await verifyCashfreePayment(orderId);
        if (verify.success) {
          await supabaseReveal(currentMsgId);
          const updated = await supabaseFetchById(currentMsgId);
          setReceiverMsg(updated);
          setRevealed(true);
          setScreen(SCREENS.RECEIVER);
        } else {
          setPaymentError("Payment not confirmed 😕");
        }
        setPaymentLoading(false);
      });
    } catch(e) {
      setPaymentError("Kuch gadbad ho gayi 😕");
      setPaymentLoading(false);
    }
  };

  const handleNativeShare = async () => {
    setShareStatus("generating");
    const result = await shareImage(shareVariant, shareSenderName);
    setShareStatus(result);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(APP_URL);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const receiverLink = sentMsgId ? `${APP_URL}/r/${sentMsgId}` : "";

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes petalFall{0%{transform:translateY(-40px) rotate(0deg);opacity:0;}10%{opacity:var(--op);}90%{opacity:var(--op);}100%{transform:translateY(110vh) rotate(200deg);opacity:0;}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
    @keyframes softPulse{0%,100%{box-shadow:0 4px 24px rgba(232,114,138,0.18);}50%{box-shadow:0 4px 40px rgba(232,114,138,0.38);}}
    @keyframes heartBeat{0%,100%{transform:scale(1);}30%{transform:scale(1.18);}60%{transform:scale(0.95);}}
    @keyframes revealSlide{from{opacity:0;transform:translateY(16px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
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
    .sub{color:#B08898;font-size:13px;text-align:center;line-height:1.65;margin-bottom:20px;}
    .feature-row{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;}
    .feature-icon{width:36px;height:36px;min-width:36px;background:linear-gradient(135deg,#FADADD,#F7C5D0);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;}
    .feature-text{font-size:13px;color:#7A5566;line-height:1.5;padding-top:3px;}
    .feature-title{font-weight:600;color:#4A3040;font-size:13px;}
    .divider{height:1px;background:linear-gradient(90deg,transparent,rgba(201,160,180,0.3),transparent);margin:18px 0;}
    .btn{width:100%;padding:16px;border-radius:16px;border:none;cursor:pointer;font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif;transition:transform 0.12s ease,opacity 0.12s ease;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
    .btn:active{transform:scale(0.97);opacity:0.9;}
    .btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
    .btn-primary{background:linear-gradient(135deg,#E8728A,#D45A75);color:white;animation:softPulse 3s ease-in-out infinite;box-shadow:0 4px 20px rgba(232,114,138,0.3);}
    .btn-ghost{background:rgba(232,114,138,0.07);color:#C9657D;border:1.5px solid rgba(232,114,138,0.2);margin-top:10px;}
    .btn-mauve{background:linear-gradient(135deg,#C9A0B4,#B08898);color:white;box-shadow:0 4px 16px rgba(201,160,180,0.35);}
    .btn-premium{background:linear-gradient(135deg,#FFD700,#FFA500,#FF6B6B);background-size:200% auto;color:white;box-shadow:0 4px 20px rgba(255,165,0,0.35);animation:shimmer 3s linear infinite;}
    .label{font-size:11px;font-weight:600;color:#B08898;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:7px;}
    .input{width:100%;background:rgba(253,232,238,0.4);border:1.5px solid rgba(201,160,180,0.25);border-radius:14px;padding:14px 16px;color:#3D2B35;font-size:16px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.2s,background 0.2s;margin-bottom:14px;-webkit-appearance:none;appearance:none;}
    .input::placeholder{color:#C9A0B4;font-size:14px;}
    .input:focus{border-color:rgba(232,114,138,0.5);background:rgba(255,255,255,0.9);}
    textarea.input{resize:none;height:90px;line-height:1.65;font-size:14px;}
    .toggle-row{display:flex;align-items:center;gap:13px;background:rgba(253,232,238,0.5);border:1.5px solid rgba(201,160,180,0.2);border-radius:16px;padding:14px 16px;cursor:pointer;margin-bottom:10px;transition:border-color 0.2s,background 0.2s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
    .toggle-row.on{border-color:rgba(232,114,138,0.35);background:rgba(232,114,138,0.06);}
    .toggle-row.premium-row{border-color:rgba(255,165,0,0.3);background:rgba(255,215,0,0.06);}
    .toggle-row.premium-row.on{border-color:rgba(255,165,0,0.5);background:rgba(255,215,0,0.1);}
    .pill-switch{width:44px;height:26px;background:#DCCCD4;border-radius:100px;position:relative;flex-shrink:0;transition:background 0.25s;}
    .pill-switch.on{background:#E8728A;}
    .pill-switch.premium-pill.on{background:linear-gradient(135deg,#FFD700,#FFA500);}
    .pill-switch::after{content:'';position:absolute;width:20px;height:20px;background:white;border-radius:50%;top:3px;left:3px;transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 1px 4px rgba(0,0,0,0.15);}
    .pill-switch.on::after{transform:translateX(18px);}
    .toggle-label{font-size:13.5px;color:#4A3040;font-weight:500;}
    .toggle-sub{font-size:12px;color:#B08898;margin-top:2px;}
    .receipt{background:rgba(253,232,238,0.4);border-radius:16px;padding:14px 16px;margin-bottom:16px;}
    .receipt-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:13.5px;border-bottom:1px solid rgba(201,160,180,0.15);}
    .receipt-row:last-child{border-bottom:none;padding-bottom:0;}
    .receipt-label{color:#B08898;}
    .receipt-val{font-weight:600;color:#3D2B35;}
    .receipt-total{color:#C9657D;font-size:17px;}
    .back-btn{background:none;border:none;color:#C9A0B4;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;padding:8px 0;margin-bottom:16px;display:flex;align-items:center;gap:4px;-webkit-tap-highlight-color:transparent;min-height:44px;}
    .step-bar{display:flex;gap:5px;justify-content:center;margin-bottom:22px;}
    .step-seg{height:3px;border-radius:100px;background:rgba(201,160,180,0.2);flex:1;max-width:60px;transition:background 0.3s;}
    .step-seg.done{background:#E8728A;}
    .msg-card{background:linear-gradient(135deg,#FFF5F7,#FDE8EE);border:1px solid rgba(232,114,138,0.18);border-radius:20px;padding:20px 18px;margin:16px 0;position:relative;}
    .anon-label{font-size:11px;color:#C9A0B4;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;}
    .msg-text{font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:#4A3040;line-height:1.75;border-left:2.5px solid #E8728A;padding-left:14px;transition:filter 0.4s ease;}
    .msg-text.blurred{filter:blur(6px);user-select:none;cursor:pointer;}
    .blur-overlay{position:absolute;inset:0;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;-webkit-tap-highlight-color:transparent;}
    .blur-cta{background:rgba(232,114,138,0.9);color:white;padding:10px 22px;border-radius:100px;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(232,114,138,0.4);min-height:44px;}
    .blur-sub{font-size:11px;color:rgba(60,30,40,0.6);}
    .more-crushes-box{background:linear-gradient(135deg,rgba(232,114,138,0.08),rgba(201,160,180,0.1));border:1.5px solid rgba(232,114,138,0.2);border-radius:16px;padding:16px;margin-top:12px;cursor:pointer;-webkit-tap-highlight-color:transparent;}
    .more-crushes-box:active{opacity:0.85;}
    .more-crushes-title{font-size:14px;font-weight:600;color:#4A3040;margin-bottom:4px;}
    .more-crushes-sub{font-size:12.5px;color:#B08898;}
    .referral-box{background:linear-gradient(135deg,#FFF0F3,#FDE8EE);border:1.5px dashed rgba(232,114,138,0.3);border-radius:20px;padding:18px;margin:14px 0;text-align:center;}
    .referral-emoji{font-size:30px;margin-bottom:8px;}
    .referral-title{font-size:15px;font-weight:600;color:#3D2B35;margin-bottom:4px;}
    .referral-sub{font-size:13px;color:#B08898;margin-bottom:12px;line-height:1.5;}
    .link-box{background:rgba(232,114,138,0.07);border:1.5px solid rgba(232,114,138,0.2);border-radius:14px;padding:12px 16px;font-size:12px;color:#C9657D;word-break:break-all;margin-bottom:10px;text-align:center;font-weight:500;}
    .reveal-result{animation:revealSlide 0.5s cubic-bezier(0.22,1,0.36,1) forwards;background:linear-gradient(135deg,#FFF0F3,white);border:1.5px solid rgba(232,114,138,0.25);border-radius:20px;padding:24px 18px;text-align:center;}
    .reveal-name{font-family:'Cormorant Garamond',serif;font-size:36px;font-style:italic;color:#C9657D;margin:10px 0 4px;animation:heartBeat 1s ease-in-out;}
    .badge{display:inline-flex;align-items:center;gap:5px;background:rgba(232,114,138,0.1);border:1px solid rgba(232,114,138,0.2);border-radius:100px;padding:5px 14px;font-size:12px;color:#C9657D;font-weight:500;margin-bottom:16px;}
    .success-circle{width:72px;height:72px;background:linear-gradient(135deg,#FADADD,#F7C5D0);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 18px;box-shadow:0 4px 20px rgba(232,114,138,0.22);}
    .demo-row{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;flex-wrap:wrap;}
    .demo-chip{background:rgba(201,160,180,0.12);border:1px solid rgba(201,160,180,0.2);border-radius:100px;padding:7px 16px;font-size:12px;color:#C9A0B4;cursor:pointer;font-family:'DM Sans',sans-serif;-webkit-tap-highlight-color:transparent;min-height:36px;}
    .demo-chip:active{background:rgba(232,114,138,0.1);color:#C9657D;}
    .story-preview{width:100%;aspect-ratio:9/16;max-height:260px;background:linear-gradient(160deg,#FFF0F3,#FDE8EE,#F5D5E8);border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1.5px solid rgba(232,114,138,0.18);margin-bottom:18px;position:relative;overflow:hidden;}
    .story-preview-text{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:17px;color:#4A3040;text-align:center;line-height:1.5;padding:0 18px;}
    .story-url{background:rgba(232,114,138,0.12);border-radius:100px;padding:5px 14px;font-size:11px;color:#C9657D;font-weight:600;}
    .share-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
    .share-btn{display:flex;align-items:center;gap:8px;padding:14px 12px;border-radius:14px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;-webkit-tap-highlight-color:transparent;touch-action:manipulation;min-height:52px;}
    .share-btn:active{opacity:0.85;transform:scale(0.97);}
    .share-btn-ig{background:linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7);color:white;}
    .share-btn-sc{background:#FFFC00;color:#000;}
    .share-btn-wa{background:#25D366;color:white;}
    .share-btn-tw{background:#000;color:white;}
    .share-btn-copy{grid-column:1/-1;background:rgba(232,114,138,0.08);border:1.5px solid rgba(232,114,138,0.2);color:#C9657D;}
    .share-icon{font-size:18px;}
    .spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,0.4);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0;}
    .native-share-btn{width:100%;padding:17px;border-radius:16px;border:none;background:linear-gradient(135deg,#E8728A,#D45A75);color:white;font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;margin-bottom:12px;box-shadow:0 4px 20px rgba(232,114,138,0.3);display:flex;align-items:center;justify-content:center;gap:10px;-webkit-tap-highlight-color:transparent;min-height:56px;}
    .native-share-btn:active{opacity:0.9;transform:scale(0.98);}
    .status-note{text-align:center;font-size:12px;color:#C9A0B4;margin-top:6px;line-height:1.6;}
    .premium-badge{display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,165,0,0.15));border:1px solid rgba(255,165,0,0.3);border-radius:100px;padding:3px 10px;font-size:11px;font-weight:600;color:#B8860B;margin-bottom:10px;}
    .loading-box{text-align:center;padding:40px 20px;color:#C9A0B4;font-size:14px;}
    .pay-btn-wrap{margin-top:6px;}
    .error-text{color:#E8728A;font-size:13px;margin-bottom:10px;text-align:center;}
    .trust-strip{display:flex;justify-content:space-between;gap:8px;margin:18px 0 4px;padding-top:16px;border-top:1px solid rgba(201,160,180,0.18);}
    .trust-item{flex:1;text-align:center;font-size:11px;color:#9B7F8A;line-height:1.4;}
    .trust-item-icon{font-size:16px;display:block;margin-bottom:3px;}
    .app-footer{width:100%;max-width:420px;text-align:center;margin-top:18px;padding:0 12px;}
    .app-footer-links{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-bottom:8px;}
    .app-footer-links a{font-size:11.5px;color:#B08898;text-decoration:none;}
    .app-footer-note{font-size:11px;color:#C9B5BF;line-height:1.6;}
    .demo-tag{display:inline-block;background:rgba(201,160,180,0.15);color:#9B7F8A;font-size:10.5px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;border-radius:6px;padding:3px 8px;margin-bottom:10px;}
  `;

  // ── LANDING ─────────────────────────────────────────────
  const Landing = () => (
    <div className="card">
      <div className="wordmark">CrushDrop 💌</div>
      <div className="tagline">Anonymous confessions, delivered with love</div>
      <div className="hero-icon">💌</div>
      <h2>Say what your heart can't</h2>
      <p className="sub">Send an anonymous message to your crush — <strong>completely free</strong>.<br/>They'll never know it's you — unless you want them to.</p>
      <div style={{marginBottom:22}}>
        {[
          ["💌","Send it anonymously — FREE","Your name stays hidden. Zero cost to send."],
          ["🔐","Reveal when you're ready","They pay ₹11 to find out — you decide"],
          ["✨","Premium animated cards","Send a beautiful heart card for just ₹21"],
          ["📸","Share on Instagram & Snapchat","Story cards, one tap to share"],
        ].map(([icon,title,desc]) => (
          <div className="feature-row" key={title}>
            <div className="feature-icon">{icon}</div>
            <div className="feature-text"><div className="feature-title">{title}</div><div>{desc}</div></div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" onClick={()=>setScreen(SCREENS.FORM)}>Send a secret message — FREE 💗</button>
      <div className="trust-strip">
        <div className="trust-item"><span className="trust-item-icon">🔒</span>Your identity stays private until you choose to reveal it</div>
        <div className="trust-item"><span className="trust-item-icon">💳</span>Payments via Cashfree, a licensed RBI payment gateway</div>
        <div className="trust-item"><span className="trust-item-icon">🤐</span>We never share your data with anyone except the receiver</div>
      </div>
      <div className="demo-row">
        <span style={{color:"#C9A0B4",fontSize:12}}>See demo:</span>
        <button className="demo-chip" onClick={goReceiver}>👁 Receiver's view</button>
        <button className="demo-chip" onClick={()=>goShare("sender")}>📸 Share screen</button>
      </div>
    </div>
  );

  // ── PAYMENT (Premium sender) ─────────────────────────────
  const Payment = () => (
    <div className="card">
      <button className="back-btn" onClick={()=>setScreen(SCREENS.FORM)}>← Back</button>
      <div className="step-bar">{[true,true,false].map((d,i)=><div key={i} className={`step-seg ${d?"done":""}`}/>)}</div>
      <div className="premium-badge">✨ Premium Message</div>
      <h2 style={{textAlign:"left"}}>One small payment 💳</h2>
      <p className="sub" style={{textAlign:"left",marginBottom:16}}>Your animated card goes out the moment payment confirms.</p>
      <div className="receipt">
        <div className="receipt-row"><span className="receipt-label">Premium animated card</span><span className="receipt-val">₹21</span></div>
        <div className="receipt-row"><span className="receipt-label">Reveal option</span><span className="receipt-val" style={{color:"#C9A0B4"}}>Free</span></div>
        <div className="receipt-row"><span className="receipt-label">Total</span><span className="receipt-val receipt-total">₹21</span></div>
      </div>
      {paymentError && <p className="error-text">{paymentError}</p>}
      <div className="pay-btn-wrap">
        <button className="btn btn-premium" onClick={handlePremiumPayment} disabled={paymentLoading}>
          {paymentLoading ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span className="spinner"/> Processing...</span> : "Pay ₹21 & Send ✨"}
        </button>
      </div>
      <p style={{textAlign:"center",fontSize:11,color:"#C9A0B4",marginTop:10}}>UPI · Cards · Net Banking · Wallets</p>
    </div>
  );

  // ── SENT ────────────────────────────────────────────────
  const Sent = () => (
    <div className="card" style={{textAlign:"center"}}>
      <div className="step-bar">{[true,true,true].map((d,i)=><div key={i} className={`step-seg ${d?"done":""}`}/>)}</div>
      <div className="success-circle">🎉</div>
      <h2>Message sent!</h2>
      <p className="sub" style={{marginBottom:18}}><strong>{form.name}</strong> will receive it any moment.<br/>Let the butterflies begin... 🦋</p>
      {receiverLink && <>
        <p style={{fontSize:12,color:"#B08898",marginBottom:6}}>Share this link with {form.name}:</p>
        <div className="link-box">{receiverLink}</div>
        <button className="btn btn-ghost" style={{marginTop:0,marginBottom:14}} onClick={()=>{
          navigator.clipboard.writeText(receiverLink);
          alert(`Link copied! 💌 Send this to ${form.name}`);
        }}>🔗 Copy their link</button>
      </>}
      <button className="btn btn-primary" style={{marginBottom:10}} onClick={()=>goShare("sender")}>📸 Share on Instagram & Snapchat</button>
      <div className="referral-box">
        <div className="referral-emoji">👀</div>
        <div className="referral-title">Does someone secretly like you too?</div>
        <div className="referral-sub">Share your CrushDrop link and find out 💗</div>
        <button className="btn btn-ghost" style={{marginTop:0}} onClick={()=>{
          navigator.clipboard.writeText(`${APP_URL}/for/me`);
          alert("Link copied! Share on Instagram bio or WhatsApp status 💌");
        }}>🔗 Copy my CrushDrop link</button>
      </div>
      <button className="btn btn-ghost" onClick={goLanding}>Send another 💗</button>
    </div>
  );

  // ── RECEIVER ────────────────────────────────────────────
  const Receiver = () => {
    if (receiverLoading) return (
      <div className="card"><div className="loading-box"><div style={{fontSize:32,marginBottom:12}}>💌</div><div>Loading your message...</div></div></div>
    );
    const msg = receiverMsg;
    const displayMessage = msg?.message || "Every time you smile, I completely forget what I was going to say. I've been meaning to tell you this for a long time... 🥺";
    const displayName = msg?.receiver_name || "Priya";
    const revealEnabled = msg ? msg.reveal_enabled : true;
    const isRevealed = revealed || msg?.is_revealed;
    const senderName = msg?.sender_name;

    return (
      <div className="card">
        <div className="wordmark">CrushDrop 💌</div>
        {!msg && <div style={{textAlign:"center"}}><span className="demo-tag">Demo preview</span></div>}
        <div style={{textAlign:"center",marginBottom:6}}><div className="badge">💌 Someone sent you a secret message</div></div>
        <h2 style={{marginBottom:4}}>Hey {displayName} 🌸</h2>
        <p className="sub">Someone has been thinking about you...</p>
        <div className="msg-card">
          <div className="anon-label">Anonymous message</div>
          <div style={{position:"relative"}}>
            <div className={`msg-text ${messageBlurred?"blurred":""}`} onClick={()=>messageBlurred&&setMessageBlurred(false)}>"{displayMessage}"</div>
            {messageBlurred && (
              <div className="blur-overlay" onClick={()=>setMessageBlurred(false)}>
                <button className="blur-cta">👁 Tap to read message</button>
                <div className="blur-sub">Free to read</div>
              </div>
            )}
          </div>
          <div style={{fontSize:11,color:"#C9A0B4",marginTop:12,textAlign:"right"}}>Sent with love · just now</div>
        </div>
        {isRevealed ? (
          <div className="reveal-result">
            <div style={{fontSize:36,marginBottom:8}}>🎉</div>
            <div style={{fontSize:13,color:"#C9A0B4",marginBottom:4}}>Your secret admirer is...</div>
            <div className="reveal-name">{senderName || "Anonymous 🙈"}</div>
            {!senderName && <div style={{fontSize:13,color:"#B08898",marginBottom:12}}>They chose to stay anonymous 🤫</div>}
            <button className="btn btn-primary" style={{animation:"none",boxShadow:"none",marginBottom:10,marginTop:16}} onClick={()=>goShare("receiver", senderName)}>📸 Share this moment!</button>
            <button className="btn btn-ghost" onClick={goLanding}>Send your own crush message 💌</button>
          </div>
        ) : (
          <>
            {revealEnabled && (
              <>
                <p style={{textAlign:"center",fontSize:13,color:"#9B7F8A",marginBottom:14}}>Want to know who sent this? 👀</p>
                {paymentError && <p className="error-text">{paymentError}</p>}
                <button className="btn btn-mauve" onClick={handleRevealPayment} disabled={paymentLoading}>
                  {paymentLoading
                    ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span className="spinner"/> Processing...</span>
                    : "🔓 Reveal their name — ₹11"}
                </button>
                <p style={{textAlign:"center",fontSize:12,color:"#C9A0B4",marginTop:10}}>UPI · Cards · Net Banking · Wallets</p>
              </>
            )}
            <div className="more-crushes-box" onClick={()=>goShare("receiver", senderName)}>
              <div className="more-crushes-title">👀 Want to know if someone else likes you?</div>
              <div className="more-crushes-sub">Share your own CrushDrop link and find out →</div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ── RECEIVER NOT FOUND ───────────────────────────────────
  const ReceiverNotFound = () => (
    <div className="card" style={{textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:16}}>💔</div>
      <h2>Message not found</h2>
      <p className="sub" style={{marginBottom:24}}>This link may have expired or is invalid.</p>
      <button className="btn btn-primary" onClick={goLanding}>Send your own crush message 💌</button>
    </div>
  );

  // ── SHARE ────────────────────────────────────────────────
  const Share = () => {
    const senderText = shareVariant==="sender"
      ? `I just sent my crush an anonymous message 😏 Find out who has a crush on YOU 👇`
      : `Someone secretly has a crush on me 🥺 Find out who likes YOU 👇`;
    const fullText = `${senderText}\n\n${APP_URL}`;
    return (
      <div className="card">
        <button className="back-btn" onClick={()=>setScreen(shareVariant==="sender"?SCREENS.SENT:SCREENS.RECEIVER)}>← Back</button>
        <h2 style={{marginBottom:6}}>Share the moment 📸</h2>
        <p className="sub" style={{marginBottom:16}}>{shareVariant==="sender"?"Tell the world you shot your shot 😏":"Show everyone someone has a crush on you 🥺"}</p>
        <div className="story-preview">
          <div style={{fontSize:48}}>💌</div>
          <div className="story-preview-text">{shareVariant==="sender"?"I just sent my crush\nan anonymous message 😏":"Someone secretly\nhas a crush on me 🥺"}</div>
          <div style={{fontSize:11,color:"#B08898"}}>Find out who likes YOU 👇</div>
          <div className="story-url">crushdrop.vercel.app</div>
          <div style={{position:"absolute",bottom:8,right:12,fontSize:10,color:"rgba(201,160,180,0.5)"}}>Preview</div>
        </div>
        <button className="native-share-btn" onClick={handleNativeShare}>
          {shareStatus==="generating"?<><div className="spinner"/>Generating...</>:shareStatus==="shared"?<>✅ Shared!</>:shareStatus==="downloaded"?<>✅ Downloaded!</>:<>📤 Share to Instagram / Snapchat / WhatsApp</>}
        </button>
        {shareStatus==="downloaded"&&<div className="status-note">Image saved! Open Instagram Stories or Snapchat and add from gallery 📱</div>}
        <div className="divider"/>
        <div className="share-grid">
          <button className="share-btn share-btn-ig" onClick={()=>window.open("https://www.instagram.com/","_blank")}><span className="share-icon">📸</span>Instagram</button>
          <button className="share-btn share-btn-sc" onClick={()=>window.open("https://www.snapchat.com/","_blank")}><span className="share-icon">👻</span>Snapchat</button>
          <button className="share-btn share-btn-wa" onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`,"_blank")}><span className="share-icon">💬</span>WhatsApp</button>
          <button className="share-btn share-btn-tw" onClick={()=>window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`,"_blank")}><span className="share-icon">🐦</span>Twitter/X</button>
          <button className="share-btn share-btn-copy" onClick={handleCopy}><span className="share-icon">{copied?"✅":"🔗"}</span>{copied?"Link copied!":"Copy link"}</button>
        </div>
        <div className="status-note" style={{marginTop:4}}>💡 Tap "Share" above — opens directly in Instagram/Snapchat story editor!</div>
      </div>
    );
  };

  const render = () => {
    switch(screen) {
      case SCREENS.LANDING:           return <Landing/>;
      case SCREENS.FORM:              return <FormScreen form={form} setForm={setForm} setScreen={setScreen} onSend={handleSend} sending={sending} sendError={sendError}/>;
      case SCREENS.PAYMENT:           return <Payment/>;
      case SCREENS.SENT:              return <Sent/>;
      case SCREENS.RECEIVER:          return <Receiver/>;
      case SCREENS.RECEIVER_NOT_FOUND:return <ReceiverNotFound/>;
      case SCREENS.SHARE:             return <Share/>;
      default:                        return <Landing/>;
    }
  };

  return (
    <div className="app">
      <style>{css}</style>
      {petals.map((p,i)=>(
        <div key={i} className="petal" style={{"--left":p.left,"--size":p.size,"--dur":p.duration,"--delay":p.delay,"--op":p.opacity}}>🌸</div>
      ))}
      {render()}
      <div className="app-footer">
        <div className="app-footer-links">
          <a href={`mailto:support@crushdrop.in`}>Contact support</a>
          <a href="#" onClick={(e)=>{e.preventDefault(); alert("CrushDrop Privacy Policy\n\nWe collect only what's needed to deliver your message: the receiver's name/contact and your message text. We never sell or share this data. Payments are processed securely by Cashfree — we never see your card or UPI details.");}}>Privacy policy</a>
          <a href="#" onClick={(e)=>{e.preventDefault(); alert("Refunds\n\nIf a payment is deducted but a reveal or premium card doesn't go through, email support@crushdrop.in with your transaction ID and we'll refund within 5-7 business days.");}}>Refunds</a>
        </div>
        <div className="app-footer-note">Made in India 🇮🇳 · CrushDrop is an independent project, not affiliated with Instagram or Snapchat</div>
      </div>
    </div>
  );
}
