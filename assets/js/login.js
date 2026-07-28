// ===============================
// TELA DE LOGIN
// ===============================

const formLogin = document.getElementById("formLogin");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const caixaErro = document.getElementById("erroLogin");
const btnEntrar = document.getElementById("btnEntrar");
const checkLembrar = document.getElementById("lembrarEmail");


// ===============================
// E-MAIL LEMBRADO
// ===============================

const emailLembrado = localStorage.getItem(CHAVE_EMAIL_LEMBRADO);

if(emailLembrado){

    campoEmail.value = emailLembrado;
    checkLembrar.checked = true;
    campoSenha.focus();

}else{

    campoEmail.focus();

}


// ===============================
// MOSTRAR / OCULTAR SENHA
// ===============================

document
    .getElementById("alternarSenha")
    .addEventListener("click", function(){

        const oculta = campoSenha.type === "password";

        campoSenha.type = oculta ? "text" : "password";

        this.setAttribute(
            "aria-label",
            oculta ? "Ocultar senha" : "Mostrar senha"
        );

        this.innerHTML = oculta
            ? '<i class="bi bi-eye-slash"></i>'
            : '<i class="bi bi-eye"></i>';

        campoSenha.focus();

    });


// ===============================
// MENSAGENS
// ===============================

function mostrarErro(mensagem){

    caixaErro.textContent = mensagem;
    caixaErro.style.display = "block";

}

function limparErro(){

    caixaErro.textContent = "";
    caixaErro.style.display = "none";

    document
        .querySelectorAll(".campoLogin")
        .forEach(c => c.classList.remove("comErro"));

}

function marcarCampoComErro(campo){

    if(campo && campo.parentElement){
        campo.parentElement.classList.add("comErro");
    }

}

function carregando(ativo){

    btnEntrar.disabled = ativo;
    btnEntrar.classList.toggle("carregando", ativo);

    btnEntrar.querySelector(".textoBtnEntrar").textContent =
        ativo ? "Entrando..." : "Entrar";

    campoEmail.disabled = ativo;
    campoSenha.disabled = ativo;

}


// ===============================
// LEITURA DA RESPOSTA DA API
// O formato exato do retorno ainda não foi confirmado, então os nomes
// de campo mais comuns são aceitos. Ao confirmar, dá para reduzir isto
// ao caminho real.
// ===============================

function extrairToken(corpo){

    if(!corpo || typeof corpo !== "object") return "";

    const dados = corpo.data || corpo.dados || corpo;

    return dados.token ||
        dados.access_token ||
        dados.accessToken ||
        corpo.token ||
        corpo.access_token ||
        corpo.accessToken ||
        "";

}

function extrairUsuario(corpo){

    if(!corpo || typeof corpo !== "object") return "";

    const dados = corpo.data || corpo.dados || corpo;
    const usuario = dados.user || dados.usuario || corpo.user || corpo.usuario;

    if(usuario && typeof usuario === "object"){
        return usuario.name || usuario.nome || usuario.email || "";
    }

    return dados.name || dados.nome || dados.email || "";

}

function extrairValidade(corpo){

    if(!corpo || typeof corpo !== "object") return null;

    const dados = corpo.data || corpo.dados || corpo;

    return dados.expires_in ||
        dados.expiresIn ||
        corpo.expires_in ||
        corpo.expiresIn ||
        null;

}

function extrairMensagem(corpo){

    if(!corpo || typeof corpo !== "object") return "";

    if(typeof corpo.message === "string") return corpo.message;
    if(typeof corpo.mensagem === "string") return corpo.mensagem;
    if(typeof corpo.error === "string") return corpo.error;
    if(typeof corpo.erro === "string") return corpo.erro;

    // Padrão de validação do Laravel: {errors:{email:["..."]}}
    const erros = corpo.errors || corpo.erros;

    if(erros && typeof erros === "object"){

        const primeira = Object.values(erros)[0];

        if(Array.isArray(primeira) && primeira.length) return String(primeira[0]);
        if(typeof primeira === "string") return primeira;

    }

    return "";

}


// ===============================
// CABEÇALHOS DA REQUISIÇÃO
// ===============================

function montarCabecalhos(){

    const cabecalhos = {
        "Content-Type":"application/json",
        "Accept":"application/json",
        "x-api-key": AUTH_CONFIG.API_KEY
    };

    // O Bearer só entra quando há um token de verdade configurado:
    // enviar o placeholder faria a API recusar por credencial inválida.
    if(AUTH_CONFIG.TOKEN_APP && AUTH_CONFIG.TOKEN_APP !== "YOUR_SECRET_TOKEN"){

        cabecalhos["Authorization"] = "Bearer " + AUTH_CONFIG.TOKEN_APP;

    }

    return cabecalhos;

}


// ===============================
// ENVIO
// ===============================

formLogin.addEventListener("submit", async function(evento){

    evento.preventDefault();
    limparErro();

    const email = campoEmail.value.trim();
    const senha = campoSenha.value;

    if(!email){
        marcarCampoComErro(campoEmail);
        mostrarErro("Informe seu e-mail.");
        campoEmail.focus();
        return;
    }

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        marcarCampoComErro(campoEmail);
        mostrarErro("Informe um e-mail válido.");
        campoEmail.focus();
        return;
    }

    if(!senha){
        marcarCampoComErro(campoSenha);
        mostrarErro("Informe sua senha.");
        campoSenha.focus();
        return;
    }

    carregando(true);

    let resposta;

    try{

        resposta = await fetch(AUTH_CONFIG.API_LOGIN,{
            method:"POST",
            headers: montarCabecalhos(),
            body: JSON.stringify({
                email: email,
                password: senha
            })
        });

    }catch(erro){

        // fetch só rejeita por falha de rede ou bloqueio de CORS.
        // Como x-api-key é um header customizado, o navegador dispara um
        // preflight OPTIONS antes do POST: a API precisa respondê-lo liberando
        // esta origem e o header (Access-Control-Allow-Headers: x-api-key).
        carregando(false);
        mostrarErro(
            "Não foi possível falar com o servidor. " +
            "Verifique sua conexão — se o problema persistir, pode ser bloqueio de CORS na API."
        );
        console.error("Falha de rede/CORS no login:", erro);
        return;

    }

    let corpo = null;

    try{
        corpo = await resposta.json();
    }catch(erro){
        // Resposta sem JSON válido (HTML de erro, corpo vazio...).
    }

    carregando(false);

    if(!resposta.ok){

        const mensagemApi = extrairMensagem(corpo);

        if(resposta.status === 401 || resposta.status === 403){

            marcarCampoComErro(campoEmail);
            marcarCampoComErro(campoSenha);
            mostrarErro(mensagemApi || "E-mail ou senha incorretos.");
            campoSenha.value = "";
            campoSenha.focus();

        }else if(resposta.status === 422){

            mostrarErro(mensagemApi || "Dados inválidos. Confira o e-mail e a senha.");

        }else if(resposta.status === 429){

            mostrarErro(mensagemApi || "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.");

        }else if(resposta.status >= 500){

            mostrarErro("O servidor está indisponível no momento. Tente novamente em instantes.");

        }else{

            mostrarErro(mensagemApi || ("Não foi possível entrar (erro " + resposta.status + ")."));

        }

        return;

    }

    const token = extrairToken(corpo);

    if(!token){

        mostrarErro("O servidor respondeu, mas não enviou o token de acesso. Avise o suporte.");
        console.error("Resposta de login sem token. Campos recebidos:", corpo ? Object.keys(corpo) : corpo);
        return;

    }

    if(checkLembrar.checked){
        localStorage.setItem(CHAVE_EMAIL_LEMBRADO, email);
    }else{
        localStorage.removeItem(CHAVE_EMAIL_LEMBRADO);
    }

    salvarSessao(token, extrairUsuario(corpo), extrairValidade(corpo));

    window.location.replace(AUTH_CONFIG.PAGINA_APP);

});


// Digitar novamente limpa o erro anterior.
[campoEmail, campoSenha].forEach(campo=>{
    campo.addEventListener("input", limparErro);
});
