//======================
// Firebase Configuration
//======================
const firebaseConfig = {
  apiKey: "AIzaSyBEdnKqNdO0-LqGHtP0278uEbsooKY8im4",
  authDomain: "assistencia-nascimento-876a0.firebaseapp.com",
  projectId: "assistencia-nascimento-876a0",
  storageBucket: "assistencia-nascimento-876a0.firebasestorage.app",
  messagingSenderId: "122145381544",
  appId: "1:122145381544:web:c1d95604bf349133df769d",
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.app().storage();
const LOCAL_ORDENS_KEY = "ordens_servico_local";
const BUCKET_STORAGE_ESPERADO = firebaseConfig.storageBucket;
const ORIGENS_DESENVOLVIMENTO = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];
let storageUploadHabilitado = true;
let avisoStorageJaExibido = false;

//================
// mostrar o administrador logado
auth.onAuthStateChanged((user) => {
  if (user) {
    const userName = user.email.split("@")[0]; // Extrai o nome do email
    document.querySelector(".user-name").textContent = userName;
  }
});

//======================
// Global Variables
//======================
let ordensServico = [];
let clientes = [];
let currentFilter = "all";
let checklistData = {
  liga: null,
  wifi: null,
  touch: null,
  botoes: null,
};
let fotosOS = [null, null, null, null];
let arquivosParaUpload = [null, null, null, null];
let osSelecionada = null;

function normalizarUrlFoto(url) {
  if (typeof url !== "string") return url;

  return url
    .replace(
      "/b/assistencia-nascimento-876a0.appspot.com/",
      `/b/${BUCKET_STORAGE_ESPERADO}/`,
    )
    .replace(
      "/b/assistencia-nascimento-876a0.firebasestorage.app/",
      `/b/${BUCKET_STORAGE_ESPERADO}/`,
    );
}

function converterParaData(valor) {
  if (!valor) return null;
  if (valor?.toDate) return valor.toDate();
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function salvarOrdensLocal() {
  try {
    localStorage.setItem(LOCAL_ORDENS_KEY, JSON.stringify(ordensServico));
  } catch (error) {
    console.error("Erro ao salvar OS localmente:", error);
  }
}

function carregarOrdensLocal() {
  try {
    const dados = localStorage.getItem(LOCAL_ORDENS_KEY);
    if (!dados) return false;
    const parsed = JSON.parse(dados);
    if (!Array.isArray(parsed)) return false;
    ordensServico = parsed.map((os) => ({
      ...os,
      fotos: Array.isArray(os?.fotos)
        ? os.fotos.map((foto) => normalizarUrlFoto(foto))
        : os?.fotos,
    }));
    return true;
  } catch (error) {
    console.error("Erro ao carregar OS localmente:", error);
    return false;
  }
}

//======================
// Initialization
//======================
document.addEventListener("DOMContentLoaded", () => {
  aplicarFallbackUploadEmAmbienteLocal();
  validarBucketStorage();
  verificarAuth();
  setupEventListeners();
  carregarOrdens();
  carregarClientes();
  atualizarPrevisaoEntrega();
});

function aplicarFallbackUploadEmAmbienteLocal() {
  try {
    const origemAtual = window.location.origin;
    const ambienteLocal = ORIGENS_DESENVOLVIMENTO.includes(origemAtual);

    if (!ambienteLocal) return;

    storageUploadHabilitado = false;

    if (!avisoStorageJaExibido) {
      avisoStorageJaExibido = true;
      Swal.fire({
        icon: "info",
        title: "Modo local detectado",
        text: "Uploads de foto foram desativados temporariamente para evitar bloqueio de CORS no localhost. A OS será criada normalmente sem fotos no Firebase Storage.",
      });
    }
  } catch (error) {
    console.error("Erro ao aplicar fallback de ambiente local:", error);
  }
}

function validarBucketStorage() {
  try {
    const refRaiz = storage.ref().toString();
    const bucketCorreto = refRaiz.includes(BUCKET_STORAGE_ESPERADO);

    if (!bucketCorreto) {
      storageUploadHabilitado = false;
      console.error("Bucket do Storage incorreto:", refRaiz);

      if (!avisoStorageJaExibido) {
        avisoStorageJaExibido = true;
        Swal.fire({
          icon: "warning",
          title: "Bucket do Firebase Storage incorreto",
          text: "Atualize/recarregue a página (Ctrl+F5). O sistema detectou configuração antiga em cache.",
        });
      }
    }
  } catch (error) {
    console.error("Erro ao validar bucket do storage:", error);
  }
}

//======================
// Authentication
//======================
function verificarAuth() {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "../index.html";
    }
  });
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = "../index.html";
  });
}

//======================
// Event Listeners
//======================
function setupEventListeners() {
  // Checklist buttons
  document.querySelectorAll(".check-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const checkType = this.dataset.check;
      const value = this.dataset.value;

      // Remove active class from siblings
      this.parentElement
        .querySelectorAll(".check-btn")
        .forEach((b) => b.classList.remove("active"));

      // Add active class to clicked button
      this.classList.add("active");

      // Store the value
      checklistData[checkType] = value;
    });
  });

  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      currentFilter = this.dataset.filter;
      renderizarOrdens();
    });
  });

  // Client search
  const buscaCliente = document.getElementById("busca-cliente");
  if (buscaCliente) {
    buscaCliente.addEventListener("input", buscarClientes);
  }

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", function (e) {
      if (e.target === this) {
        this.classList.remove("active");
      }
    });
  });
}

//======================
// Modal Functions
//======================
function abrirModalNovaOS() {
  const modal = document.getElementById("modal-nova-os");
  if (modal) modal.classList.add("active");
  resetarFormularioNovaOS();
}

function fecharModalNovaOS() {
  const modal = document.getElementById("modal-nova-os");
  if (modal) modal.classList.remove("active");
}

function abrirModalCliente() {
  const modal = document.getElementById("modal-cliente");
  if (modal) modal.classList.add("active");
}

function fecharModalCliente() {
  const modal = document.getElementById("modal-cliente");
  if (modal) modal.classList.remove("active");
}

function abrirModalDetalhesOS(os) {
  osSelecionada = os;
  const modal = document.getElementById("modal-detalhes-os");
  if (modal) modal.classList.add("active");
  renderizarDetalhesOS(os);
}

function fecharModalDetalhesOS() {
  const modal = document.getElementById("modal-detalhes-os");
  if (modal) modal.classList.remove("active");
  osSelecionada = null;
}

function abrirModalClientesCadastrados() {
  const modal = document.getElementById("modal-clientes-cadastrados");
  if (modal) modal.classList.add("active");
}

function fecharModalClientesCadastrados() {
  const modal = document.getElementById("modal-clientes-cadastrados");
  if (modal) modal.classList.remove("active");
}

function abrirModalEstoque() {
  const modal = document.getElementById("modal-estoque");
  if (modal) modal.classList.add("active");
}

function fecharModalEstoque() {
  const modal = document.getElementById("modal-estoque");
  if (modal) modal.classList.remove("active");
}

function abrirModalFinanceiro() {
  const modal = document.getElementById("modal-financeiro");
  if (modal) modal.classList.add("active");
}

function fecharModalFinanceiro() {
  const modal = document.getElementById("modal-financeiro");
  if (modal) modal.classList.remove("active");
}

//======================
// Previsão de Entrega (helpers)
//======================
function atualizarPrevisaoEntrega() {
  const inputData = document.getElementById("data-manual");
  const displayPrevisao = document.getElementById("previsao-entrega");

  if (!inputData || !displayPrevisao) return;

  const dataSelecionada = inputData.value;
  displayPrevisao.textContent = formatarDataManual(dataSelecionada);
}

//======================
// Novas OS
//======================

function resetarFormularioNovaOS() {
  document.getElementById("form-nova-os").reset();
  document.getElementById("busca-cliente").value = "";
  const resultados = document.getElementById("resultados-cliente");
  if (resultados) resultados.classList.remove("active");
  document.getElementById("nome-cliente").value = "";
  document.getElementById("whatsapp-cliente").value = "";
  document.getElementById("email-cliente").value = "";

  document.getElementById("previsao-entrega").textContent = "--/--/----";
  checklistData = {
    liga: null,
    wifi: null,
    touch: null,
    botoes: null,
  };
  document.querySelectorAll(".check-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Reset photos
  fotosOS = [null, null, null, null];
  arquivosParaUpload = [null, null, null, null];
  document.querySelectorAll(".photo-slot").forEach((slot) => {
    slot.classList.remove("has-photo");
    const img = slot.querySelector("img");
    if (img) {
      img.remove();
    }
  });

  atualizarPrevisaoEntrega();
}

//======================
// Client Search
//======================
function buscarClientes() {
  const termo = document.getElementById("busca-cliente").value.toLowerCase();
  const resultados = document.getElementById("resultados-cliente");

  if (termo.length < 2) {
    resultados.classList.remove("active");
    return;
  }

  const resultadosFiltrados = clientes.filter(
    (c) =>
      c.cpf?.toLowerCase().includes(termo) ||
      c.telefone?.toLowerCase().includes(termo) ||
      c.whatsapp?.toLowerCase().includes(termo),
  );

  if (resultadosFiltrados.length > 0) {
    resultados.innerHTML = resultadosFiltrados
      .map(
        (c) => `
      <div class="search-result-item" onclick="selecionarCliente('${c.id}')">
        <strong>${c.nome}</strong><br>
        <small>${c.telefone || c.whatsapp || c.cpf || ""}</small>
      </div>
    `,
      )
      .join("");
    resultados.classList.add("active");
  } else {
    resultados.classList.remove("active");
  }
}

//======================
// Client Functions
//======================

function selecionarCliente(clienteId) {
  const cliente = clientes.find((c) => c.id === clienteId);
  if (cliente) {
    document.getElementById("nome-cliente").value = cliente.nome;
    document.getElementById("whatsapp-cliente").value = cliente.whatsapp || "";
    document.getElementById("email-cliente").value = cliente.email || "";
    const resultados = document.getElementById("resultados-cliente");
    if (resultados) resultados.classList.remove("active");
    document.getElementById("busca-cliente").value = "";
  }
}

async function carregarClientes() {
  try {
    const snapshot = await db.collection("clientes").get();
    clientes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Erro ao carregar clientes:", error);
  }
}

async function salvarNovoCliente() {
  const nome = document.getElementById("novo-cliente-nome").value;
  const cpf = document.getElementById("novo-cliente-cpf").value;
  const telefone = document.getElementById("novo-cliente-telefone").value;
  const whatsapp = document.getElementById("novo-cliente-whatsapp").value;
  const email = document.getElementById("novo-cliente-email").value;
  const endereco = document.getElementById("novo-cliente-endereco").value;

  if (!nome) {
    Swal.fire("Erro", "Nome é obrigatório!", "warning");
    return;
  }

  try {
    const docRef = await db.collection("clientes").add({
      nome,
      cpf,
      telefone,
      whatsapp: whatsapp || telefone,
      email,
      endereco,
      createdAt: new Date(),
    });

    Swal.fire({
      icon: "success",
      title: "Cliente salvo!",
      text: "Cliente cadastrado com sucesso.",
      timer: 1500,
    });

    // Update global clients array
    clientes.push({
      id: docRef.id,
      nome,
      cpf,
      telefone,
      whatsapp: whatsapp || telefone,
      email,
      endereco,
    });

    // Auto-fill the new OS form
    document.getElementById("nome-cliente").value = nome;
    document.getElementById("whatsapp-cliente").value = whatsapp || telefone;
    document.getElementById("email-cliente").value = email;

    fecharModalCliente();
    document.getElementById("form-novo-cliente").reset();
  } catch (error) {
    console.error("Erro ao salvar cliente:", error);
    Swal.fire("Erro", "Falha ao salvar cliente!", "error");
  }
}

//======================
// Clientes Cadastrtados
//======================
function abrirModalClientesCadastrados() {
  const modal = document.getElementById("modal-clientes-cadastrados");
  if (modal) modal.classList.add("active");
  renderizarClientesCadastrados();
}

function renderizarClientesCadastrados() {
  const tbody = document.getElementById("clientes-cadastrados-body");
  if (!tbody) return;

  if (clientes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fas fa-users" style="font-size: 40px; margin-bottom: 10px;"></i><br>
          Nenhum cliente cadastrado ainda.
        </td>
      </tr>
    `;
    return;
  }
  tbody.innerHTML = clientes
    .map(
      (c) => `
      <tr>
        <td>${c.nome}</td>
        <td>${c.cpf || "-"}</td>
        <td>${c.telefone || c.whatsapp || "-"}</td>
        <td>${c.email || "-"}</td>
      </tr>
    `,
    )
    .join("");
}

//============================
// Buscar Clientes Cadastrados
//=============================

function buscarClientesCadastrados() {
  const termo = document
    .getElementById("busca-cliente-cadastrados")
    .value.toLowerCase();
  const resultados = document.getElementById("clientes-cadastrados-body");

  // 1. Filtra a lista de clientes com base no nome, cpf ou e-mail
  const clientesFiltrados = clientes.filter((c) => {
    return (
      c.nome.toLowerCase().includes(termo) ||
      (c.cpf && c.cpf.includes(termo)) ||
      (c.email && c.email.toLowerCase().includes(termo))
    );
  });

  // 2. Se o campo estiver vazio, você decide: mostrar tudo ou mostrar aviso
  if (termo.length === 0) {
    // Aqui você pode chamar a função que carrega a lista completa original
    // resultados.innerHTML = "";
    return;
  }

  // 3. Se não encontrar ninguém no filtro
  if (clientesFiltrados.length === 0) {
    resultados.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fas fa-search" style="font-size: 40px; margin-bottom: 10px;"></i><br>
          Nenhum cliente encontrado para "${termo}".
        </td>
      </tr>
    `;
    return;
  }

  // 4. Renderiza os resultados filtrados
  resultados.innerHTML = clientesFiltrados
    .map(
      (c) => `
      <tr>
        <td>${c.nome}</td>
        <td>${c.cpf || "-"}</td>
        <td>${c.telefone || "-"}</td>
        <td>${c.email || "-"}</td>
      </tr>
    `,
    )
    .join("");
}

//======================
// OS Functions
//======================
async function carregarOrdens() {
  try {
    let cacheLocal = [];
    try {
      cacheLocal = JSON.parse(localStorage.getItem(LOCAL_ORDENS_KEY) || "[]");
    } catch {
      cacheLocal = [];
    }
    const cacheMap = new Map(
      Array.isArray(cacheLocal)
        ? cacheLocal.filter((item) => item?.id).map((item) => [item.id, item])
        : [],
    );

    const snapshot = await db
      .collection("ordens_servico")
      .orderBy("createdAt", "desc")
      .get();

    ordensServico = snapshot.docs.map((doc) => {
      const osFirestore = {
        id: doc.id,
        ...doc.data(),
      };

      const osLocal = cacheMap.get(osFirestore.id);
      const semFotosNoFirestore =
        !Array.isArray(osFirestore.fotos) || osFirestore.fotos.length === 0;
      const temFotosNoLocal =
        Array.isArray(osLocal?.fotos) && osLocal.fotos.length > 0;

      if (Array.isArray(osFirestore.fotos)) {
        osFirestore.fotos = osFirestore.fotos.map((foto) =>
          normalizarUrlFoto(foto),
        );
      }

      if (semFotosNoFirestore && temFotosNoLocal) {
        osFirestore.fotos = osLocal.fotos.map((foto) =>
          normalizarUrlFoto(foto),
        );
      }

      return osFirestore;
    });

    salvarOrdensLocal();

    atualizarDashboard();
    renderizarOrdens();
  } catch (error) {
    console.error("Erro ao carregar ordens:", error);

    const carregouLocal = carregarOrdensLocal();
    if (!carregouLocal) {
      ordensServico = [];
    }

    atualizarDashboard();
    renderizarOrdens();
  }
}

function carregarDadosDemo() {
  // Demo data for testing
  ordensServico = [
    {
      id: "OS-001",
      cliente: { nome: "João Silva", telefone: "(11) 99999-9999" },
      marca: "apple",
      modelo: "iPhone 13",
      cor: "Preto",
      imei: "123456789012345",
      status: "manutencao",
      defeito: "Tela quebrada",
      createdAt: new Date(),
      previsao: new Date(Date.now()),
    },
    {
      id: "OS-002",
      cliente: { nome: "Maria Santos", telefone: "(11) 88888-8888" },
      marca: "samsung",
      modelo: "Galaxy S21",
      cor: "Branco",
      imei: "987654321098765",
      status: "pronto",
      defeito: "Troca de bateria",
      createdAt: new Date(),
      previsao: new Date(),
    },
    {
      id: "OS-003",
      cliente: { nome: "Pedro Costa", telefone: "(11) 77777-7777" },
      marca: "motorola",
      modelo: "Moto G9",
      cor: "Azul",
      imei: "456789123456789",
      status: "orcamento",
      defeito: "Não carrega",
      createdAt: new Date(),
      previsao: new Date(Date.now()),
    },
    {
      id: "OS-004",
      cliente: { nome: "Ana Oliveira", telefone: "(11) 66666-6666" },
      marca: "xiaomi",
      modelo: "Redmi Note 11",
      cor: "Cinza",
      imei: "789123456789123",
      status: "peca",
      defeito: "Problema no botão power",
      createdAt: new Date(),
      previsao: new Date(Date.now()),
    },
  ];

  atualizarDashboard();
  renderizarOrdens();
  atualizarPrevisaoEntrega();
}

async function salvarNovaOS() {
  let osData = null;

  try {
    // Validate required fields
    const nomeCliente = document.getElementById("nome-cliente")?.value;
    const marca = document.getElementById("marca-aparelho")?.value;
    const modelo = document.getElementById("modelo-aparelho")?.value;
    const defeito = document.getElementById("defeito-reclamado")?.value;

    if (!nomeCliente || !marca || !modelo || !defeito) {
      Swal.fire("Erro", "Preencha todos os campos obrigatórios!", "warning");
      return;
    }

    // Generate OS number
    const osNumber = generateOSNumber();

    // Previsão selecionada no calendário (se houver)
    const dataPrevisaoSelecionada =
      document.getElementById("data-manual")?.value || "";
    const previsaoEntrega = dataPrevisaoSelecionada
      ? new Date(`${dataPrevisaoSelecionada}T12:00:00`)
      : new Date();

    // Upload das fotos para o Firebase Storage com tolerância a falhas
    const resultadosFotos = await Promise.allSettled(
      fotosOS.map((foto, index) => uploadFotoOS(foto, osNumber, index)),
    );
    const fotosSalvas = resultadosFotos
      .filter((resultado) => resultado.status === "fulfilled")
      .map((resultado) => resultado.value)
      .filter(Boolean);

    const fotosLocais = fotosOS.filter(Boolean);
    const fotosParaUsoLocal =
      fotosSalvas.length > 0 ? fotosSalvas : fotosLocais;

    // Prepare OS data
    osData = {
      id: osNumber,
      cliente: {
        nome: nomeCliente,
        telefone: document.getElementById("whatsapp-cliente")?.value || "",
        email: document.getElementById("email-cliente")?.value || "",
      },
      marca: marca,
      modelo: modelo,
      cor: document.getElementById("cor-aparelho")?.value || "",
      imei: document.getElementById("imei-aparelho")?.value || "",
      senha: document.getElementById("senha-aparelho")?.value || "",
      defeito: defeito,
      status: "orcamento",
      checklist: { ...checklistData },
      fotos: fotosParaUsoLocal,
      previsao: previsaoEntrega,
      createdAt: new Date(),
      updatedAt: new Date(),
      log: [
        {
          timestamp: new Date(),
          text: "OS criada",
          user: "Admin",
        },
      ],
    };

    const osDataFirestore = {
      ...osData,
      fotos: fotosSalvas,
    };

    await db.collection("ordens_servico").add(osDataFirestore);

    // Add to local array
    ordensServico.unshift(osData);
    salvarOrdensLocal();

    Swal.fire({
      icon: "success",
      title: "OS Criada!",
      text: `Ordem de Serviço ${osNumber} criada com sucesso.`,
      timer: 2000,
    });

    fecharModalNovaOS();
    atualizarDashboard();
    renderizarOrdens();
  } catch (error) {
    console.error("Erro ao criar OS:", error);

    // fallback local para não perder o atendimento
    try {
      if (osData) {
        ordensServico.unshift(osData);
      }
      salvarOrdensLocal();
      atualizarDashboard();
      renderizarOrdens();

      Swal.fire({
        icon: "warning",
        title: "OS criada em modo local",
        text: "Não foi possível gravar no Firebase agora. A OS ficou salva localmente neste computador.",
      });
      fecharModalNovaOS();
    } catch (fallbackError) {
      console.error("Erro no fallback local:", fallbackError);
      Swal.fire(
        "Erro ao criar OS",
        "Não foi possível salvar agora. Verifique conexão/permissões do Firebase e tente novamente.",
        "error",
      );
    }
  }
}

async function uploadFotoOS(fotoDataUrl, osId, index) {
  try {
    if (!storageUploadHabilitado) return null;
    if (!fotoDataUrl || typeof fotoDataUrl !== "string") return null;
    if (!fotoDataUrl.startsWith("data:image")) return fotoDataUrl;

    const response = await fetch(fotoDataUrl);
    const blob = await response.blob();
    const extensao = blob.type?.split("/")[1] || "jpg";
    const fileRef = storage
      .ref()
      .child(
        `ordens_servico/${osId}/foto_${index + 1}_${Date.now()}.${extensao}`,
      );

    const snapshot = await fileRef.put(blob);
    return await snapshot.ref.getDownloadURL();
  } catch (error) {
    console.error(`Erro ao enviar foto ${index + 1}:`, error);

    const mensagem = String(error?.message || "").toLowerCase();
    const erroPermanente =
      mensagem.includes("cors") ||
      mensagem.includes("404") ||
      mensagem.includes("bucket") ||
      mensagem.includes("unauthorized") ||
      mensagem.includes("permission");

    if (erroPermanente) {
      storageUploadHabilitado = false;

      if (!avisoStorageJaExibido) {
        avisoStorageJaExibido = true;
        Swal.fire({
          icon: "warning",
          title: "Upload de fotos desativado temporariamente",
          text: "Detectei erro de configuração/permissão no Firebase Storage (CORS/bucket). As próximas OS serão salvas sem upload de foto até ajustar o Firebase.",
        });
      }
    }

    return null;
  }
}

async function salvarOrdemServicoCompleta() {
  const apiKey = "4f64e86441e6f74f1ee842ca3b1a4c62";
  const linksDasFotos = [];

  Swal.fire({
    title: "Enviando fotos...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    for (let i = 0; i < arquivosParaUpload.length; i++) {
      const arquivo = arquivosParaUpload[i];

      if (arquivo) {
        const formData = new FormData();
        formData.append("image", arquivo);

        const response = await fetch(
          `https://api.imgbb.com/1/upload?key=${apiKey}`,
          {
            method: "POST",
            body: formData,
          },
        );

        const resultado = await response.json();
        const link = resultado?.data?.url || "";
        linksDasFotos.push(link);
      } else {
        linksDasFotos.push("");
      }
    }

    const clienteSelecionado =
      document.getElementById("nome-cliente")?.value ||
      document.getElementById("busca-cliente-cadastrados")?.value ||
      "Cliente não informado";

    const dadosOS = {
      cliente: clienteSelecionado,
      fotos: linksDasFotos,
      data: new Date().toISOString(),
      createdAt: new Date(),
    };

    await db.collection("ordens_servico").add(dadosOS);

    Swal.fire("Sucesso!", "OS salva com as fotos!", "success");
    return dadosOS;
  } catch (error) {
    console.error(error);
    Swal.fire("Erro", "Falha ao subir imagens", "error");
    throw error;
  }
}

//======================
// OS Number Generation
//======================

function generateOSNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `OS-${year}${month}-${random}`;
}

//======================
// Previsão de Entrega
//======================
// Seleciona os elementos
const inputData = document.getElementById("data-manual");
const displayPrevisao = document.getElementById("previsao-entrega");

// Função que formata a data do input (AAAA-MM-DD) para (DD/MM/AAAA)
function formatarDataManual(dataISO) {
  if (!dataISO) return "--/--/----";

  const partes = dataISO.split("-"); // Divide 2026-02-23 em [2026, 02, 23]
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Evento que detecta a mudança no calendário
if (inputData) {
  inputData.addEventListener("change", function () {
    atualizarPrevisaoEntrega();
  });
}

//======================
// Dashboard Stats
//======================
function atualizarDashboard() {
  const totalOS = ordensServico.length;
  const prontos = ordensServico.filter((os) => os.status === "pronto").length;
  const orcamento = ordensServico.filter(
    (os) => os.status === "orcamento",
  ).length;
  const manutencao = ordensServico.filter(
    (os) => os.status === "manutencao",
  ).length;
  const peca = ordensServico.filter((os) => os.status === "peca").length;

  //=====================
  // Faturamento do Mês
  //=====================

  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const faturamentoMes = ordensServico.reduce((total, os) => {
    const createdAt = os.createdAt?.toDate
      ? os.createdAt.toDate()
      : new Date(os.createdAt);

    const mesmoMes =
      createdAt.getMonth() === mesAtual && createdAt.getFullYear() === anoAtual;
    const statusValido = os.status === "pronto" || os.status === "entregue";

    if (mesmoMes && statusValido) {
      return total + Number(os.orcamento || os.valor || 0);
    }
    return total;
  }, 0);

  document.getElementById("total-os").textContent = totalOS;
  document.getElementById("prontos-entrega").textContent = prontos;
  document.getElementById("em-orcamento").textContent = orcamento;
  document.getElementById("faturamento-dia").textContent =
    `R$ ${faturamentoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  // Status distribution
  document.getElementById("count-orcamento").textContent = orcamento;
  document.getElementById("count-peca").textContent = peca;
  document.getElementById("count-manutencao").textContent = manutencao;
  document.getElementById("count-pronto").textContent = prontos;
}

//======================
// Render OS Table
//======================
function renderizarOrdens() {
  const tbody = document.getElementById("os-table-body");
  let ordensFiltradas = [...ordensServico];

  // Apply filter
  if (currentFilter !== "all") {
    ordensFiltradas = ordensServico.filter((os) => os.status === currentFilter);
  }

  // Apply search
  const busca = document.getElementById("busca-os").value.toLowerCase();
  if (busca) {
    ordensFiltradas = ordensFiltradas.filter(
      (os) =>
        os.cliente?.nome?.toLowerCase().includes(busca) ||
        os.imei?.includes(busca) ||
        os.id?.toLowerCase().includes(busca),
    );
  }

  if (ordensFiltradas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fas fa-inbox" style="font-size: 40px; margin-bottom: 10px;"></i><br>
          Nenhuma ordem de serviço encontrada
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = ordensFiltradas
    .map((os) => {
      const statusClass = getStatusClass(os.status);
      const statusText = getStatusText(os.status);
      const marcaTexto = getMarcaText(os.marca);
      const previsaoFormatada = formatarData(os.previsao);

      return `
      <tr>
        <td><span class="os-id">${os.id}</span></td>
        <td>
          <div class="client-cell">
            <span class="client-name">${os.cliente?.nome || "N/A"}</span>
            <span class="client-contact">${os.cliente?.telefone || ""}</span>
          </div>
        </td>
        <td>
          <div class="device-cell">
            <span class="device-model">${marcaTexto} ${os.modelo}</span>
            <span class="device-brand">${os.cor || ""}</span>
          </div>
        </td>
        <td>
          <select class="dropdown-status ${statusClass}" onchange="alterarStatus('${os.id}', this.value)">
            <option value="orcamento" ${os.status === "orcamento" ? "selected" : ""}>Orçamento</option>
            <option value="peca" ${os.status === "peca" ? "selected" : ""}>Aguardando Peça</option>
            <option value="manutencao" ${os.status === "manutencao" ? "selected" : ""}>Em Manutenção</option>
            <option value="pronto" ${os.status === "pronto" ? "selected" : ""}>Pronto</option>
            <option value="entregue" ${os.status === "entregue" ? "selected" : ""}>Entregue</option>
          </select>
        </td>
        <td>${previsaoFormatada}</td>
        <td>
          <div class="actions-cell">
            <button class="action-btn whatsapp" title="WhatsApp" onclick="abrirWhatsApp('${os.cliente?.telefone || ""}')">
              <i class="fab fa-whatsapp"></i>
            </button>
            <button class="action-btn" title="Ver Detalhes" onclick="verDetalhes('${os.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn" title="Editar" onclick="editarOS('${os.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" title="Excluir" onclick="excluirOS('${os.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function getStatusClass(status) {
  const classes = {
    orcamento: "red",
    peca: "yellow",
    manutencao: "blue",
    pronto: "green",
    entregue: "green",
  };
  return classes[status] || "red";
}

function getStatusText(status) {
  const texts = {
    orcamento: "Aguardando Orçamento",
    peca: "Aguardando Peça",
    manutencao: "Em Manutenção",
    pronto: "Pronto para Retirada",
    entregue: "Entregue",
  };
  return texts[status] || status;
}

function getMarcaText(marca) {
  const marcas = {
    apple: "Apple",
    samsung: "Samsung",
    motorola: "Motorola",
    xiaomi: "Xiaomi",
    realme: "Realme",
    infinix: "Infinix",
    outros: "Outros",
  };
  return marcas[marca] || marca;
}

function formatarData(data) {
  if (!data) return "-";
  const d = data.toDate ? data.toDate() : new Date(data);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function filtrarOS() {
  renderizarOrdens();
}

//======================
// Actions
//======================
async function alterarStatus(osId, novoStatus) {
  const os = ordensServico.find((o) => o.id === osId);
  if (!os) return;

  try {
    // Find and update in Firestore
    const snapshot = await db
      .collection("ordens_servico")
      .where("id", "==", osId)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        status: novoStatus,
        updatedAt: new Date(),
      });
    }

    // Update local
    os.status = novoStatus;
    os.updatedAt = new Date();
    os.log = os.log || [];
    os.log.push({
      timestamp: new Date(),
      text: `Status alterado para ${getStatusText(novoStatus)}`,
      user: "Admin",
    });

    atualizarDashboard();
    renderizarOrdens();
    salvarOrdensLocal();

    Swal.fire({
      icon: "success",
      title: "Status atualizado!",
      text: `OS ${osId} alterada para ${getStatusText(novoStatus)}.`,
      timer: 1500,
    });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    // Update locally anyway for demo
    os.status = novoStatus;
    atualizarDashboard();
    renderizarOrdens();
    salvarOrdensLocal();
  }
}

async function excluirOS(osId) {
  const result = await Swal.fire({
    title: "Tem certeza?",
    text: `Deseja excluir a OS ${osId}? Esta ação não pode ser desfeita!`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, excluir!",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#ef4444",
  });

  if (!result.isConfirmed) return;

  try {
    const snapshot = await db
      .collection("ordens_servico")
      .where("id", "==", osId)
      .get();

    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  } catch (error) {
    console.error("Erro ao excluir no Firestore:", error);
  }

  ordensServico = ordensServico.filter((os) => os.id !== osId);
  salvarOrdensLocal();

  if (osSelecionada?.id === osId) {
    fecharModalDetalhesOS();
  }

  atualizarDashboard();
  renderizarOrdens();
  renderizarOSFinalizadas();

  Swal.fire("Excluído!", "Ordem de Serviço excluída com sucesso.", "success");
}

//======================
// WhatsApp Integration
//======================

function abrirWhatsApp(telefone, valorOrcamento) {
  if (!telefone) {
    Swal.fire("Erro", "Telefone não disponível!", "warning");
    return;
  }

  // 1. Limpa o telefone e garante o 55
  const phone = telefone.replace(/\D/g, "");
  const ddiPhone = phone.startsWith("55") ? phone : `55${phone}`;

  // 1. Limpa o valor (remove R$, espaços e troca vírgula por ponto para o JS entender)
  const valorLimpo = String(valorOrcamento)
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(",", ".");

  // 2. Converte para número e garante que, se der erro, vire 0
  const numeroFinal = parseFloat(valorLimpo) || 0;

  // 3. Formata para o padrão brasileiro
  const valorFormatado = numeroFinal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });

  // 3. Monta a mensagem
  const mensagem = `*Olá, tudo bem?* 👋

Já temos o diagnóstico e o orçamento para o seu aparelho:

💰 *Investimento:* R$ ${valorFormatado || "0,00"}

📅 *Previsão de Entrega:* ${document.getElementById("previsao-entrega").textContent}

Você autoriza a realização do serviço? 🛠️
Qualquer dúvida, estou à disposição!`;
  // 4. O PULO DO GATO: Use o protocolo 'whatsapp://' em vez de 'https://'
  // Isso fala diretamente com o aplicativo instalado no seu Windows/Mac
  const url = `whatsapp://send?phone=${ddiPhone}&text=${encodeURIComponent(mensagem)}`;

  // 5. Tenta abrir o protocolo
  window.location.assign(url);
}

//======================
// Detalhes e Edição de OS
//======================
function verDetalhes(osId) {
  const os = ordensServico.find((o) => o.id === osId);
  if (os) {
    abrirModalDetalhesOS(os);
  }
}

function editarOS(osId) {
  const os = ordensServico.find((o) => o.id === osId);
  if (!os) return;

  // Fechar modal de detalhes se estiver aberto
  const modalDetalhes = document.getElementById("modal-detalhes-os");
  if (modalDetalhes) modalDetalhes.classList.remove("active");

  // Abrir modal de edição
  abrirModalEditarOS(os);
}

function abrirModalEditarOS(os) {
  // Preencher o formulário de edição com os dados da OS
  document.getElementById("edit-os-id").value = os.id;
  document.getElementById("edit-nome-cliente").value = os.cliente?.nome || "";
  document.getElementById("edit-whatsapp-cliente").value =
    os.cliente?.telefone || "";
  document.getElementById("edit-email-cliente").value = os.cliente?.email || "";
  document.getElementById("edit-marca-aparelho").value = os.marca || "";
  document.getElementById("edit-modelo-aparelho").value = os.modelo || "";
  document.getElementById("edit-cor-aparelho").value = os.cor || "";
  document.getElementById("edit-imei-aparelho").value = os.imei || "";
  document.getElementById("edit-senha-aparelho").value = os.senha || "";
  document.getElementById("edit-defeito-reclamado").value = os.defeito || "";
  document.getElementById("edit-previsao").textContent = formatarData(
    os.previsao || "",
  );
  document.getElementById("Valor-orcamento").value = os.orcamento || "";
  // Abrir modal
  const modal = document.getElementById("modal-editar-os");
  if (modal) modal.classList.add("active");
}

function fecharModalEditarOS() {
  const modal = document.getElementById("modal-editar-os");
  if (modal) modal.classList.remove("active");
}

async function salvarEdicaoOS() {
  const osId = document.getElementById("edit-os-id").value;
  const os = ordensServico.find((o) => o.id === osId);

  if (!os) return;

  // Validate required fields
  const nomeCliente = document.getElementById("edit-nome-cliente").value;
  const marca = document.getElementById("edit-marca-aparelho").value;
  const modelo = document.getElementById("edit-modelo-aparelho").value;
  const defeito = document.getElementById("edit-defeito-reclamado").value;
  const orcamento = document.getElementById("Valor-orcamento").value;

  if (!nomeCliente || !marca || !modelo || !defeito) {
    Swal.fire("Erro", "Preencha todos os campos obrigatórios!", "warning");
    return;
  }

  // Prepare updated OS data
  const osDataAtualizada = {
    ...os,
    cliente: {
      nome: nomeCliente,
      telefone: document.getElementById("edit-whatsapp-cliente").value,
      email: document.getElementById("edit-email-cliente").value,
    },
    marca: marca,
    modelo: modelo,
    cor: document.getElementById("edit-cor-aparelho").value,
    imei: document.getElementById("edit-imei-aparelho").value,
    senha: document.getElementById("edit-senha-aparelho").value,
    defeito: defeito,
    orcamento: orcamento,
    updatedAt: new Date(),
  };

  try {
    // Find and update in Firestore
    const snapshot = await db
      .collection("ordens_servico")
      .where("id", "==", osId)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update(osDataAtualizada);
    }

    // Update local array
    const index = ordensServico.findIndex((o) => o.id === osId);
    if (index !== -1) {
      ordensServico[index] = osDataAtualizada;
    }
    salvarOrdensLocal();

    Swal.fire({
      icon: "success",
      title: "OS Atualizada!",
      text: `Ordem de Serviço ${osId} atualizada com sucesso.`,
      timer: 2000,
    });

    fecharModalEditarOS();
    renderizarOrdens();
  } catch (error) {
    console.error("Erro ao atualizar OS:", error);
    // Update locally anyway for demo
    const index = ordensServico.findIndex((o) => o.id === osId);
    if (index !== -1) {
      ordensServico[index] = osDataAtualizada;
    }
    salvarOrdensLocal();

    Swal.fire({
      icon: "success",
      title: "OS Atualizada!",
      text: `Ordem de Serviço ${osId} atualizada com sucesso (modo local).`,
      timer: 2000,
    });

    fecharModalEditarOS();
    renderizarOrdens();
  }
}

function renderizarDetalhesOS(os) {
  document.getElementById("detalhes-cliente-nome").textContent =
    os.cliente?.nome || "-";
  document.getElementById("detalhes-cliente-telefone").textContent =
    os.cliente?.telefone || "-";
  document.getElementById("detalhes-cliente-whatsapp").textContent =
    os.cliente?.whatsapp || "-";

  document.getElementById("detalhes-aparelho").textContent = `${getMarcaText(
    os.marca,
  )} ${os.modelo}`;
  document.getElementById("detalhes-cor").textContent = os.cor || "-";
  document.getElementById("detalhes-imei").textContent = os.imei || "-";
  document.getElementById("detalhes-senha").textContent = os.senha || "-";
  document.getElementById("detalhes-defeito").textContent = os.defeito || "-";
  document.getElementById("detalhes-previsao").textContent = formatarData(
    os.previsao,
  );
  document.getElementById("detalhes-liga").textContent = os.checklist || "-";
  document.getElementById("detalhes-valor").textContent = os.orcamento
    ? `R$ ${Number(os.orcamento).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`
    : "-";

  // Fotos
  const fotosContainer = document.querySelector(
    "#modal-detalhes-os .fotos-grid",
  );
  if (fotosContainer) {
    const fotosValidas = (os.fotos || []).filter(Boolean);
    if (fotosValidas.length > 0) {
      fotosContainer.innerHTML = fotosValidas
        .map(
          (foto, index) => `
            <div class="foto-thumb">
              <img src="${foto}" alt="Foto ${index + 1}" />
            </div>
          `,
        )
        .join("");
    } else {
      fotosContainer.innerHTML = `
        <div class="foto-thumb" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
          Sem fotos anexadas nesta OS.
        </div>
      `;
    }
  }

  // Checklist
  const checklist = os.checklist || {};
  document.getElementById("detalhes-liga").textContent =
    checklist.liga === "sim"
      ? "✓ Sim"
      : checklist.liga === "nao"
        ? "✗ Não"
        : "-";
  document.getElementById("detalhes-wifi").textContent =
    checklist.wifi === "sim"
      ? "✓ Sim"
      : checklist.wifi === "nao"
        ? "✗ Não"
        : "-";
  document.getElementById("detalhes-touch").textContent =
    checklist.touch === "sim"
      ? "✓ Sim"
      : checklist.touch === "nao"
        ? "✗ Não"
        : "-";
  document.getElementById("detalhes-botoes").textContent =
    checklist.botoes === "ok"
      ? "✓ Ok"
      : checklist.botoes === "ruim"
        ? "✗ Ruim"
        : "-";

  // Log
  const logContainer = document.getElementById("detalhes-log");
  if (os.log && os.log.length > 0) {
    logContainer.innerHTML = os.log
      .map(
        (entry) => `
      <div class="log-item">
        <span class="log-time">${formatarData(entry.timestamp)}</span>
        <span class="log-text">${entry.text} (${entry.user})</span>
      </div>
    `,
      )
      .join("");
  } else {
    logContainer.innerHTML = `
      <div class="log-item">
        <span class="log-time">-</span>
        <span class="log-text">Nenhum registro</span>
      </div>
    `;
  }
}

//======================
// Print Function
//======================
function imprimirOS(osId) {
  const idParaImpressao = osId || osSelecionada?.id;
  if (!idParaImpressao) return;

  const os = ordensServico.find((o) => o.id === idParaImpressao);
  if (!os) return;

  const fotosValidas = (os.fotos || []).filter(Boolean);

  // Create printable content
  const printContent = `
    <html>
      <head>
        <title>OS ${os.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          .section { margin-bottom: 20px; }
          .section h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .field { margin-bottom: 10px; }
          .field label { font-weight: bold; }
          .field span { margin-left: 10px; }
        </style>
      </head>
      <body>
        <h1>OS ${os.id}</h1>
        <div class="section">
          <h2>Cliente</h2>
          <div class="field">
            <label>Nome:</label>
            <span>${os.cliente?.nome}</span>
          </div>
          <div class="field">
            <label>Telefone:</label>
            <span>${os.cliente?.telefone}</span>
          </div>
          <div class="field">
            <label>WhatsApp:</label>
            <span>${os.cliente?.whatsapp}</span>
          </div>
          <div class="field">
            <label>Email:</label>
            <span>${os.cliente?.email}</span>
          </div>
        </div>
        <div class="section">
          <h2>Aparelho</h2>
          <div class="field">
            <label>Marca:</label>
            <span>${getMarcaText(os.marca)}</span>
          </div>
          <div class="field">
            <label>Modelo:</label>
            <span>${os.modelo}</span>
          </div>
          <div class="field">
            <label>Cor:</label>
            <span>${os.cor}</span>
          </div>
          <div class="field">
            <label>IMEI:</label>
            <span>${os.imei}</span>
          </div>
          <div class="field">
            <label>Senha:</label>
            <span>${os.senha}</span>
          </div>
          
          <div class="field">
            <label>Defeito:</label>
            <span>${os.defeito}</span>
          </div>
        </div>
      <div class="section">
              <h2>Checklist</h2>
              <div class="field">
              <label>Liga:</label>
            <span>${os.checklist?.liga || "-"}</span>
          </div>
          <div class="field">
              <label>Wi-Fi:</label>
              <span>${os.checklist?.wifi || "-"}</span>
          </div>
      <div class="field">
          <label>Touch:</label>
          <span>${os.checklist?.touch || "-"}</span>
      </div>
      <div class="field">
          <label>Botões:</label>
          <span>${
            os.checklist?.botoes === "ok" || os.checklist?.botoes === "sim"
              ? "Ok"
              : os.checklist?.botoes === "ruim" ||
                  os.checklist?.botoes === "nao"
                ? "Ruim"
                : "-"
          }</span>
      </div>
      </div>
        <div class="section">
          <h2>Fotos</h2>  
          ${
            fotosValidas.length > 0
              ? fotosValidas
                  .map(
                    (foto, index) => `  
            <div class="photo">
              <img src="${foto}" alt="Foto ${index + 1}" style="max-width: 100%; margin-bottom: 10px;">
            </div>
            `,
                  )
                  .join("")
              : "<p>Sem fotos anexadas.</p>"
          }
        </div>
        <div class="section">
          <h2>Previsão de Entrega</h2>
          <div class="field">
            <span>${formatarData(os.previsao)}</span>
          </div>
        </div>
        <div class="section">
          <h2>Orçamento</h2>
          <div class="field">
            <span>${os.orcamento ? `R$ ${Number(os.orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</span>
          </div>
        </div>
      </body>
    </html>
  `;
  const printWindow = window.open("", "_blank"); // Removido "os.value" para evitar erros de URL
  printWindow.document.write(printContent);
  printWindow.document.close(); // Essencial para o navegador entender que o conteúdo acabou

  // Aguarda as imagens carregarem antes de abrir a caixa de impressão
  printWindow.onload = function () {
    printWindow.focus(); // Foca na janela nova
    printWindow.print(); // Abre a opção de encontrar/escolher a impressora

    // Fecha a janela após a impressão (ou cancelamento)
    // O setTimeout ajuda a evitar que a janela feche antes do comando de print disparar em alguns browsers
    setTimeout(() => {
      printWindow.close();
    }, 500);
  };
}

function adcionarImpressora() {}
//======================
// Photo Capture
//======================
function capturarFoto(index) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 1. SALVA O ARQUIVO REAL (Para mandar pro ImgBB depois)
      arquivosParaUpload[index] = file;

      const reader = new FileReader();
      reader.onload = (event) => {
        // 2. SALVA O PREVIEW (Apenas para mostrar na tela agora)
        const base64Data = event.target.result;
        fotosOS[index] = base64Data;

        // Atualiza a Interface (UI)
        const slots = document.querySelectorAll(".photo-slot");
        const slot = slots[index];

        let img = slot.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          slot.appendChild(img);
        }

        img.src = base64Data;
        slot.classList.add("has-photo");

        // Esconde o ícone e o texto originais do slot
        const icon = slot.querySelector("i");
        const span = slot.querySelector("span");
        if (icon) icon.style.display = "none";
        if (span) span.style.display = "none";
      };
      reader.readAsDataURL(file);
    }
  };

  input.click();
}

//======================
// Toast Notifications
//======================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "times-circle" : "exclamation-circle"}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ======================
// Function finalizarOS
// ======================

function finalizarOS(osId) {
  const os = ordensServico.find((o) => o.id === osId);
  if (!os) return;

  try {
    // Find and update in Firestore
    db.collection("ordens_servico")
      .where("id", "==", osId)
      .get()
      .then((snapshot) => {
        if (!snapshot.empty) {
          snapshot.docs[0].ref.update({
            status: "entregue",
            updatedAt: new Date(),
          });
        }

        // Update local
        os.status = "entregue";
        os.updatedAt = new Date();
        os.log = os.log || [];
        os.log.push({
          timestamp: new Date(),
          text: "OS finalizada",
          user: "Admin",
        });

        atualizarDashboard();
        renderizarOrdens();
        renderizarOSFinalizadas();
        salvarOrdensLocal();

        Swal.fire({
          icon: "success",
          title: "OS Finalizada!",
          text: `OS ${osId} finalizada com sucesso.
          `,
          timer: 1500,
        });
      });
  } catch (error) {
    console.error("Erro ao finalizar OS:", error);

    // Update locally anyway for demo
    os.status = "entregue";
    atualizarDashboard();
    renderizarOrdens();
    renderizarOSFinalizadas();
    salvarOrdensLocal();
  }
}

function abrirModalOrdensFinalizadas() {
  const modal = document.getElementById("modal-os-finalizadas");
  if (modal) modal.classList.add("active");
  renderizarOSFinalizadas();
}

function fecharModalOrdensFinalizadas() {
  const modal = document.getElementById("modal-os-finalizadas");
  if (modal) modal.classList.remove("active");
}

//======================
// OS Finalizadas
//======================

function renderizarOSFinalizadas() {
  const tbody = document.getElementById("os-finalizadas-table-body");
  const osFinalizadas = ordensServico.filter((os) => os.status === "entregue");
  if (osFinalizadas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fas fa-inbox" style="font-size: 40px; margin-bottom: 10px;"></i><br>
          Nenhuma ordem de serviço finalizada encontrada
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = osFinalizadas
    .map((os) => {
      const statusClass = getStatusClass(os.status);
      const statusText = getStatusText(os.status);
      const marcaTexto = getMarcaText(os.marca);
      const previsaoFormatada = formatarData(os.previsao);

      return `
      <tr>
        <td><span class="os-id">${os.id}</span></td>
        <td>
          <div class="client-cell">
            <span class="client-name">${os.cliente?.nome || "N/A"}</span>
            <span class="client-contact">${os.cliente?.telefone || ""}</span>
          </div>
        </td>
        <td>
          <div class="device-cell">
            <span class="device-model">${marcaTexto} ${os.modelo}</span>
            <span class="device-brand">${os.cor || ""}</span>
          </div>
        </td>
        <td>
          <select class="dropdown-status ${statusClass}" onchange="alterarStatus('${os.id}', this.value)">
            <option value="orcamento" ${os.status === "orcamento" ? "selected" : ""}>Orçamento</option>
            <option value="peca" ${os.status === "peca" ? "selected" : ""}>Aguardando Peça</option>
            <option value="manutencao" ${os.status === "manutencao" ? "selected" : ""}>Em Manutenção</option>
            <option value="pronto" ${os.status === "pronto" ? "selected" : ""}>Pronto</option>
            <option value="entregue" ${os.status === "entregue" ? "selected" : ""}>Entregue</option>
          </select>
        </td>
        <td>${previsaoFormatada}</td>
        <td>
          <div class="actions-cell">
            <button class="action-btn whatsapp" title="WhatsApp" onclick="abrirWhatsApp('${os.cliente?.telefone || ""}')">
              <i class="fab fa-whatsapp"></i>
            </button>
            <button class="action-btn" title="Ver Detalhes" onclick="verDetalhes('${os.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn" title="Editar" onclick="editarOS('${os.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" title="Excluir" onclick="excluirOS('${os.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

//======================
// Estoque
//======================
function abrirModalEstoque() {
  const modal = document.getElementById("modal-estoque");
  Swal.fire({
    title: "Em breve!",
    text: "O módulo de estoque está em desenvolvimento e será lançado em breve. Fique ligado para novidades!",
    icon: "info",
    confirmButtonText: "OK",
  });
}

//======================
// Financeiro
//======================

/**
 * Abre o modal financeiro e dispara a atualização dos dados
 */
function abrirModalFinanceiro() {
  const modal = document.getElementById("modal-financeiro");
  if (!modal) return;

  // 1. Garante que os cálculos estejam atualizados
  atualizarDadosFinanceiros();

  // 2. Abre o modal usando a sua classe CSS de animação
  modal.style.display = "flex";
  setTimeout(() => {
    modal.classList.add("active");
  }, 10);

  // 3. Bloqueia o scroll do fundo para não bugar o layout
  document.body.style.overflow = "hidden";
}

/**
 * Fecha o modal financeiro
 */
function fecharModalFinanceiro() {
  const modal = document.getElementById("modal-financeiro");
  if (!modal) return;

  modal.classList.remove("active");
  setTimeout(() => {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }, 300); // Tempo compatível com a sua transition de 0.3s
}

/**
 * Processa as OS e atualiza os valores na tela
 */
function atualizarDadosFinanceiros() {
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  // Filtra apenas OS concluídas no mês atual
  const osDoMes = ordensServico.filter((os) => {
    const dataOS =
      converterParaData(os.updatedAt) ||
      converterParaData(os.createdAt) ||
      converterParaData(os.previsao);
    if (!dataOS) return false;

    const statusConcluido = os.status === "pronto" || os.status === "entregue";
    return (
      statusConcluido &&
      dataOS.getMonth() === mesAtual &&
      dataOS.getFullYear() === anoAtual
    );
  });

  // --- AJUSTE AQUI ---
  const faturamentoTotal = osDoMes.reduce((acc, os) => {
    // 1. Tenta pegar o valor de 'orcamento' ou 'valor' (caso você tenha mudado o nome)
    let valor = os.orcamento || os.valor || 0;

    // 2. Garante que o valor seja um número (remove R$ e converte vírgula se necessário)
    if (typeof valor === "string") {
      valor = valor.replace("R$", "").replace(".", "").replace(",", ".").trim();
    }

    return acc + (parseFloat(valor) || 0);
  }, 0);
  // -------------------

  const qtdConcluida = osDoMes.length; // Para teste, vamos contar todas as do mês primeiro
  const ticketMedio = qtdConcluida > 0 ? faturamentoTotal / qtdConcluida : 0;

  // Atualização da Tela
  document.getElementById("fin-faturamento").innerText =
    faturamentoTotal.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  document.getElementById("fin-qtd-concluida").innerText = qtdConcluida;
  document.getElementById("fin-ticket-medio").innerText =
    ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Debug: Veja no F12 se os dados estão aparecendo aqui
  console.log("OS encontradas no mês:", osDoMes);
  console.log("Total calculado:", faturamentoTotal);
}

//==================
// Relatorios
//==================
