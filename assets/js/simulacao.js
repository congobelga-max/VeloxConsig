// ===============================
// SIMULAÇÃO DE OFERTAS (OpenCredit)
// Ao abrir "Montar proposta", consulta as ofertas do CPF e escreve a mensagem
// pronta para o cliente. Depende de app.js (abrirModalProposta, normalizarCpf,
// montarMensagemOfertas, MENSAGEM_SEM_OFERTA).
// ===============================


// ⚠️ ATENÇÃO — ESTE ARQUIVO É PÚBLICO
// Assim como auth.js, tudo aqui é baixado pelo navegador e pode ser lido por
// qualquer pessoa (DevTools > Sources). A SENHA ABAIXO NÃO É UM SEGREDO depois
// do deploy: quem abrir a página consegue autenticar como esta conta. O caminho
// correto é um proxy no backend que guarde a credencial e exponha só a rota de
// simulação — enquanto isso não existir, trate esta senha como comprometida e
// rotacionável.
const SIMULACAO_CONFIG = {

    API_LOGIN: "https://core.api.opencredit.tech/api/auth/login",

    // Todas as rotas de integração penduram deste caminho.
    API_BASE: "https://core.api.opencredit.tech/api/tenants/" +
        "bbd2b273-1ec5-4b10-bb54-9f7b764bc88a/integration",

    EMAIL: "carollinymoreira@gmail.com",
    SENHA: "qGnbAWa!EYHE"

};


function rotaOpenCredit(caminho){

    return SIMULACAO_CONFIG.API_BASE + caminho;

}


// Só em memória: some ao recarregar a página, e não fica no localStorage junto
// da sessão do CRM — são autenticações de serviços diferentes.
let tokenSimulacao = "";

let simulacaoEmAndamento = false;


// ===============================
// AUTENTICAÇÃO
// ===============================

// O retorno confirmado é {data:{accessToken, refreshToken, tokenType, expiresIn}};
// as outras grafias ficam aceitas por segurança.
function extrairAccessToken(corpo){

    if(!corpo || typeof corpo !== "object") return "";

    const dados = corpo.data || corpo;

    return dados.accessToken ||
        dados.access_token ||
        dados.token ||
        "";

}


// opcoes: {metodo, corpo, token}
async function requisitarSimulacao(url, opcoes){

    opcoes = opcoes || {};

    const cabecalhos = {
        "Accept":"application/json"
    };

    if(opcoes.corpo !== undefined){
        cabecalhos["Content-Type"] = "application/json";
    }

    if(opcoes.token) cabecalhos["Authorization"] = "Bearer " + opcoes.token;

    let resposta;

    try{

        resposta = await fetch(url,{
            method: opcoes.metodo || "GET",
            headers: cabecalhos,
            body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo)
        });

    }catch(erro){

        // fetch não distingue offline de preflight barrado.
        const falha = new Error(
            "Não foi possível falar com o serviço da OpenCredit. " +
            "Verifique a conexão — se persistir, pode ser bloqueio de CORS."
        );

        falha.status = 0;

        throw falha;

    }

    let corpo = null;

    if(resposta.status !== 204){

        try{
            corpo = await resposta.json();
        }catch(erro){
            // Resposta sem JSON válido.
        }

    }

    if(!resposta.ok){

        const falha = new Error(
            // O erro vem como {error:{code, message}}; mensagemDaApi() cobre
            // os formatos mais comuns e este fica explícito.
            (corpo && corpo.error && corpo.error.message) ||
            mensagemDaApi(corpo) ||
            ("Erro " + resposta.status + " na requisição.")
        );

        falha.status = resposta.status;
        falha.corpo = corpo;

        throw falha;

    }

    return corpo;

}


async function autenticarSimulacao(){

    const corpo = await requisitarSimulacao(SIMULACAO_CONFIG.API_LOGIN,{
        metodo:"POST",
        corpo:{
            email: SIMULACAO_CONFIG.EMAIL,
            password: SIMULACAO_CONFIG.SENHA
        }
    });

    const token = extrairAccessToken(corpo);

    if(!token){
        throw new Error("O serviço da OpenCredit não devolveu o accessToken.");
    }

    return token;

}


// Ponto único de chamada autenticada. O token vale cerca de 8h; em vez de
// controlar a validade, ele é reaproveitado até o servidor recusar: um 401
// refaz o login e repete a chamada uma única vez.
async function chamarOpenCredit(caminho, opcoes, jaRepetiu){

    if(!tokenSimulacao){
        tokenSimulacao = await autenticarSimulacao();
    }

    try{

        const corpo = await requisitarSimulacao(
            rotaOpenCredit(caminho),
            Object.assign({}, opcoes, {token: tokenSimulacao})
        );

        return (corpo && corpo.data !== undefined) ? corpo.data : (corpo || {});

    }catch(erro){

        if(erro.status === 401 && !jaRepetiu){

            tokenSimulacao = "";

            return chamarOpenCredit(caminho, opcoes, true);

        }

        throw erro;

    }

}


function simularCpf(cpf){

    return chamarOpenCredit("/simulate",{
        metodo:"POST",
        corpo:{cpf: cpf}
    });

}


// ===============================
// SIMULAÇÃO REAPROVEITADA
// A consulta é a chamada mais lenta do fluxo e as duas telas pedem a mesma
// coisa para o mesmo CPF: a proposta simula, e o contrato — aberto logo em
// seguida — reaproveita aquela lista em vez de consultar de novo.
// Fica só em memória: recarregar a página começa do zero.
// ===============================

const simulacoesEmMemoria = new Map();


function simulacaoJaCarregada(cpf){

    return simulacoesEmMemoria.has(normalizarCpf(cpf));

}


async function obterSimulacao(cpf, forcar){

    const chave = normalizarCpf(cpf);

    if(!forcar && simulacoesEmMemoria.has(chave)){
        return simulacoesEmMemoria.get(chave);
    }

    const dados = await simularCpf(chave);

    simulacoesEmMemoria.set(chave, dados);

    return dados;

}


// Depois de virar contrato, a lista guardada não vale mais.
function esquecerSimulacao(cpf){

    simulacoesEmMemoria.delete(normalizarCpf(cpf));

}


// ===============================
// LEITURA DAS OFERTAS
// ===============================

function moedaSimples(valor){

    return Number(valor || 0).toLocaleString("pt-BR",{
        minimumFractionDigits:2,
        maximumFractionDigits:2
    });

}


// Um bloco por banco com oferta — cada um vira uma "Opção N" na mensagem.
// É o que permite mostrar dois prazos iguais de bancos diferentes sem citar
// o banco: eles ficam em opções separadas, e não em duas linhas idênticas.
function opcoesDaSimulacao(dados){

    const bancos = Array.isArray(dados.banks) ? dados.banks : [];

    return bancos

        .map(banco=>{

            const ofertas = (Array.isArray(banco.offers) ? banco.offers : [])

                .map(oferta=>({
                    // Os identificadores não aparecem na mensagem: servem para
                    // o assistente de contrato selecionar a oferta na API.
                    offerId: oferta.offerId || "",
                    prazo: Number(oferta.installments) || 0,
                    bruto: Number(oferta.liquidAmount) || 0,
                    parcela: moedaSimples(oferta.installmentAmount),
                    liberado: moedaSimples(oferta.liquidAmount)
                }))

                .filter(oferta => oferta.prazo && oferta.bruto)

                .sort((a,b) => a.prazo - b.prazo);

            return {
                simulationId: banco.simulationId || "",
                ofertas: ofertas,
                melhor: ofertas.reduce((maior,x) => Math.max(maior, x.bruto), 0)
            };

        })

        .filter(bloco => bloco.ofertas.length)

        // Maior valor liberado primeiro: a Opção 1 é sempre a mais forte.
        .sort((a,b) => b.melhor - a.melhor);

}


// Motivos das recusas, para o operador — sem o nome do banco, que não aparece
// em nenhuma saída desta tela.
function motivosDaSimulacao(dados){

    const bancos = Array.isArray(dados.banks) ? dados.banks : [];

    const motivos = bancos
        .filter(banco => !(banco.offers || []).length)
        .map(banco => String(banco.reason || "").trim())
        .filter(motivo => motivo !== "");

    const barreiras = (Array.isArray(dados.barriers) ? dados.barriers : [])
        .map(barreira =>
            typeof barreira === "string"
                ? barreira
                : String((barreira && (barreira.message || barreira.reason)) || "")
        )
        .filter(texto => texto.trim() !== "");

    // Bancos diferentes costumam repetir o mesmo motivo.
    return Array.from(new Set(barreiras.concat(motivos)));

}


// ===============================
// FLUXO DO BOTÃO
// ===============================

function avisoProposta(texto){

    const aviso = document.getElementById("avisoProposta");

    if(!aviso) return;

    aviso.textContent = texto;
    aviso.style.display = texto ? "block" : "none";

}


// Chamado pelo botão "Montar proposta" dos cards e do detalhe da tabela.
function montarProposta(id){

    abrirModalProposta(id);

    // abrirModalProposta define clientePropostaAtual (ou avisa e sai).
    if(!clientePropostaAtual) return;

    consultarOfertasDoCliente(clientePropostaAtual);

}


async function consultarOfertasDoCliente(cliente){

    const campo = document.getElementById("mensagemProposta");

    if(simulacaoEmAndamento) return;

    simulacaoEmAndamento = true;

    avisoProposta("⏳ Consultando ofertas para o CPF " + cliente.cpf + "...");

    try{

        const dados = await obterSimulacao(cliente.cpf);

        // O modal pode ter sido fechado e reaberto em outro cliente enquanto
        // a consulta corria: o retorno atrasado não sobrescreve a tela.
        if(!clientePropostaAtual || clientePropostaAtual.id !== cliente.id) return;

        const opcoes = opcoesDaSimulacao(dados);

        if(opcoes.length){

            campo.value = montarMensagemOfertas(opcoes);

            localStorage.setItem("classificacao_" + cliente.id, "oferta_disponivel");
            localStorage.setItem("classificacao_texto_" + cliente.id, "Oferta disponível");

            const condicoes = opcoes.reduce(
                (soma, opcao) => soma + opcao.ofertas.length,
                0
            );

            avisoProposta(
                "✓ " + opcoes.length + (opcoes.length === 1 ? " opção" : " opções") +
                " · " + condicoes +
                (condicoes === 1 ? " condição encontrada." : " condições encontradas.")
            );

            return;

        }

        campo.value = MENSAGEM_SEM_OFERTA;

        localStorage.setItem("classificacao_" + cliente.id, "sem_oferta");
        localStorage.setItem("classificacao_texto_" + cliente.id, "Sem oferta bancária");

        const motivos = motivosDaSimulacao(dados);

        avisoProposta(
            (dados.blocked ? "🚫 CONSULTA BLOQUEADA" : "🟠 SEM OFERTA DISPONÍVEL") +
            (motivos.length ? " | " + motivos.join(" | ") : "")
        );

    }catch(erro){

        // O caminho manual continua de pé: o operador cola o retorno do
        // Telegram e usa "Gerar proposta".
        avisoProposta(
            "⚠️ " + erro.message +
            " Você ainda pode colar a resposta do Telegram e gerar a proposta."
        );

        console.error("Falha ao simular ofertas:", erro);

    }finally{

        simulacaoEmAndamento = false;

    }

}
