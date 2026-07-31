// ===============================
// GERAR CONTRATO — assistente de 4 etapas
// 1) Oferta:   simula e seleciona UMA oferta (POST /simulate/:id/select)
// 2) Cadastro: carrega o cliente e completa o que falta (GET + PATCH /clients)
// 3) Banco:    conta de recebimento (POST /clients/:cpf/bank-accounts)
// 4) Contrato: resumo das etapas, texto para o cliente e POST /proposals
//
// Nenhuma etapa avança sem estar validada. Depende de simulacao.js
// (chamarOpenCredit, opcoesDaSimulacao) e de app.js (escapes, normalizarCpf).
// ===============================

const TOTAL_ETAPAS_CONTRATO = 4;

let contratoCliente = null;

let contratoEtapa = 1;

// Retorno de cada chamada, guardado para as etapas seguintes.
let contratoSimulacao = null;
let contratoOpcoes = [];
let contratoSelecao = null;        // {simulationId, offerId, prazo, parcela, liberado}
let contratoSelecaoConfirmada = false;

let contratoDadosCliente = null;   // {found, client, creditProfile, barriers}
let contratoValidacao = null;      // {found, valid, pendingFields, reason}
let contratoProposta = null;       // retorno do POST /proposals

// Conta usada no contrato: id que vai na proposta e os dados para o resumo.
let contratoContaId = "";
let contratoContaDados = null;

let contratoOcupado = false;


// ===============================
// ABERTURA E NAVEGAÇÃO
// ===============================

function abrirModalContrato(id){

    contratoCliente = clientes.find(c => String(c.id) === String(id));

    if(!contratoCliente){
        notificar("Cliente não encontrado.", "erro");
        return;
    }

    contratoEtapa = 1;
    contratoSimulacao = null;
    contratoOpcoes = [];
    contratoSelecao = null;
    contratoSelecaoConfirmada = false;
    contratoDadosCliente = null;
    contratoValidacao = null;
    contratoProposta = null;
    contratoContaId = "";
    contratoContaDados = null;
    contratoContaCriada = "";

    document.getElementById("clienteContrato").textContent =
        contratoCliente.nome + " · " + contratoCliente.cpf;

    for(let n = 1; n <= TOTAL_ETAPAS_CONTRATO; n++){
        document.getElementById("etapaContrato" + n).innerHTML = "";
    }

    mostrarEtapaContrato(1);

    bootstrap.Modal
        .getOrCreateInstance(document.getElementById("modalContrato"))
        .show();

    carregarOfertasContrato();

}


function mostrarEtapaContrato(numero){

    contratoEtapa = numero;

    [1,2,3,4].forEach(n=>{

        const painel = document.getElementById("etapaContrato" + n);
        const passo = document.getElementById("passoContrato" + n);

        if(painel) painel.style.display = n === numero ? "block" : "none";

        if(passo){
            passo.classList.toggle("ativo", n === numero);
            passo.classList.toggle("concluido", n < numero);
        }

    });

    atualizarResumoSelecaoContrato();

    const voltar = document.getElementById("btnVoltarContrato");
    const avancar = document.getElementById("btnAvancarContrato");

    // Com a proposta criada o assistente acabou: não há para onde navegar.
    if(voltar){
        voltar.style.display = (numero === 1 || contratoProposta) ? "none" : "inline-flex";
    }

    if(avancar){
        avancar.style.display = contratoProposta ? "none" : "inline-flex";
    }

    // A etapa 3 é a única sem texto para o cliente — a conta já foi pedida na
    // 2. A decisão olha só o número da etapa: o CSS deixa os botões visíveis
    // por padrão, então uma falha aqui os mantém na tela, nunca some com eles.
    const acoes = document.getElementById("acoesOfertaContrato");

    if(acoes) acoes.style.display = numero === 3 ? "none" : "flex";

    atualizarBotaoAvancar();

}


// Rótulo e estado do botão Avançar. Precisa rodar em toda troca de etapa,
// não só ao terminar um carregamento: voltar da etapa 2 para a 1 deixava o
// botão travado com a regra da etapa 2 e prendia o operador na tela.
function atualizarBotaoAvancar(){

    const avancar = document.getElementById("btnAvancarContrato");

    if(!avancar || contratoOcupado) return;

    avancar.textContent =
        contratoEtapa === TOTAL_ETAPAS_CONTRATO ? "📄 Gerar contrato" : "Avançar";

    // Nunca desabilitado fora de um carregamento: botão apagado não diz o que
    // falta. A etapa 2 valida no clique e nomeia o campo que está errado.
    avancar.disabled = false;

}


// A parcela escolhida acompanha o operador da etapa 2 em diante — é o dado
// que ele precisa ter à vista ao completar o cadastro e fechar o contrato.
// Na etapa 1 fica oculta: a lista de ofertas logo abaixo já a mostra.
function atualizarResumoSelecaoContrato(){

    const caixa = document.getElementById("resumoSelecaoContrato");

    if(!caixa) return;

    if(contratoEtapa === 1 || !contratoSelecao){

        caixa.innerHTML = "";
        caixa.style.display = "none";

        return;

    }

    caixa.innerHTML =
        "<span>Parcela selecionada" +
        (contratoSelecao.banco ? " · " + escaparHtml(contratoSelecao.banco) : "") +
        "</span><strong>" +
        contratoSelecao.prazo + "x de R$ " + escaparHtml(contratoSelecao.parcela) +
        " → recebe R$ " + escaparHtml(contratoSelecao.liberado) + "</strong>";

    caixa.style.display = "block";

}


function avisoContrato(texto, tipo){

    const aviso = document.getElementById("avisoContrato");

    if(!aviso) return;

    aviso.className = "avisoContrato aviso-" + (tipo || "info");
    aviso.textContent = texto || "";
    aviso.style.display = texto ? "block" : "none";

}


function ocupadoContrato(ativo, rotulo){

    contratoOcupado = ativo;

    const avancar = document.getElementById("btnAvancarContrato");

    if(!avancar) return;

    if(ativo){

        avancar.disabled = true;
        avancar.textContent = rotulo || "Aguarde...";

        return;

    }

    // Liberar o botão ao fim de um carregamento não pode passar por cima da
    // validação da etapa 2: sem os campos pendentes, ele continua travado.
    atualizarBotaoAvancar();

}


async function avancarEtapaContrato(){

    if(contratoOcupado) return;

    if(contratoEtapa === 1) return confirmarOfertaContrato();
    if(contratoEtapa === 2) return confirmarCadastroContrato();
    if(contratoEtapa === 3) return confirmarContaContrato();

    return gerarContrato();

}


function voltarEtapaContrato(){

    if(contratoOcupado || contratoEtapa === 1) return;

    avisoContrato("");
    mostrarEtapaContrato(contratoEtapa - 1);

}


// ===============================
// ETAPA 1 — OFERTAS
// ===============================

// `forcar` refaz a consulta; sem ele, a lista já carregada pela proposta é
// reaproveitada e o modal abre sem nova ida à API.
async function carregarOfertasContrato(forcar){

    const painel = document.getElementById("etapaContrato1");

    const reaproveitando = !forcar && simulacaoJaCarregada(contratoCliente.cpf);

    // Consultar de novo pode devolver outros ids: a escolha anterior não vale
    // mais, e os rádios voltam desmarcados de qualquer forma.
    if(forcar){
        contratoSelecao = null;
        contratoSelecaoConfirmada = false;
    }

    if(!reaproveitando){

        painel.innerHTML = '<div class="carregandoContrato">Consultando ofertas...</div>';

        ocupadoContrato(true, "Consultando...");

    }

    try{

        contratoSimulacao = await obterSimulacao(contratoCliente.cpf, forcar);
        contratoOpcoes = opcoesDaSimulacao(contratoSimulacao);

        renderizarOfertasContrato(reaproveitando);

    }catch(erro){

        painel.innerHTML = '<div class="erroContrato">' + escaparHtml(erro.message) + "</div>";

        console.error("Falha ao simular para o contrato:", erro);

    }finally{

        ocupadoContrato(false);

    }

}


function renderizarOfertasContrato(reaproveitando){

    const painel = document.getElementById("etapaContrato1");

    if(!contratoOpcoes.length){

        painel.innerHTML =
            '<div class="erroContrato">Nenhuma oferta disponível para este CPF. ' +
            "Sem oferta não há contrato a gerar.</div>";

        avisoContrato(
            (motivosDaSimulacao(contratoSimulacao)[0] || "Nenhum banco liberou oferta."),
            "erro"
        );

        return;

    }

    avisoContrato("Selecione uma opção para continuar.", "info");

    // Reaproveitar a lista poupa a chamada mais lenta do fluxo, mas o operador
    // precisa saber que ela não acabou de ser consultada — e poder refazer.
    const origem = reaproveitando
        ? '<div class="origemOfertas">Condições da consulta já feita para este CPF. ' +
          '<button type="button" onclick="carregarOfertasContrato(true)">Consultar novamente</button></div>'
        : "";

    // Aqui quem lê é o operador: o banco aparece com nome. É só na mensagem
    // enviada ao cliente que os blocos viram "Opção 1", "Opção 2"...
    painel.innerHTML = origem + contratoOpcoes.map((opcao, indice)=>{

        const linhas = opcao.ofertas.map(oferta=>{

            const valor = escaparHtml(opcao.simulationId + "|" + oferta.offerId);

            return '<label class="ofertaContrato">' +
                '<input type="radio" name="ofertaContrato" value="' + valor + '" ' +
                'onchange="escolherOfertaContrato(this.value)">' +
                '<span class="ofertaTexto"><strong>' + oferta.prazo + "x</strong> de R$ " +
                escaparHtml(oferta.parcela) + " → recebe <strong>R$ " +
                escaparHtml(oferta.liberado) + "</strong></span>" +
                "</label>";

        }).join("");

        const titulo = opcao.banco
            ? escaparHtml(opcao.banco)
            : "Opção " + (indice + 1);

        return '<div class="blocoOpcao"><h6>' + titulo + "</h6>" + linhas + "</div>";

    }).join("");

}


// Copiar e WhatsApp ficam no rodapé do modal, junto de Voltar e Avançar, e
// aparecem em todas as etapas: cada uma tem o texto que o operador precisa
// mandar naquele ponto do atendimento.
//
//   1  ofertas                                  2  pedido de dados
//   3  nenhum (só cadastro da conta)            4  resumo / link de assinatura
//
// A etapa 3 não envia nada: os dados bancários já foram pedidos junto com os
// do cadastro, na etapa 2, para não fatiar o pedido em duas mensagens.
function textoParaEnvioContrato(){

    if(contratoEtapa === 1) return mensagemOfertasContrato();
    if(contratoEtapa === 2) return mensagemDadosCadastroContrato();
    if(contratoEtapa === 3) return "";

    const campo = document.getElementById("mensagemContrato");

    // Na etapa 4 o texto é editável: vale o que estiver no campo. Se ele ainda
    // não existe (o resumo é desenhado depois), monta na hora.
    return campo && campo.value.trim()
        ? campo.value.trim()
        : mensagemResumoContrato();

}


function primeiroNomeContrato(){

    return String(contratoCliente && contratoCliente.nome || "")
        .trim()
        .split(/\s+/)[0];

}


// Os `label` que a API manda são escritos para o operador ("o número do RG do
// cliente"). Para o cliente eles são reescritos aqui, na primeira pessoa.
const ROTULOS_CLIENTE = {
    nome:"Seu nome completo",
    nome_mae:"Nome completo da sua mãe",
    data_nascimento:"Sua data de nascimento",
    celular:"Seu celular com DDD",
    email:"Seu e-mail",
    genero:"Gênero",
    estado_civil:"Estado civil",
    rg:"Número do RG (somente números)",
    orgao_emissor:"Órgão emissor do RG (ex: SSP)",
    uf_emissor:"Estado emissor do RG (sigla, ex: MG)",
    data_expedicao:"Data de emissão do RG (DD/MM/AAAA)",
    endereco_cep:"CEP",
    endereco_rua:"Rua",
    endereco_numero:"Número",
    endereco_complemento:"Complemento",
    endereco_bairro:"Bairro",
    endereco_cidade:"Cidade",
    endereco_uf:"Estado (UF)"
};


// Só entra no pedido se o cliente ainda não tem conta cadastrada — pedir um
// dado que a API já tem só atrasa a resposta.
function blocoContaContrato(){

    const cliente = (contratoDadosCliente && contratoDadosCliente.client) || {};
    const contas = Array.isArray(cliente.bankAccounts) ? cliente.bankAccounts : [];

    if(contas.length) return "";

    return "🏦 Conta para receber o valor\n" +
        "• Banco\n" +
        "• Agência\n" +
        "• Conta com dígito\n" +
        "• Tipo (corrente ou poupança)";

}


// Documentos e conta bancária no mesmo pedido: o cliente responde uma vez só.
function mensagemDadosCadastroContrato(){

    const nome = primeiroNomeContrato();

    const pendentes = (contratoValidacao && contratoValidacao.pendingFields) || [];
    const conta = blocoContaContrato();

    if(!pendentes.length && !conta){

        return "Oi, " + nome + "! Seu cadastro está completo aqui 😊\n\n" +
            "Confirma que seus dados seguem corretos para eu dar andamento na proposta?";

    }

    const blocos = [];

    if(pendentes.length){

        blocos.push(
            "📄 Documentos\n" +
            pendentes
                .map(campo => "• " + (ROTULOS_CLIENTE[campo.field] || campo.label || campo.field))
                .join("\n")
        );

    }

    if(conta) blocos.push(conta);

    const umItemSo = pendentes.length === 1 && !conta;

    return "Oi, " + nome + "! Para dar andamento na sua proposta, preciso de " +
        (umItemSo ? "mais um dado" : "mais alguns dados") + " 😊\n\n" +
        blocos.join("\n\n") + "\n\n" +
        (conta ? "A conta precisa estar no seu nome. " : "") +
        "Pode me enviar por aqui?";

}


// O texto é o mesmo da proposta — montarMensagemOfertas() é quem manda no
// modelo, então as duas telas nunca mandam redações diferentes ao cliente.
function mensagemOfertasContrato(){

    return contratoOpcoes.length ? montarMensagemOfertas(contratoOpcoes) : "";

}


async function copiarTextoContrato(){

    const mensagem = textoParaEnvioContrato();

    if(!mensagem) return notificar("Nenhum texto para copiar.", "erro");

    await copiarParaAreaDeTransferencia(mensagem);

    notificar("Texto copiado!", "sucesso");

}


function enviarTextoContratoWhatsApp(){

    const mensagem = textoParaEnvioContrato();

    if(!mensagem) return notificar("Nenhum texto para enviar.", "erro");

    abrirWhatsappComTexto(contratoCliente.telefone, mensagem);

}


function escolherOfertaContrato(valor){

    const partes = String(valor).split("|");

    const opcao = contratoOpcoes.find(o => o.simulationId === partes[0]);
    const oferta = opcao && opcao.ofertas.find(f => f.offerId === partes[1]);

    if(!oferta) return;

    contratoSelecao = {
        simulationId: partes[0],
        offerId: partes[1],
        banco: opcao.banco || "",
        prazo: oferta.prazo,
        parcela: oferta.parcela,
        liberado: oferta.liberado
    };

    // Trocar a oferta invalida o select já enviado.
    contratoSelecaoConfirmada = false;

    avisoContrato(
        "Selecionado: " + oferta.prazo + "x de R$ " + oferta.parcela +
        " → R$ " + oferta.liberado,
        "info"
    );

}


// O /select acontece aqui, ao sair da etapa 1, e não lá no fim junto da
// proposta: a validação do cadastro depende dele. Os `pendingFields` que
// /clients/validate devolve variam conforme o banco da oferta escolhida —
// sem a seleção registrada, a etapa 2 pede os campos errados.
async function confirmarOfertaContrato(){

    if(!contratoSelecao){
        avisoContrato("Escolha uma das opções antes de avançar.", "erro");
        return;
    }

    ocupadoContrato(true, "Selecionando...");

    try{

        // Trocar de oferta limpa a confirmação, então a nova escolha é
        // registrada; voltar e avançar com a mesma oferta não reenvia.
        if(!contratoSelecaoConfirmada){

            await chamarOpenCredit(
                "/simulate/" + encodeURIComponent(contratoSelecao.simulationId) + "/select",
                {
                    metodo:"POST",
                    corpo:{offerId: contratoSelecao.offerId}
                }
            );

            contratoSelecaoConfirmada = true;

        }

        avisoContrato("");
        mostrarEtapaContrato(2);

        await carregarCadastroContrato();

    }catch(erro){

        avisoContrato("Não foi possível selecionar a oferta: " + erro.message, "erro");

        console.error("Falha ao selecionar a oferta:", erro);

    }finally{

        ocupadoContrato(false);

    }

}


// ===============================
// ETAPA 2 — CADASTRO
// ===============================

async function carregarCadastroContrato(){

    const painel = document.getElementById("etapaContrato2");

    painel.innerHTML = '<div class="carregandoContrato">Carregando cadastro...</div>';

    ocupadoContrato(true, "Carregando...");

    try{

        const cpf = normalizarCpf(contratoCliente.cpf);

        // As duas chamadas são independentes: vão juntas.
        const [dados, validacao] = await Promise.all([
            chamarOpenCredit("/clients?cpf=" + encodeURIComponent(cpf)),
            chamarOpenCredit("/clients/validate?cpf=" + encodeURIComponent(cpf) + "&stage=propose")
        ]);

        contratoDadosCliente = dados || {};
        contratoValidacao = validacao || {};

        renderizarCadastroContrato();

    }catch(erro){

        painel.innerHTML = '<div class="erroContrato">' + escaparHtml(erro.message) + "</div>";

        console.error("Falha ao carregar o cadastro:", erro);

    }finally{

        ocupadoContrato(false);

    }

}


// Restrições e pendências vão no cabeçalho do formulário, que é onde o
// operador olha antes de mexer nos campos.
function cabecalhoCadastroContrato(){

    const validacao = contratoValidacao || {};

    const barreiras = (contratoDadosCliente && contratoDadosCliente.barriers) || [];

    const avisos = [];

    if(validacao.reason) avisos.push(String(validacao.reason));

    barreiras.forEach(barreira=>{

        const texto = typeof barreira === "string"
            ? barreira
            : String((barreira && (barreira.message || barreira.reason)) || "");

        if(texto.trim()) avisos.push(texto);

    });

    const pendentes = (validacao.pendingFields || []).length;

    if(pendentes){
        avisos.push(
            pendentes + (pendentes === 1
                ? " campo obrigatório está em branco no cadastro."
                : " campos obrigatórios estão em branco no cadastro.")
        );
    }

    if(validacao.valid && !avisos.length){
        return '<div class="cabecalhoCadastro cadastroOk">✓ Cadastro validado pela API.</div>';
    }

    return '<div class="cabecalhoCadastro cadastroPendente">' +
        "<strong>⚠️ Restrições no cadastro</strong><ul>" +
        avisos.map(texto => "<li>" + escaparHtml(texto) + "</li>").join("") +
        "</ul></div>";

}


// Só os campos com restrição entram no formulário: o resto do cadastro já está
// na API e não é o que trava o contrato.
function renderizarCadastroContrato(){

    const painel = document.getElementById("etapaContrato2");

    const cliente = (contratoDadosCliente && contratoDadosCliente.client) || null;

    if(!cliente){

        painel.innerHTML = cabecalhoCadastroContrato() +
            '<div class="erroContrato">A API não tem cadastro para este CPF.</div>';

        return;

    }

    const pendentes = (contratoValidacao && contratoValidacao.pendingFields) || [];

    const formularioPendentes = pendentes.length
        ? '<div class="pendentesContrato"><h6>Campos a completar</h6>' +
          '<p class="notaPendentes">Ao avançar, estes campos são gravados no cadastro ' +
          "(PATCH /clients) e a API revalida antes de liberar a próxima etapa.</p>" +
          pendentes.map((campo, indice) =>
              '<label class="campoPendente"><span>' + escaparHtml(campo.label) + "</span>" +
              '<input type="text" id="pendente' + indice + '" ' +
              'oninput="validarCadastroContrato()" autocomplete="off"></label>'
          ).join("") +
          "</div>"
        : '<div class="semPendencias">Nada a completar neste cadastro.</div>';

    painel.innerHTML = cabecalhoCadastroContrato() + formularioPendentes;

    validarCadastroContrato();

}


// Os regex vêm da API e são literais: `^\d{5,14}$` recusa o RG com pontuação,
// `^(AC|AL|...)$` recusa "mg" em minúscula. Sem normalizar, o operador digita
// o valor certo, o botão não libera e nada explica o motivo.
function normalizarCampoPendente(campo, valor){

    const texto = String(valor || "").trim();
    const regex = String(campo.regex || "");

    // Tirando \d, quantificadores e âncoras, sobra o que o padrão exige de
    // literal. Vazio = só dígitos, então a máscara digitada pode cair fora.
    // A data (`^\d{2}/\d{2}/\d{4}$`) deixa "//" e não entra aqui.
    const esqueleto = regex
        .replace(/\\d/g, "")
        .replace(/\{\d+(,\d+)?\}/g, "")
        .replace(/[\^\$]/g, "");

    if(/\\d/.test(regex) && esqueleto === ""){
        return somenteNumeros(texto);
    }

    // Padrão sem faixa minúscula (a lista de UFs) exige maiúsculas.
    if(!/a-z/.test(regex) && /[A-Z]/.test(regex)){
        return texto.toUpperCase();
    }

    return texto;

}


// A etapa 2 só libera com todos os pendentes batendo o regex que a própria
// API mandou junto do campo — depois de normalizados.
function validarCadastroContrato(){

    const pendentes = (contratoValidacao && contratoValidacao.pendingFields) || [];

    const invalidos = [];

    pendentes.forEach((campo, indice)=>{

        const entrada = document.getElementById("pendente" + indice);

        if(!entrada) return;

        const valor = normalizarCampoPendente(campo, entrada.value);

        let valido = valor !== "";

        if(valido && campo.regex){

            try{
                valido = new RegExp(campo.regex).test(valor);
            }catch(erro){
                // Regex que o navegador não aceita não pode barrar o operador.
                valido = true;
            }

        }

        // Campo em branco ainda não é erro: só o preenchido errado fica vermelho.
        entrada.classList.toggle("invalido", !valido && valor !== "");

        if(!valido) invalidos.push(campo);

    });

    return invalidos;

}


function rotuloCampoPendente(campo){

    return ROTULOS_CLIENTE[campo.field] || campo.label || campo.field;

}


// Avançar grava o que o operador preencheu e devolve a palavra final para a
// API: só passa para a etapa 3 se ela parar de apontar pendências.
async function confirmarCadastroContrato(){

    const invalidos = validarCadastroContrato();

    if(invalidos.length){

        avisoContrato(
            (invalidos.length === 1 ? "Confira o campo: " : "Confira os campos: ") +
            invalidos.map(rotuloCampoPendente).join(" · "),
            "erro"
        );

        return;

    }

    const pendentes = (contratoValidacao && contratoValidacao.pendingFields) || [];

    const alteracoes = {};

    pendentes.forEach((campo, indice)=>{

        const entrada = document.getElementById("pendente" + indice);

        // Vai gravado o mesmo valor que passou na validação — normalizado —,
        // não o que está na tela: a API aplica o mesmo regex do outro lado.
        const valor = entrada
            ? normalizarCampoPendente(campo, entrada.value)
            : "";

        // `field` já vem no nome que o PATCH aceita (rg, orgao_emissor...).
        if(valor) alteracoes[campo.field] = valor;

    });

    ocupadoContrato(true, "Salvando...");

    try{

        const cpf = normalizarCpf(contratoCliente.cpf);

        if(Object.keys(alteracoes).length){

            await chamarOpenCredit("/clients/" + encodeURIComponent(cpf),{
                metodo:"PATCH",
                corpo: alteracoes
            });

        }

        contratoValidacao = await chamarOpenCredit(
            "/clients/validate?cpf=" + encodeURIComponent(cpf) + "&stage=propose"
        ) || {};

        if(((contratoValidacao.pendingFields || []).length)){

            // A API ainda reclama: volta o formulário com o que sobrou.
            renderizarCadastroContrato();

            avisoContrato("O cadastro ainda tem campos pendentes.", "erro");

            return;

        }

        // A etapa 3 lê as contas do cadastro, que acabou de ser atualizado.
        contratoDadosCliente = await chamarOpenCredit(
            "/clients?cpf=" + encodeURIComponent(cpf)
        ) || {};

        avisoContrato("");

        mostrarEtapaContrato(3);

        renderizarContaContrato();

    }catch(erro){

        avisoContrato("Não foi possível atualizar o cadastro: " + erro.message, "erro");

        console.error("Falha ao atualizar o cadastro:", erro);

    }finally{

        ocupadoContrato(false);

    }

}


// ===============================
// ETAPA 3 — CONTA BANCÁRIA
// ===============================

// A conta é cadastrada antes da proposta, em POST /clients/:cpf/bank-accounts,
// e é o id devolvido por ela que vai como bankAccountId.
// Obrigatórios segundo a própria API: banco, conta e tipoConta.
const CAMPOS_CONTA = [
    {chave:"banco", rotulo:"Banco", dica:"Itaú", obrigatorio:true},
    {chave:"agencia", rotulo:"Agência", dica:"1234"},
    {chave:"conta", rotulo:"Conta", dica:"56789", obrigatorio:true},
    {chave:"contaDigito", rotulo:"Dígito", dica:"0"},
    {chave:"apelido", rotulo:"Apelido", dica:"Conta principal"}
];

const TIPOS_CONTA = [
    {valor:"CC", rotulo:"Corrente"},
    {valor:"CP", rotulo:"Poupança"}
];

const TIPOS_OPERACAO = [
    {valor:"Pix", rotulo:"Pix"},
    {valor:"Ted", rotulo:"TED"},
    {valor:"TitularidadeEmpregador", rotulo:"Titularidade do empregador"}
];

// Guarda o id da conta recém-criada: se o POST /proposals falhar e o operador
// tentar de novo, a conta não é cadastrada duas vezes.
let contratoContaCriada = "";


function renderizarContaContrato(){

    const painel = document.getElementById("etapaContrato3");

    const cliente = (contratoDadosCliente && contratoDadosCliente.client) || {};
    const contas = Array.isArray(cliente.bankAccounts) ? cliente.bankAccounts : [];

    contratoContaCriada = "";

    // O resumo da parcela é fixo no topo do modal e não se repete aqui.
    // Não existe GET desta rota: as contas vêm do próprio cadastro do cliente.
    const listaContas = contas.length
        ? '<div class="blocoOpcao"><h6>Conta cadastrada</h6>' +
          contas.map((conta, indice)=>{

              const rotulo = [
                  conta.banco || conta.bankName || conta.bankCode,
                  conta.agencia || conta.agency,
                  conta.conta || conta.account
              ].filter(Boolean).map(escaparHtml).join(" · ");

              return '<label class="ofertaContrato">' +
                  '<input type="radio" name="contaContrato" value="' +
                  escaparHtml(conta.id || conta.bankAccountId || "") + '" ' +
                  (indice === 0 ? "checked " : "") +
                  'onchange="alternarFormularioConta()"> ' +
                  '<span class="ofertaTexto">' + (rotulo || "Conta cadastrada") + "</span></label>";

          }).join("") +
          '<label class="ofertaContrato">' +
          '<input type="radio" name="contaContrato" value="" onchange="alternarFormularioConta()"> ' +
          '<span class="ofertaTexto">Cadastrar outra conta</span></label>' +
          "</div>"
        : "";

    const selecao = (id, opcoes) =>
        '<select id="conta_' + id + '">' +
        opcoes.map(opcao =>
            '<option value="' + escaparHtml(opcao.valor) + '">' +
            escaparHtml(opcao.rotulo) + "</option>"
        ).join("") +
        "</select>";

    const formularioConta =
        '<div class="blocoOpcao" id="formularioConta">' +
        "<h6>Conta para recebimento</h6>" +
        '<p class="notaPendentes">A conta é cadastrada no cliente antes de a ' +
        "proposta ser criada.</p>" +
        '<div class="gradeConta">' +
        CAMPOS_CONTA.map(campo =>
            '<label class="campoPendente"><span>' + escaparHtml(campo.rotulo) +
            (campo.obrigatorio ? " *" : "") + "</span>" +
            '<input type="text" id="conta_' + campo.chave + '" placeholder="' +
            escaparHtml(campo.dica) + '" autocomplete="off"></label>'
        ).join("") +
        '<label class="campoPendente"><span>Tipo de conta *</span>' +
        selecao("tipoConta", TIPOS_CONTA) + "</label>" +
        '<label class="campoPendente"><span>Tipo de operação</span>' +
        selecao("operationType", TIPOS_OPERACAO) + "</label>" +
        "</div></div>";

    painel.innerHTML = listaContas + formularioConta;

    alternarFormularioConta();

}


// Avançar da etapa 3 cadastra a conta (quando é nova) e guarda o id que a
// proposta vai usar. A conta precisa existir antes do POST /proposals.
async function confirmarContaContrato(){

    const conta = contaEscolhidaContrato();

    if(!conta){
        avisoContrato("Informe banco e conta para continuar.", "erro");
        return;
    }

    if(conta.bankAccountId){

        contratoContaId = conta.bankAccountId;
        contratoContaDados = conta.dados || null;

        avisoContrato("");
        mostrarEtapaContrato(4);
        renderizarResumoContrato();

        return;

    }

    ocupadoContrato(true, "Cadastrando conta...");

    try{

        const cpf = normalizarCpf(contratoCliente.cpf);

        // Se uma tentativa anterior já criou a conta, o id guardado evita
        // cadastrar a mesma conta duas vezes no cliente.
        if(!contratoContaCriada){

            const criada = await chamarOpenCredit(
                "/clients/" + encodeURIComponent(cpf) + "/bank-accounts",
                {
                    metodo:"POST",
                    corpo: conta.nova
                }
            );

            contratoContaCriada = idDaContaCriada(criada);

            if(!contratoContaCriada){
                throw new Error(
                    "A conta foi cadastrada, mas a API não devolveu o " +
                    "identificador dela — a proposta não pode seguir."
                );
            }

        }

        contratoContaId = contratoContaCriada;
        contratoContaDados = conta.nova;

        avisoContrato("");
        mostrarEtapaContrato(4);
        renderizarResumoContrato();

    }catch(erro){

        avisoContrato("Não foi possível cadastrar a conta: " + erro.message, "erro");

        console.error("Falha ao cadastrar a conta bancária:", erro);

    }finally{

        ocupadoContrato(false);

    }

}


// A criação da conta nunca pôde ser executada em teste (grava conta real num
// cliente real), então o nome do campo do id não está confirmado.
function idDaContaCriada(retorno){

    if(!retorno || typeof retorno !== "object") return "";

    const interno = retorno.bankAccount || retorno.conta || retorno;

    return interno.id || interno.bankAccountId || retorno.id || "";

}


// ===============================
// ETAPA 4 — RESUMO E CONTRATO
// ===============================

function textoTipoConta(valor){

    const tipo = TIPOS_CONTA.find(t => t.valor === valor);

    return tipo ? tipo.rotulo : (valor || "");

}


function descricaoContaContrato(){

    const conta = contratoContaDados || {};

    const banco = conta.banco || conta.bankName || conta.bankCode || "";
    const agencia = conta.agencia || conta.agency || "";
    const numero = conta.conta || conta.account || "";
    const digito = conta.contaDigito || conta.digito || "";

    const partes = [];

    if(banco) partes.push(banco);
    if(agencia) partes.push("Ag. " + agencia);
    if(numero) partes.push("Conta " + numero + (digito ? "-" + digito : ""));

    const tipo = textoTipoConta(conta.tipoConta);
    const operacao = conta.operationType;

    const complemento = [tipo, operacao].filter(Boolean).join(", ");

    return partes.join(" · ") + (complemento ? " (" + complemento + ")" : "");

}


// Mensagem de confirmação para o cliente. Depois de gerar o contrato ela é
// reescrita com o link de assinatura.
function mensagemResumoContrato(){

    const primeiroNome = String(contratoCliente.nome || "").trim().split(/\s+/)[0];

    let texto = "Oi, " + primeiroNome + "! Fechamos as condições da sua proposta 😊\n\n" +
        "💰 Valor liberado: R$ " + contratoSelecao.liberado + "\n" +
        "📅 Parcelas: " + contratoSelecao.prazo + "x de R$ " + contratoSelecao.parcela + "\n";

    const conta = descricaoContaContrato();

    if(conta) texto += "🏦 Recebimento: " + conta + "\n";

    if(contratoProposta && contratoProposta.signUrl){

        texto += "\n✍️ Seu contrato já está pronto para assinatura. " +
            "É só acessar o link e seguir as instruções:\n" +
            contratoProposta.signUrl;

    }else{

        texto += "\nConfirma se está tudo certo para eu seguir com a assinatura?";

    }

    return texto;

}


function renderizarResumoContrato(){

    const painel = document.getElementById("etapaContrato4");

    const cliente = (contratoDadosCliente && contratoDadosCliente.client) || {};

    const linha = (rotulo, valor) =>
        '<div class="linhaResumo"><span>' + escaparHtml(rotulo) + "</span><strong>" +
        escaparHtml(valor) + "</strong></div>";

    const pendencias = ((contratoValidacao || {}).pendingFields || []).length;

    painel.innerHTML =

        '<div class="blocoOpcao"><h6>Resumo</h6>' +
        linha("Cliente", cliente.nome || contratoCliente.nome) +
        linha("CPF", contratoCliente.cpf) +
        (contratoSelecao.banco ? linha("Banco", contratoSelecao.banco) : "") +
        linha("Parcela", contratoSelecao.prazo + "x de R$ " + contratoSelecao.parcela) +
        linha("Valor liberado", "R$ " + contratoSelecao.liberado) +
        linha("Cadastro", pendencias ? pendencias + " campo(s) pendente(s)" : "Validado") +
        linha("Conta de recebimento", descricaoContaContrato() || "—") +
        "</div>" +

        '<div class="blocoOpcao"><h6>Propostas deste CPF</h6>' +
        '<button type="button" class="btnLinha btnLinhaCopiar" ' +
        'onclick="consultarPropostasContrato()">' +
        '<i class="bi bi-search"></i> Consultar proposta</button>' +
        '<div id="listaPropostas"></div>' +
        "</div>" +

        '<div class="blocoOpcao"><h6>Mensagem para o cliente</h6>' +
        '<textarea id="mensagemContrato" class="form-control campoProposta" rows="9">' +
        "</textarea>" +
        "</div>";

    document.getElementById("mensagemContrato").value = mensagemResumoContrato();

}


// Com uma conta cadastrada marcada, o formulário some — ele só serve para
// cadastrar uma nova.
function alternarFormularioConta(){

    const formulario = document.getElementById("formularioConta");

    if(!formulario) return;

    const marcada = document.querySelector('input[name="contaContrato"]:checked');

    formulario.style.display = (marcada && marcada.value) ? "none" : "block";

    avisoContrato("");

}


// Devolve {bankAccountId} para conta já cadastrada, {nova:{...}} para
// cadastrar, ou null se faltar campo obrigatório.
function contaEscolhidaContrato(){

    const marcada = document.querySelector('input[name="contaContrato"]:checked');

    if(marcada && marcada.value){

        const cliente = (contratoDadosCliente && contratoDadosCliente.client) || {};
        const contas = Array.isArray(cliente.bankAccounts) ? cliente.bankAccounts : [];

        return {
            bankAccountId: marcada.value,
            // Guardado só para descrever a conta no resumo da etapa 4.
            dados: contas.find(c =>
                String(c.id || c.bankAccountId || "") === marcada.value
            ) || null
        };

    }

    const nova = {};

    let faltando = false;

    CAMPOS_CONTA.forEach(campo=>{

        const entrada = document.getElementById("conta_" + campo.chave);
        const valor = entrada ? entrada.value.trim() : "";

        if(!valor){

            if(campo.obrigatorio) faltando = true;

            // Campo vazio não vai no corpo: deixa o opcional realmente opcional.
            return;

        }

        nova[campo.chave] = valor;

    });

    const tipo = document.getElementById("conta_tipoConta");
    const operacao = document.getElementById("conta_operationType");

    nova.tipoConta = tipo ? tipo.value : "CC";
    nova.operationType = operacao ? operacao.value : "Pix";

    return faltando ? null : {nova: nova};

}


// ===============================
// CONSULTA DE PROPOSTAS
// GET /proposals?cpf= devolve {items:[...], meta:{total,page,limit}}.
// Os campos são listados por Object.keys: nada do item fica de fora, mesmo
// que a API passe a devolver algo que este código não conhece.
// ===============================

const ROTULOS_PROPOSTA = {
    id:"ID interno",
    cpf:"CPF",
    bankId:"Banco (código)",
    bankName:"Banco",
    bankProposalId:"ID no banco",
    bankProposalNo:"Nº da proposta",
    status:"Situação",
    statusOriginal:"Situação (original)",
    statusDescricao:"Descrição",
    signUrl:"Link de assinatura",
    partnerId:"Parceiro",
    createdAt:"Criada em",
    updatedAt:"Atualizada em"
};


function valorPropostaHtml(chave, valor){

    if(valor === null || valor === undefined || valor === "") return "—";

    if(typeof valor === "object"){
        return escaparHtml(JSON.stringify(valor));
    }

    const texto = String(valor);

    // Link ganha um copiar encostado à direita, para quem só quer a URL.
    if(/^https?:\/\//i.test(texto)){

        return '<span class="linhaLink">' +
            '<a href="' + escaparHtml(texto) + '" target="_blank" rel="noopener">' +
            escaparHtml(texto) + "</a>" +
            '<button type="button" class="btnCopiar" title="Copiar link" ' +
            "onclick=\"copiarLinkProposta('" + escaparArgumento(texto) + "')\">" +
            '<i class="bi bi-clipboard"></i></button>' +
            "</span>";

    }

    // Datas ISO nas chaves de tempo viram o formato do operador.
    if(/(At|Utc|Em)$/.test(chave) && /^\d{4}-\d{2}-\d{2}T/.test(texto)){
        return escaparHtml(formatarDataHora(texto));
    }

    if(chave === "cpf") return escaparHtml(formatarCPF(texto));

    return escaparHtml(texto);

}


function buscarPropostas(cpf){

    return chamarOpenCredit("/proposals?cpf=" + encodeURIComponent(normalizarCpf(cpf)))
        .then(dados => (dados && dados.items) || []);

}


// Busca e desenha numa caixa qualquer. Serve à etapa 4 do assistente e ao
// modal aberto direto do Painel.
async function carregarPropostasEm(caixa, cliente){

    if(!caixa || !cliente) return;

    caixa.innerHTML = '<div class="carregandoContrato">Consultando propostas...</div>';

    let itens;

    // O try cobre só a chamada: se ele envolvesse também a renderização, um
    // erro ao desenhar apagaria a lista e apareceria como falha da API.
    try{

        itens = await buscarPropostas(cliente.cpf);

    }catch(erro){

        caixa.innerHTML = '<div class="erroContrato">' + escaparHtml(erro.message) + "</div>";

        console.error("Falha ao consultar propostas:", erro);

        return;

    }

    renderizarListaPropostas(caixa, itens, cliente);

    notificar(
        itens.length + (itens.length === 1
            ? " proposta encontrada."
            : " propostas encontradas."),
        "sucesso"
    );

}


function consultarPropostasContrato(){

    return carregarPropostasEm(
        document.getElementById("listaPropostas"),
        contratoCliente
    );

}


// Uma só forma de mostrar proposta na tela: serve à consulta, ao retorno do
// POST que acabou de criar o contrato e ao modal do Painel.
// `recemCriada` só muda o destaque.
function renderizarListaPropostas(caixa, itens, cliente, recemCriada){

    if(!caixa) return;

    if(!itens.length){

        caixa.innerHTML =
            '<div class="semPendencias">Nenhuma proposta encontrada para este CPF.</div>';

        return;

    }

    caixa.innerHTML = itens.map((item, indice)=>

        '<div class="propostaConsultada' + (recemCriada ? " recemCriada" : "") + '"><h6>' +
        (recemCriada
            ? "✓ Contrato gerado"
            : "Proposta " + (indice + 1) + " de " + itens.length) +
        "</h6>" +

        Object.keys(item).map(chave =>
            '<div class="linhaResumo"><span>' +
            escaparHtml(ROTULOS_PROPOSTA[chave] || chave) + "</span><strong>" +
            valorPropostaHtml(chave, item[chave]) + "</strong></div>"
        ).join("") +

        // Sem signUrl não há o que mandar: a proposta ainda não gerou
        // link de assinatura.
        // cliente.id é somenteNumeros(cpf): vai cru, como nos cards.
        (item.signUrl
            ? '<div class="acoesProposta">' +
              '<button type="button" class="btnLinha btnLinhaZap" ' +
              "onclick=\"enviarLinkPropostaWhatsApp('" + escaparArgumento(item.signUrl) +
              "','" + cliente.id + "')\">" +
              '<i class="bi bi-whatsapp"></i> Enviar link ao cliente</button>' +
              '<button type="button" class="btnLinha btnLinhaCopiar" ' +
              "onclick=\"copiarMensagemProposta('" + escaparArgumento(item.signUrl) +
              "','" + cliente.id + "')\">" +
              '<i class="bi bi-clipboard"></i> Copiar mensagem</button>' +
              "</div>"
            : "") +

        "</div>"

    ).join("");

}


// Texto que acompanha o link de assinatura. Sem número de proposta nem id:
// isso é controle interno e não diz nada ao cliente.
function mensagemLinkProposta(link, nome){

    return "Oi, " + String(nome || "").trim().split(/\s+/)[0] +
        "! Seu contrato está pronto para assinatura 😊\n\n" +
        "É só acessar o link abaixo e seguir as instruções:\n" + link + "\n\n" +
        "Qualquer dúvida, é só me chamar por aqui.";

}


// O id vem no próprio botão: assim a lista funciona igual dentro do assistente
// e no modal do Painel, sem depender de qual cliente está "atual".
function enviarLinkPropostaWhatsApp(link, id){

    if(!link) return notificar("Esta proposta não tem link de assinatura.", "erro");

    const cliente = clientes.find(c => String(c.id) === String(id)) || contratoCliente;

    if(!cliente) return notificar("Cliente não encontrado.", "erro");

    abrirWhatsappComTexto(
        cliente.telefone,
        mensagemLinkProposta(link, cliente.nome)
    );

}


// ===============================
// MODAL DE PROPOSTAS (Painel)
// Consulta direta do card ou da tabela, sem passar pelo assistente.
// ===============================

async function abrirPropostasCliente(id){

    const cliente = clientes.find(c => String(c.id) === String(id));

    if(!cliente) return notificar("Cliente não encontrado.", "erro");

    document.getElementById("clientePropostas").textContent =
        cliente.nome + " · " + cliente.cpf;

    bootstrap.Modal
        .getOrCreateInstance(document.getElementById("modalPropostas"))
        .show();

    await carregarPropostasEm(
        document.getElementById("listaPropostasCliente"),
        cliente
    );

}


// O botão ao lado do link copia só a URL.
async function copiarLinkProposta(link){

    if(!link) return notificar("Esta proposta não tem link de assinatura.", "erro");

    await copiarParaAreaDeTransferencia(link);

    notificar("Link de assinatura copiado!", "sucesso");

}


// O botão de ação copia exatamente o que o WhatsApp enviaria — mesma função
// de texto, para o cliente receber a mesma coisa pelos dois caminhos.
async function copiarMensagemProposta(link, id){

    if(!link) return notificar("Esta proposta não tem link de assinatura.", "erro");

    const cliente = clientes.find(c => String(c.id) === String(id)) || contratoCliente;

    if(!cliente) return notificar("Cliente não encontrado.", "erro");

    await copiarParaAreaDeTransferencia(mensagemLinkProposta(link, cliente.nome));

    notificar("Mensagem copiada!", "sucesso");

}


// A conta já foi cadastrada na etapa 3: aqui só entra a criação da proposta.
async function gerarContrato(){

    if(!contratoContaId){
        avisoContrato("Volte à etapa 3 e confirme a conta de recebimento.", "erro");
        return;
    }

    if(!contratoSelecao || !contratoSelecaoConfirmada){
        avisoContrato("Volte à etapa 1 e selecione a oferta novamente.", "erro");
        return;
    }

    if(!confirm(
        "Gerar o contrato de " + contratoSelecao.prazo + "x de R$ " +
        contratoSelecao.parcela + " para " + contratoCliente.nome + "?\n\n" +
        "A proposta será criada no banco — não dá para desfazer por aqui."
    )){
        return;
    }

    ocupadoContrato(true, "Gerando...");

    try{

        // A oferta já foi fixada pelo /select na etapa 1: por isso o corpo
        // leva simulationId e conta, sem offerId.
        contratoProposta = await chamarOpenCredit("/proposals",{
            metodo:"POST",
            corpo:{
                simulationId: contratoSelecao.simulationId,
                bankAccountId: contratoContaId
            }
        });

        // A lista guardada virou contrato: não pode ser reaproveitada.
        esquecerSimulacao(contratoCliente.cpf);

        // A mensagem passa a levar o link de assinatura.
        const campo = document.getElementById("mensagemContrato");

        if(campo) campo.value = mensagemResumoContrato();

        // Mesmo formato da consulta, com os botões de enviar e copiar o link.
        renderizarListaPropostas(
            document.getElementById("listaPropostas"),
            [contratoProposta],
            contratoCliente,
            true
        );

        // Sem o link não há o que enviar: busca o registro completo na API.
        if(!contratoProposta.signUrl) await consultarPropostasContrato();

        // Com a proposta criada não há mais o que avançar; o link vai ao
        // cliente pelo botão da lista, quando o operador quiser.
        const avancar = document.getElementById("btnAvancarContrato");

        if(avancar) avancar.style.display = "none";

        avisoContrato(
            '✓ Contrato gerado. Use "Enviar link ao cliente" na lista abaixo.',
            "info"
        );

    }catch(erro){

        avisoContrato("Não foi possível gerar o contrato: " + erro.message, "erro");

        console.error("Falha ao criar a proposta:", erro);

    }finally{

        ocupadoContrato(false);

    }

}


