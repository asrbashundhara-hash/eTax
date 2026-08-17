/*
 * TaxReturn BD frontend configuration.
 * Replace only the two CONFIG values.
 * The publishable key is intended for browser use; never put a secret/service_role key here.
 */
const CONFIG = {
  SUPABASE_URL: "https://ehhsudxrjgkzwousvmpg.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "PASTE_COMPLETE_SB_PUBLISHABLE_KEY_HERE"
};

let sb = null;
let mode = "login";
let currentReturn = null;

const $ = (id) => document.getElementById(id);

function setMessage(id, text, type = "") {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.className = "message " + type;
}

function configured() {
  return CONFIG.SUPABASE_URL.startsWith("https://") &&
    CONFIG.SUPABASE_URL.includes(".supabase.co") &&
    CONFIG.SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");
}

function initSupabase() {
  if (!configured()) {
    console.warn("Supabase is not configured. Put the complete sb_publishable_ key in assets/app.js.");
    return false;
  }
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase JavaScript library did not load.");
    return false;
  }
  sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_PUBLISHABLE_KEY);
  return true;
}

function money(n) {
  return new Intl.NumberFormat("en-BD", {maximumFractionDigits: 0}).format(Number(n) || 0);
}

function go(hash) {
  location.hash = hash;
}

function showAuth(which) {
  mode = which;
  $("auth").classList.remove("hidden");
  $("authTitle").textContent = which === "login" ? "Sign in" : "Create account";
  $("nameWrap").classList.toggle("hidden", which === "login");
  $("authSubmit").textContent = which === "login" ? "Sign in" : "Create account";
  $("authSwitch").innerHTML = which === "login"
    ? 'New here? <button type="button" class="text-button" onclick="showAuth(\'signup\')">Create account</button>'
    : 'Already registered? <button type="button" class="text-button" onclick="showAuth(\'login\')">Sign in</button>';
  if (!configured()) {
    setMessage("authMsg", "Supabase is not configured. Add the complete sb_publishable_ key in assets/app.js.", "error");
  } else if (!window.supabase) {
    setMessage("authMsg", "Supabase library has not loaded. Check your internet connection and refresh.", "error");
  } else {
    setMessage("authMsg", "");
  }
}

function hideAuth() {
  $("auth").classList.add("hidden");
}

async function getSession() {
  if (!sb) return null;
  const result = await sb.auth.getSession();
  return result.data.session || null;
}

async function signOut() {
  if (sb) await sb.auth.signOut();
  currentReturn = null;
  go("home");
  renderAuth(null);
}

function renderAuth(session) {
  $("authActions").innerHTML = session
    ? '<button class="btn ghost" type="button" onclick="signOut()">Sign out</button>'
    : '<button class="btn primary" type="button" onclick="showAuth(\'login\')">Sign in</button>';
}

async function submitAuth(event) {
  event.preventDefault();

  if (!sb) {
    setMessage("authMsg", "Supabase is not ready. Confirm your publishable key and refresh the site.", "error");
    return;
  }

  const email = $("email").value.trim();
  const password = $("password").value;

  $("authSubmit").disabled = true;
  $("authSubmit").textContent = mode === "signup" ? "Creating..." : "Signing in...";

  try {
    let result;

    if (mode === "signup") {
      result = await sb.auth.signUp({
        email,
        password,
        options: {
          data: {full_name: $("fullName").value.trim()}
        }
      });
    } else {
      result = await sb.auth.signInWithPassword({email, password});
    }

    if (result.error) {
      setMessage("authMsg", result.error.message, "error");
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("authMsg", "Account created. Check your email to confirm the account, then sign in.", "success");
      return;
    }

    hideAuth();
    go("dashboard");
  } catch (error) {
    console.error(error);
    setMessage("authMsg", error.message || "Authentication failed.", "error");
  } finally {
    $("authSubmit").disabled = false;
    $("authSubmit").textContent = mode === "signup" ? "Create account" : "Sign in";
  }
}

async function loadDashboard() {
  if (!sb) return;

  const session = await getSession();
  if (!session) {
    showAuth("login");
    return;
  }

  renderAuth(session);
  $("dashboard").classList.remove("hidden");
  $("return").classList.add("hidden");

  const result = await sb
    .from("tax_returns")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", {ascending: false});

  if (result.error) {
    $("dashboardContent").innerHTML =
      '<div class="table-card error">' + escapeHtml(result.error.message) + "</div>";
    return;
  }

  let html = '<div class="table-card">';
  html += '<div class="return-row"><div><b>' +
    escapeHtml(session.user.user_metadata?.full_name || session.user.email) +
    '</b><div class="muted">' + escapeHtml(session.user.email) +
    '</div></div><button class="btn primary" type="button" onclick="newReturn()">New return</button></div>';

  if (!result.data || result.data.length === 0) {
    html += '<p class="muted">No returns yet. Create your first return.</p>';
  } else {
    for (const row of result.data) {
      html += '<div class="return-row"><div><b>' + escapeHtml(row.tax_year) +
        '</b><div class="muted">Gross income ৳ ' + money(row.gross_income) +
        '</div></div><span class="badge">' + escapeHtml(row.status) + '</span></div>';
    }
  }

  html += "</div>";
  $("dashboardContent").innerHTML = html;
}

function newReturn() {
  currentReturn = null;
  $("returnForm").reset();
  calc();
  go("return");
}

function showReturn() {
  $("dashboard").classList.add("hidden");
  $("return").classList.remove("hidden");
}

function calc() {
  const form = new FormData($("returnForm"));
  const fields = [
    "employment_income",
    "business_income",
    "rental_income",
    "financial_income",
    "capital_gain",
    "other_income"
  ];

  const gross = fields.reduce((sum, key) => sum + Number(form.get(key) || 0), 0);
  const investment = Number(form.get("investment") || 0);
  const withholding = Number(form.get("withholding") || 0);
  const advanceTax = Number(form.get("advance_tax") || 0);

  const taxable = Math.max(0, gross - investment);
  const estimatedTax = Math.max(0, taxable * 0.10 - withholding - advanceTax);

  $("gross").textContent = "৳ " + money(gross);
  $("payable").textContent = "৳ " + money(estimatedTax);
  $("heroTax").textContent = money(estimatedTax);

  return {gross, taxable, estimatedTax};
}

async function saveReturn(status) {
  if (!sb) {
    setMessage("returnMessage", "Supabase is not ready. Check assets/app.js and refresh.", "error");
    return;
  }

  const session = await getSession();
  if (!session) {
    showAuth("login");
    return;
  }

  const form = new FormData($("returnForm"));
  const calculation = calc();

  const row = {
    user_id: session.user.id,
    tax_year: String(form.get("tax_year")),
    employment_income: Number(form.get("employment_income") || 0),
    business_income: Number(form.get("business_income") || 0),
    rental_income: Number(form.get("rental_income") || 0),
    financial_income: Number(form.get("financial_income") || 0),
    capital_gain: Number(form.get("capital_gain") || 0),
    other_income: Number(form.get("other_income") || 0),
    investment: Number(form.get("investment") || 0),
    expenditure: Number(form.get("expenditure") || 0),
    assets: Number(form.get("assets") || 0),
    liabilities: Number(form.get("liabilities") || 0),
    withholding: Number(form.get("withholding") || 0),
    advance_tax: Number(form.get("advance_tax") || 0),
    gross_income: calculation.gross,
    estimated_tax: calculation.estimatedTax,
    status
  };

  let result;

  if (currentReturn) {
    result = await sb
      .from("tax_returns")
      .update(row)
      .eq("id", currentReturn)
      .eq("user_id", session.user.id);
  } else {
    result = await sb.from("tax_returns").insert(row);
  }

  if (result.error) {
    setMessage("returnMessage", result.error.message, "error");
    return;
  }

  setMessage(
    "returnMessage",
    status === "SUBMITTED"
      ? "Return validated and marked submitted in your workspace."
      : "Draft saved successfully.",
    "success"
  );

  setTimeout(() => go("dashboard"), 700);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function route() {
  const hash = location.hash || "#home";
  document.querySelectorAll(".page, .app-section").forEach(el => {
    if (el.classList.contains("page")) el.classList.remove("hidden");
  });
  $("dashboard").classList.add("hidden");
  $("return").classList.add("hidden");

  const session = await getSession();
  renderAuth(session);

  if (hash === "#dashboard") {
    document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
    if (session) await loadDashboard();
    else showAuth("login");
  } else if (hash === "#return") {
    document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
    if (session) showReturn();
    else showAuth("login");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  $("authForm").addEventListener("submit", submitAuth);
  $("returnForm").addEventListener("input", calc);

  const ready = initSupabase();

  if (ready) {
    sb.auth.onAuthStateChange(() => {
      renderAuth(null);
    });
  }

  calc();
  await route();
});
window.addEventListener("hashchange", route);
