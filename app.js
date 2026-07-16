// ============================================================
//  Mini-CRM · lógica (Supabase + Login / Registro + Contactos)
//  Reutiliza el mismo stack del gestor de tareas.
// ============================================================

// ===== Conexión a Supabase (mismo proyecto) =====
const SUPABASE_URL = "https://apwmkhkxobymfjzoelsq.supabase.co";
const SUPABASE_KEY = "sb_publishable_RoFqDdGcNs5RncEHTOFFHQ_ljLdr3Ug";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
//  AUTH (login / registro / logout) — reutilizado
// ============================================================
function irARegistro(e) { if (e) e.preventDefault(); mostrarAuth("registro"); }
function irALogin(e) { if (e) e.preventDefault(); mostrarAuth("login"); }

function mostrarAuth(cual) {
  const login = document.getElementById("loginView");
  const registro = document.getElementById("registerView");
  login.classList.toggle("oculto", cual !== "login");
  registro.classList.toggle("oculto", cual !== "registro");
  const vista = (cual === "login") ? login : registro;
  vista.classList.remove("aparece"); void vista.offsetWidth; vista.classList.add("aparece");
}

async function iniciarSesion() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const estado = document.getElementById("loginEstado");
  if (!email || !password) { estado.textContent = "⚠️ Escribe tu correo y contraseña."; return; }
  const { error } = await db.auth.signInWithPassword({ email: email, password: password });
  if (error) {
    let msg = error.message;
    if (msg.toLowerCase().includes("not confirmed")) msg = "Confirma tu correo antes de entrar (revisa tu bandeja).";
    estado.textContent = "⚠️ " + msg;
  }
}

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

  const todoValido = nombre !== "" && emailOk && pass.length >= 8 && conf !== "" && conf === pass;
  document.getElementById("btnCrearCuenta").disabled = !todoValido;
  return todoValido;
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

  const { data, error } = await db.auth.signUp({
    email: email, password: pass, options: { data: { full_name: nombre } }
  });

  boton.textContent = "Crear cuenta";
  if (error) { estado.textContent = "⚠️ " + error.message; boton.disabled = false; return; }

  if (data.session) {
    estado.textContent = "✅ ¡Cuenta creada! Entrando…";
  } else {
    estado.textContent = "✅ ¡Cuenta creada! Revisa tu correo, confírmalo y luego inicia sesión.";
    setTimeout(function () { mostrarAuth("login"); }, 2500);
  }
}

async function cerrarSesion() { await db.auth.signOut(); }

db.auth.onAuthStateChange(function (event, session) { mostrarVista(session); });

function mostrarVista(session) {
  const appView = document.getElementById("appView");
  const loginView = document.getElementById("loginView");
  const registerView = document.getElementById("registerView");
  if (session) {
    loginView.classList.add("oculto");
    registerView.classList.add("oculto");
    appView.classList.remove("oculto");
    document.getElementById("usuarioEmail").textContent = "👤 " + session.user.email;
    cargarContactos();
  } else {
    appView.classList.add("oculto");
    registerView.classList.add("oculto");
    loginView.classList.remove("oculto");
  }
}

async function init() {
  const { data } = await db.auth.getSession();
  mostrarVista(data.session);
}
init();

// ============================================================
//  CONTACTOS (CRUD) — el RLS filtra por usuario automáticamente
// ============================================================

let todosContactos = [];   // guardamos todos para poder buscar/filtrar

async function cargarContactos() {
  const { data, error } = await db.from("contactos").select("*").order("created_at", { ascending: false });
  if (error) { document.getElementById("estado").textContent = "⚠️ Error al cargar: " + error.message; return; }
  todosContactos = data;
  document.getElementById("estado").textContent = data.length + " contacto(s)";
  filtrar();   // renderiza aplicando el buscador actual
}

// Filtra por nombre, correo o empresa
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
  if (contactos.length === 0) {
    cont.innerHTML = '<p class="vacio">No hay contactos. ¡Agrega el primero! 👆</p>';
    return;
  }
  contactos.forEach(function (c) {
    const card = document.createElement("div");
    card.className = "tarjeta-contacto";

    // Solo mostramos los datos que existen
    let datos = "";
    if (c.email)    datos += '<span>✉️ ' + escapar(c.email) + '</span>';
    if (c.telefono) datos += '<span>📞 ' + escapar(c.telefono) + '</span>';
    if (c.empresa)  datos += '<span>🏢 ' + escapar(c.empresa) + '</span>';

    card.innerHTML =
      '<div class="c-top">' +
        '<span class="c-nombre">' + escapar(c.nombre) + '</span>' +
        '<button class="c-borrar" title="Borrar" onclick="borrarContacto(' + c.id + ')">🗑️</button>' +
      '</div>' +
      '<div class="c-datos">' + datos + '</div>' +
      (c.notas ? '<p class="c-notas">' + escapar(c.notas) + '</p>' : '');
    cont.appendChild(card);
  });
}

// Seguridad básica: evita que texto con HTML rompa la página
function escapar(txt) { const d = document.createElement("div"); d.textContent = txt; return d.innerHTML; }

async function agregarContacto() {
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

  const { error } = await db.from("contactos").insert(contacto);
  if (error) { estado.textContent = "⚠️ Error al guardar: " + error.message; return; }

  // Limpiar el formulario
  ["cNombre", "cEmail", "cTelefono", "cEmpresa", "cNotas"].forEach(function (id) {
    document.getElementById(id).value = "";
  });
  estado.textContent = "✅ Contacto guardado.";
  setTimeout(function () { estado.textContent = ""; }, 1500);
  cargarContactos();
}

async function borrarContacto(id) {
  const { error } = await db.from("contactos").delete().eq("id", id);
  if (error) alert("Error al borrar: " + error.message);
  cargarContactos();
}

// ===== Atajos de teclado (Enter) =====
document.getElementById("loginPassword").addEventListener("keydown", function (e) { if (e.key === "Enter") iniciarSesion(); });
document.getElementById("regConfirmar").addEventListener("keydown", function (e) { if (e.key === "Enter") crearCuenta(); });
