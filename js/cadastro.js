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

function cadastro() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    Swal.fire("Erro", "Preencha todos os campos!", "warning");
    return;
  }

  // authenticar novos usuarios
}
