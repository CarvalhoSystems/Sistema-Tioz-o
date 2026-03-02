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

// Inicialização
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

//======================
// Função de login
//======================
function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    Swal.fire("Erro", "Preencha todos os campos!", "warning");
    return;
  }

  auth
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      Swal.fire({
        icon: "success",
        title: "Login bem-sucedido!",
        text: "Bem-vindo à Assistencia Tecnica!",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        window.location.href = "./pages/dashboard.html";
      });
    })
    .catch((error) => {
      let mensagemErro = "E-mail ou senha incorretos.";
      console.error(error.code);

      if (error.code === "auth/invalid-email")
        mensagemErro = "E-mail inválido.";
      if (error.code === "auth/user-disabled")
        mensagemErro = "Este usuário foi desativado.";

      Swal.fire({ icon: "error", title: "Erro no login", text: mensagemErro });
    });
}

//======================
// Configuração do Reset de Senha
//======================
// Em vez de uma função solta, vamos ativar o link assim que a página carregar
document.addEventListener("DOMContentLoaded", () => {
  const btnResetar = document.getElementById("reset-senha");

  if (btnResetar) {
    btnResetar.addEventListener("click", (e) => {
      e.preventDefault(); // IMPORTANTE: Impede a página de recarregar

      const email = document.getElementById("email").value.trim();

      if (!email) {
        Swal.fire(
          "Atenção",
          "Digite seu e-mail no campo de usuário para resetar a senha.",
          "info",
        );
        return;
      }

      auth
        .sendPasswordResetEmail(email)
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "E-mail enviado!",
            text: "Verifique sua caixa de entrada para redefinir a senha.",
          });
        })
        .catch((error) => {
          let mensagemErro = "Ocorreu um erro ao resetar.";
          if (error.code === "auth/user-not-found")
            mensagemErro = "E-mail não cadastrado.";
          if (error.code === "auth/invalid-email")
            mensagemErro = "E-mail inválido.";

          Swal.fire({ icon: "error", title: "Erro", text: mensagemErro });
          console.error(error.code);
        });
    });
  }
});
