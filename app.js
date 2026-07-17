// ============================================================
//  Mini-CRM · lógica (Supabase + Auth + Contactos con editar)
// ============================================================

// ===== Conexión a Supabase (mismo proyecto) =====
const SUPABASE_URL = "https://apwmkhkxobymfjzoelsq.supabase.co";
const SUPABASE_KEY = "sb_publishable_RoFqDdGcNs5RncEHTOFFHQ_ljLdr3Ug";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
//  TEMA (claro / oscuro)
// ============================================================
function cambiarTema() {
  document.body.classList.toggle("tema-oscuro");
  const oscuro = document.body.classList.contains("tema-oscuro");
  document.getElementById("btnTema").textContent = oscuro ? "☀️" : "🌙";
  localStorage.setItem("tema", oscuro ? "oscuro" : "claro");
}
if (localStorage.getItem("tema") === "oscuro") {
  document.body.classList.add("tema-oscuro");
  document.getElementById("btnTema").textContent = "☀️";
}

// ============================================================
//  NAVEGACIÓN de auth (bienvenida / login / registro)
// ============================================================
function irAInicio(e) { if (e) e.preventDefault(); mostrarPantalla("inicioView"); }
function irARegistro(e) { if (e) e.preventDefault(); mostrarPantalla("registerView"); }
function irALogin(e) { if (e) e.preventDefault(); mostrarPantalla("loginView"); }

function mostrarPantalla(cual) {
  ["inicioView", "loginView", "registerView"].forEach(function (id) {
    document.getElementById(id).classList.toggle("oculto", id !== cual);
  });
  const v = document.getElementById(cual);
  v.classList.remove("aparece"); void v.offsetWidth; v.classList.add("aparece");
}

// ============================================================
//  LOGIN
// ============================================================
async function iniciarSesion() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const estado = document.getElementById("loginEstado");
  if (!email || !password) { estado.textContent = "⚠️ Escribe tu correo y contraseña."; return; }
  const { error } = await db.auth.signInWithPassword({ email: email, password: password });
  if (error) {
    let msg = error.message;
    if (msg.toLowerCase().includes("not confirmed")) msg = "Confirma tu correo antes de entrar.";
    estado.textContent = "⚠️ " + msg;
  }
}

// ============================================================
//  REGISTRO (validaciones + fuerza)
// ============================================================
function validarRegistro() {
  const nombre = document.getElementById("regNombre").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const pass = document.getElementById("regPassword").value;
  const conf = document.getElementById("regConfirmar").value;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  document.getElementById("errNombre").textContent = "";
  document.getElementById("errEmail").textContent = (email && !emailOk) ? "Correo con formato inválido." : "";
  document.getElementById("errPassword").textContent = (pass && pass.length < 8) ? "Mínimo 8 caracteres." : "";
  document.getElementById("errConfirmar").textContent = (conf && conf !== pass) ? "Las contraseñas no coinciden." : "";

  actualizarFuerza(pass);

  const todoValido = nombre !== "" && emailOk && pass.length >= 8 && conf !== "" && conf === pass;
  document.getElementById("btnCrearCuenta").disabled = !todoValido;
  return todoValido;
}

function togglePass(id, btn) {
  const inp = document.getElementById(id);
  const mostrar = inp.type === "password";
  inp.type = mostrar ? "text" : "password";
  btn.textContent = mostrar ? "🙈" : "👁️";
}

function actualizarFuerza(pass) {
  const fill = document.getElementById("fuerzaFill");
  const texto = document.getElementById("fuerzaTexto");
  if (!fill) return;
  if (!pass) { fill.style.width = "0"; texto.textContent = ""; return; }
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
  const niveles = [
    { w: "33%", c: "#dc2626", t: "Débil" },
    { w: "66%", c: "#f59e0b", t: "Media" },
    { w: "100%", c: "#16a34a", t: "Fuerte" }
  ];
  const n = niveles[Math.min(2, Math.max(0, score - 1))];
  fill.style.width = n.w; fill.style.background = n.c;
  texto.textContent = n.t; texto.style.color = n.c;
}

async function crearCuenta() {
  if (!validarRegistro()) return;
  const nombre = document.getElementById("regNombre").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const pass = document.getElementById("regPassword").value;
  const boton = document.getElementById("btnCrearCuenta");
  const estado = document.getElementById("registroEstado");

  boton.disabled = true;
  boton.textContent = "Creando cuenta…";
  estado.textContent = "";

  const { data, error } = await db.auth.signUp({ email: email, password: pass, options: { data: { full_name: nombre } } });

  boton.textContent = "Crear cuenta";
  if (error) { estado.textContent = "⚠️ " + error.message; boton.disabled = false; return; }
  if (data.session) {
    estado.textContent = "✅ ¡Cuenta creada! Entrando…";
  } else {
    estado.textContent = "✅ ¡Cuenta creada! Ya puedes iniciar sesión.";
    setTimeout(function () { mostrarPantalla("loginView"); }, 1800);
  }
}

// ============================================================
//  LOGOUT + control de sesión
// ============================================================
async function cerrarSesion() { await db.auth.signOut(); }

db.auth.onAuthStateChange(function (event, session) { mostrarVista(session); });

function mostrarVista(session) {
  const appView = document.getElementById("appView");
  if (session) {
    ["inicioView", "loginView", "registerView"].forEach(function (id) { document.getElementById(id).classList.add("oculto"); });
    appView.classList.remove("oculto");
    document.getElementById("usuarioEmail").textContent = "👤 " + session.user.email;
    cargarContactos();
  } else {
    appView.classList.add("oculto");
    mostrarPantalla("inicioView");
  }
}

async function init() {
  const { data } = await db.auth.getSession();
  mostrarVista(data.session);
}
init();

// ============================================================
//  CONTACTOS (CRUD + editar + buscar) — RLS filtra por usuario
// ============================================================
let todosContactos = [];
let editandoContactoId = null;

async function cargarContactos() {
  const { data, error } = await db.from("contactos").select("*").order("created_at", { ascending: false });
  if (error) { document.getElementById("estado").textContent = "⚠️ Error al cargar: " + error.message; return; }
  todosContactos = data;
  document.getElementById("estado").textContent = data.length + " contacto(s)";
  filtrar();
}

function filtrar() {
  const q = document.getElementById("buscador").value.trim().toLowerCase();
  const lista = todosContactos.filter(function (c) {
    return (c.nombre || "").toLowerCase().includes(q) ||
           (c.email || "").toLowerCase().includes(q) ||
           (c.empresa || "").toLowerCase().includes(q);
  });
  renderContactos(lista);
}

function renderContactos(contactos) {
  const cont = document.getElementById("lista");
  cont.innerHTML = "";
  if (contactos.length === 0) { cont.innerHTML = '<p class="vacio">No hay contactos. ¡Agrega el primero!</p>'; return; }
  contactos.forEach(function (c) {
    const card = document.createElement("div");
    card.className = "tarjeta-contacto";
    let datos = "";
    if (c.email) datos += '<span>✉️ ' + escapar(c.email) + '</span>';
    if (c.telefono) datos += '<span>📞 ' + escapar(c.telefono) + '</span>';
    if (c.empresa) datos += '<span>🏢 ' + escapar(c.empresa) + '</span>';
    card.innerHTML =
      '<div class="c-top">' +
        '<span class="c-nombre">' + escapar(c.nombre) + '</span>' +
        '<div class="c-acciones">' +
          '<button class="icono-btn" title="Editar" onclick="iniciarEdicionContacto(' + c.id + ')">✏️</button>' +
          '<button class="icono-btn" title="Borrar" onclick="borrarContacto(' + c.id + ')">🗑️</button>' +
        '</div>' +
      '</div>' +
      '<div class="c-datos">' + datos + '</div>' +
      (c.notas ? '<p class="c-notas">' + escapar(c.notas) + '</p>' : '');
    cont.appendChild(card);
  });
}

function escapar(txt) { const d = document.createElement("div"); d.textContent = txt; return d.innerHTML; }

// Guardar: crea uno nuevo, o actualiza si estamos editando
async function guardarContacto() {
  const nombre = document.getElementById("cNombre").value.trim();
  const estado = document.getElementById("formEstado");
  if (nombre === "") { estado.textContent = "⚠️ El nombre es obligatorio."; return; }

  const contacto = {
    nombre: nombre,
    email: document.getElementById("cEmail").value.trim() || null,
    telefono: document.getElementById("cTelefono").value.trim() || null,
    empresa: document.getElementById("cEmpresa").value.trim() || null,
    notas: document.getElementById("cNotas").value.trim() || null
  };

  let error;
  if (editandoContactoId) {
    ({ error } = await db.from("contactos").update(contacto).eq("id", editandoContactoId));
  } else {
    ({ error } = await db.from("contactos").insert(contacto));
  }
  if (error) { estado.textContent = "⚠️ Error: " + error.message; return; }

  limpiarFormulario();
  estado.textContent = "✅ Guardado.";
  setTimeout(function () { estado.textContent = ""; }, 1500);
  cargarContactos();
}

function iniciarEdicionContacto(id) {
  const c = todosContactos.find(function (x) { return x.id === id; });
  if (!c) return;
  editandoContactoId = id;
  document.getElementById("cNombre").value = c.nombre || "";
  document.getElementById("cEmail").value = c.email || "";
  document.getElementById("cTelefono").value = c.telefono || "";
  document.getElementById("cEmpresa").value = c.empresa || "";
  document.getElementById("cNotas").value = c.notas || "";
  document.getElementById("formTitulo").textContent = "Editar contacto";
  document.getElementById("btnGuardarContacto").textContent = "Guardar cambios";
  document.getElementById("btnCancelarEdicion").classList.remove("oculto");
  document.getElementById("formContacto").scrollIntoView({ behavior: "smooth", block: "start" });
}

function limpiarFormulario() {
  ["cNombre", "cEmail", "cTelefono", "cEmpresa", "cNotas"].forEach(function (id) { document.getElementById(id).value = ""; });
  editandoContactoId = null;
  document.getElementById("formTitulo").textContent = "Nuevo contacto";
  document.getElementById("btnGuardarContacto").textContent = "Guardar contacto";
  document.getElementById("btnCancelarEdicion").classList.add("oculto");
}

function cancelarEdicionContacto() { limpiarFormulario(); document.getElementById("formEstado").textContent = ""; }

async function borrarContacto(id) {
  const { error } = await db.from("contactos").delete().eq("id", id);
  if (error) alert("Error al borrar: " + error.message);
  if (id === editandoContactoId) limpiarFormulario();
  cargarContactos();
}

// ===== Atajos de teclado =====
document.getElementById("loginPassword").addEventListener("keydown", function (e) { if (e.key === "Enter") iniciarSesion(); });
document.getElementById("regConfirmar").addEventListener("keydown", function (e) { if (e.key === "Enter") crearCuenta(); });
