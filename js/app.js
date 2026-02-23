//======================
// Firebase configuration
//======================

const firebaseConfig = {
  apiKey: "AIzaSyBEdnKqNdO0-LqGHtP0278uEbsooKY8im4",
  authDomain: "assistencia-nascimento-876a0.firebaseapp.com",
  projectId: "assistencia-nascimento-876a0",
  storageBucket: "assistencia-nascimento-876a0.firebasestorage.app",
  messagingSenderId: "122145381544",
  appId: "1:122145381544:web:c1d95604bf349133df769d",
};

// Inicialização correta para scripts compat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

//======================
// Função de login
//======================

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    Swal.fire("Erro", "Preencha todos os campos!", "warning");
    return;
  }

  // Forma correta no modo COMPAT:
  auth
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      Swal.fire({
        icon: "success",
        title: "Login bem-sucedido!",
        text: "Bem-vindo à Assistencia Nascimento!",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        window.location.href = "./pages/dashboard.html";
      });
    })
    .catch((error) => {
      let mensagemErro = "Ocorreu um erro ao entrar.";

      // Tradução de erros comuns para a apresentação ficar profissional
      if (error.code === "auth/user-not-found")
        mensagemErro = "Usuário não encontrado.";
      if (error.code === "auth/wrong-password")
        mensagemErro = "Senha incorreta.";
      if (error.code === "auth/invalid-email")
        mensagemErro = "E-mail inválido.";

      Swal.fire({
        icon: "error",
        title: "Erro no login",
        text: mensagemErro,
      });
      console.error(error.code);
    });
}
