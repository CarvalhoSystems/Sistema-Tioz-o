//======================
// Firebase configuration
//======================

const firebaseConfig = {
  apiKey: "AIzaSyBEdnKqNdO0-LqGHtP0278uEbsooKY8im4",
  authDomain: "assistencia-nascimento-876a0.firebaseapp.com",
  projectId: "assistencia-nascimento-876a0",
  storageBucket: "assistencia-nascimento-876a0.appspot.com",
  messagingSenderId: "122145381544",
  appId: "1:122145381544:web:c1d95604bf349133df769d",
};

// Inicialização correta para scripts compat
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// =======================
// Função de cadastro Novos usuários
// =======================

function cadastro() {
  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!nome || !email || !password || !confirmPassword) {
    Swal.fire("Erro", "Preencha todos os campos!", "warning");
    return;
  }

  if (password !== confirmPassword) {
    Swal.fire("Erro", "As senhas não conferem.", "warning");
    return;
  }

  if (password.length < 6) {
    Swal.fire("Erro", "A senha deve ter no mínimo 6 caracteres.", "warning");
    return;
  }
  // Forma correta no modo COMPAT:
  auth
    .createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // User account created and signed in
      const user = userCredential.user;
      console.log("User account created:", user);

      // Envia o nome do usuário para o banco de dados
      user.updateProfile({
        displayName: nome,
      });

      Swal.fire({
        icon: "success",
        title: "Cadastro bem-sucedido!",
        text: "Bem-vindo à Assistencia Nascimento!",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        window.location.href = "../pages/dashboard.html";
      });
    })
    .catch((error) => {
      let mensagemErro = "Ocorreu um erro ao cadastrar.";

      // Tradução de erros comuns para a apresentação ficar profissional
      if (error.code === "auth/email-already-in-use")
        mensagemErro = "E-mail já cadastrado.";
      if (error.code === "auth/invalid-email")
        mensagemErro = "E-mail inválido.";
      if (error.code === "auth/operation-not-allowed")
        mensagemErro = "Usuário já cadastrado.";

      Swal.fire({
        icon: "error",
        title: "Erro no cadastro",
        text: mensagemErro,
      });
      console.error(error.code);
    });
}
//======================
// Função de voltar
//======================

function voltar() {
  window.location.href = "../index.html";
}
