// ===============================
// SESSÃO / AUTENTICAÇÃO
// Carregado por login.php e por index.php (antes do app.js).
// ===============================


// ⚠️ ATENÇÃO — ESTE ARQUIVO É PÚBLICO
// Tudo aqui é baixado pelo navegador e pode ser lido por qualquer pessoa
// (DevTools > Sources). O token abaixo NÃO é um segredo depois do deploy.
// Se ele for uma chave privada de servidor, o caminho correto é criar um
// proxy no backend e apontar API_LOGIN para ele.

const AUTH_CONFIG = {

    API_LOGIN: "https://api.veloxconsig.com.br/api/auth/login",
    API_CLIENTES: "https://api.veloxconsig.com.br/api/clientes",
    API_IMPORTACOES: "https://api.veloxconsig.com.br/api/importacoes-clientes",

    // Chave da aplicação, enviada no header x-api-key.
    API_KEY: "r0nRPczxCb00l6kxzGlLBmMjd6UC77fL",

    // Token Bearer. Só é enviado quando preenchido — veja montarCabecalhos().
    TOKEN_APP: "",

    // Validade da sessão local, usada quando a API não informa a dela.
    HORAS_SESSAO: 12,

    PAGINA_LOGIN: "login.php",
    PAGINA_APP: "index.php"

};


// Prefixo próprio para não colidir com as chaves por CPF (status_, contato_...)
const CHAVE_TOKEN = "auth_token";
const CHAVE_USUARIO = "auth_usuario";
const CHAVE_EXPIRA = "auth_expira";
const CHAVE_EMAIL_LEMBRADO = "auth_email_lembrado";


// Lê a claim `exp` de um JWT. O token da API vive 1 hora, bem menos que
// HORAS_SESSAO — sem isto, a sessão local sobreviveria ao token e o operador
// levaria 401 a cada ação até perceber que precisa entrar de novo.
function expiracaoDoToken(token){

    try{

        const partes = String(token || "").split(".");

        if(partes.length !== 3) return null;

        const base64 = partes[1].replace(/-/g,"+").replace(/_/g,"/");
        const completo = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");

        const dados = JSON.parse(atob(completo));

        return dados && dados.exp
            ? Number(dados.exp) * 1000
            : null;

    }catch(erro){

        // Não é JWT ou veio malformado: cai nas outras regras de validade.
        return null;

    }

}


function salvarSessao(token, usuario, expiraEmSegundos){

    // Precedência: validade do próprio token > expires_in da API > padrão local.
    const expiraEm = expiracaoDoToken(token);

    const vencimento = expiraEm
        ? expiraEm
        : Date.now() + (
            expiraEmSegundos
                ? Number(expiraEmSegundos) * 1000
                : AUTH_CONFIG.HORAS_SESSAO * 60 * 60 * 1000
        );

    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_EXPIRA, String(vencimento));

    if(usuario){
        localStorage.setItem(CHAVE_USUARIO, usuario);
    }else{
        localStorage.removeItem(CHAVE_USUARIO);
    }

}


function obterToken(){

    return sessaoValida()
        ? localStorage.getItem(CHAVE_TOKEN)
        : null;

}


function obterUsuario(){

    return localStorage.getItem(CHAVE_USUARIO) || "";

}


function sessaoValida(){

    const token = localStorage.getItem(CHAVE_TOKEN);

    if(!token) return false;

    const expira = Number(localStorage.getItem(CHAVE_EXPIRA) || 0);

    // Sessão sem validade gravada é tratada como expirada.
    if(!expira || Date.now() > expira){

        limparSessao();
        return false;

    }

    return true;

}


// Remove apenas os dados de sessão.
// O trabalho do operador (status_, data_, contato_, classificacao_) é preservado.
function limparSessao(){

    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
    localStorage.removeItem(CHAVE_EXPIRA);

}


// Chamado no <head> do index.php, antes de qualquer renderização.
function exigirAutenticacao(){

    if(sessaoValida()) return true;

    limparSessao();
    window.location.replace(AUTH_CONFIG.PAGINA_LOGIN);

    return false;

}


function sair(){

    if(!confirm("Deseja sair da sua conta?")) return;

    limparSessao();
    window.location.replace(AUTH_CONFIG.PAGINA_LOGIN);

}
