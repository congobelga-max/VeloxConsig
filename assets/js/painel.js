// ===============================
// PAINEL — CLIENTES COM OFERTA
// Tabela sobre /clientes: entram apenas os registros com oferta e com celular.
// Depende de api.js (transporte) e de app.js (helpers, WhatsApp, proposta).
// ===============================

let painelClientes = [];

let tabelaPainel = null;
let tabelaPainelIniciada = false;

// hoje | ontem | data | todos
let filtroDataPainel = "hoje";

// Filtro independente do de data: esconde quem já recebeu o primeiro contato.
let somenteNaoContatados = false;

// AAAA-MM-DD, no formato que o <input type="date"> devolve.
let dataEscolhidaPainel = "";

// tabela | cards
let visaoPainel = "tabela";


// ===============================
// OFERTAS
// O nome do campo ainda não foi confirmado no retorno de /clientes, então as
// grafias prováveis são aceitas. Sem nenhuma delas o cliente conta zero oferta
// e fica de fora — é exatamente o filtro pedido, e não um palpite pela margem.
// Ao confirmar o contrato, reduzir a lista ao nome real.
// ===============================

const CAMPOS_OFERTAS = [
    "ofertas",
    "qtdOfertas",
    "quantidadeOfertas",
    "totalOfertas",
    "ofertasDisponiveis",
    "offers"
];


function quantidadeOfertas(registro){

    for(const campo of CAMPOS_OFERTAS){

        const valor = registro[campo];

        if(valor === undefined || valor === null || valor === "") continue;

        // O campo pode vir como contagem ou como a própria lista de ofertas.
        if(Array.isArray(valor)) return valor.length;

        const numero = Number(valor);

        if(!isNaN(numero)) return numero;

    }

    return 0;

}


// ===============================
// MAPEAMENTO API -> PAINEL
// ===============================

function mapearClientePainel(registro){

    registro = registro || {};

    const idLocal = normalizarCpf(registro.cpf || "");
    const celular = formatarTelefone(registro.celular);

    return {

        idApi: registro.id,

        // Chave local: indexa o histórico do operador no localStorage.
        id: idLocal,

        nome: String(registro.nome || "").trim(),
        cpf: formatarCPF(registro.cpf || ""),
        celular: celular,

        // O modal de proposta e o WhatsApp leem `telefone` (modelo do Painel).
        telefone: celular,

        ofertas: quantidadeOfertas(registro),

        criadoEm: registro.createdAtUtc || registro.criadoEm || "",

        // Preenchido por atualizarContatosPainel(): o primeiro contato é local
        // e muda enquanto a lista está na tela.
        contatado: false,
        contatoData: "",
        contatoHora: ""

    };

}


// Regra de entrada no Painel: oferta disponível, celular discável e CPF
// (sem CPF não há chave local para o histórico do operador).
function clienteDoPainel(cliente){

    const digitos = somenteNumeros(cliente.celular);

    return cliente.ofertas > 0 &&
        digitos.length >= 10 &&
        !!cliente.id;

}


// ===============================
// FILTRO POR DIA
// A comparação é feita por dia no fuso do operador: createdAtUtc vem em UTC
// e o <input type="date"> devolve o dia local — converter os dois para a mesma
// chave AAAA-MM-DD é o que impede o registro da madrugada de cair no dia errado.
// ===============================

function chaveDoDia(data){

    return data.getFullYear() + "-" +
        String(data.getMonth() + 1).padStart(2,"0") + "-" +
        String(data.getDate()).padStart(2,"0");

}


function diaDoCliente(cliente){

    if(!cliente.criadoEm) return "";

    const data = new Date(cliente.criadoEm);

    return isNaN(data.getTime()) ? "" : chaveDoDia(data);

}


function diaAlvoPainel(){

    if(filtroDataPainel === "hoje"){
        return chaveDoDia(new Date());
    }

    if(filtroDataPainel === "ontem"){

        const ontem = new Date();

        ontem.setDate(ontem.getDate() - 1);

        return chaveDoDia(ontem);

    }

    if(filtroDataPainel === "data"){
        return dataEscolhidaPainel;
    }

    // "todos": sem dia alvo.
    return "";

}


// ===============================
// PRIMEIRO CONTATO
// `contato_inicial_<cpf>` é gravado por abrirWhatsapp() e é local: a lista
// precisa relê-lo antes de cada desenho, senão o lead que acabou de ser
// abordado continua aparecendo como não contatado.
// ===============================

function atualizarContatosPainel(){

    painelClientes.forEach(cliente=>{

        cliente.contatado =
            localStorage.getItem("contato_inicial_" + cliente.id) === "sim";

        cliente.contatoData = cliente.contatado
            ? (localStorage.getItem("contato_data_" + cliente.id) || "")
            : "";

        cliente.contatoHora = cliente.contatado
            ? (localStorage.getItem("contato_hora_" + cliente.id) || "")
            : "";

    });

}


function textoContatoPainel(cliente){

    if(!cliente.contatado) return "Não contatado";

    const quando = [cliente.contatoData, cliente.contatoHora]
        .filter(Boolean)
        .join(" ");

    return quando ? "Contatado em " + quando : "Contatado";

}


function clientesFiltradosPainel(){

    const alvo = diaAlvoPainel();

    return painelClientes.filter(cliente=>{

        if(alvo && diaDoCliente(cliente) !== alvo) return false;

        if(somenteNaoContatados && cliente.contatado) return false;

        return true;

    });

}


// new Date("2026-07-30") seria lido como UTC e poderia voltar o dia anterior:
// a chave é formatada a partir do próprio texto.
function formatarDiaBR(chave){

    const partes = String(chave || "").split("-");

    return partes.length === 3
        ? partes[2] + "/" + partes[1] + "/" + partes[0]
        : "";

}


function rotuloFiltroPainel(){

    if(filtroDataPainel === "hoje") return "Hoje";
    if(filtroDataPainel === "ontem") return "Ontem";
    if(filtroDataPainel === "data") return formatarDiaBR(dataEscolhidaPainel);

    return "Todos";

}


// ===============================
// TABELA
// Nome e data de criação ficam visíveis; celular, CPF, ofertas, status e ações
// vão para o detalhe da linha via className "none" — o Responsive nunca sobe
// uma coluna dessas para a grade, em nenhuma largura de tela.
// ===============================

// ===============================
// PEDAÇOS COMPARTILHADOS
// A tabela e os cards mostram os mesmos dados: os trechos abaixo são montados
// uma vez só para as duas visões não descolarem uma da outra.
// ===============================

// O valor e o botão de copiar ficam nas pontas opostas da linha (.linhaCampo),
// tanto no detalhe da tabela quanto no card.
// `rotulo` é literal ("CPF"/"Telefone") e vira o texto do aviso de copiarTexto(),
// que é quem repõe o zero à esquerda do CPF na cópia.
function valorComCopia(valor, rotulo){

    return '<span class="linhaCampo">' +
        '<span class="valorCopiavelPainel">' + escaparHtml(valor) + "</span>" +
        '<button type="button" class="btnCopiar" title="Copiar ' + rotulo.toLowerCase() + '" ' +
        "onclick=\"copiarTexto('" + escaparArgumento(valor) + "','" + rotulo + "')\">" +
        '<i class="bi bi-clipboard"></i></button>' +
        "</span>";

}


// cliente.id é somenteNumeros(cpf) e só entra na lista com valor: pode ir cru.
// Nome e celular passam pelos escapes.
function botoesAcao(cliente){

    return '<button type="button" class="btnLinha btnLinhaZap" ' +
        "onclick=\"contatarPainel('" + somenteNumeros(cliente.celular) + "','" +
        escaparArgumento(cliente.nome) + "','" + cliente.id + "','whatsapp')\">" +
        '<i class="bi bi-whatsapp"></i> WhatsApp</button>' +
        '<button type="button" class="btnLinha btnLinhaTelegram" ' +
        "onclick=\"contatarPainel('" + somenteNumeros(cliente.celular) + "','" +
        escaparArgumento(cliente.nome) + "','" + cliente.id + "','telegram')\">" +
        '<i class="bi bi-telegram"></i> Telegram</button>' +
        '<button type="button" class="btnLinha btnLinhaProposta" ' +
        "onclick=\"montarProposta('" + cliente.id + "')\">" +
        "✨ Montar proposta</button>" +
        '<button type="button" class="btnLinha btnLinhaContrato" ' +
        "onclick=\"abrirModalContrato('" + cliente.id + "')\">" +
        "📄 Gerar contrato</button>" +
        '<button type="button" class="btnLinha btnLinhaCopiar" ' +
        "onclick=\"abrirPropostasCliente('" + cliente.id + "')\">" +
        '<i class="bi bi-search"></i> Consultar proposta</button>';

}


function iniciarTabelaPainel(){

    if(tabelaPainelIniciada) return;

    tabelaPainel = new DataTable("#tabelaPainel",{

        data: clientesFiltradosPainel(),

        columns:[
            {
                title:"",
                data:null,
                orderable:false,
                searchable:false,
                className:"dtr-control",
                defaultContent:""
            },
            {
                title:"Nome",
                data:"nome",
                responsivePriority:1,
                render: valor => escaparHtml(valor)
            },
            {
                title:"Contato",
                data:"contatado",
                responsivePriority:2,
                render: (valor, tipo, cliente) =>
                    tipo === "display"
                        ? '<span class="seloContato ' +
                          (valor ? "contatoFeito" : "contatoPendente") + '">' +
                          escaparHtml(textoContatoPainel(cliente)) + "</span>"
                        : valor
            },
            {
                title:"Data de criação",
                data:"criadoEm",
                responsivePriority:3,
                // O valor cru é devolvido para a ordenação continuar cronológica.
                render: (valor, tipo) =>
                    tipo === "display"
                        ? escaparHtml(formatarDataHora(valor))
                        : (valor || "")
            },
            {
                title:"Celular",
                data:"celular",
                className:"none",
                render: (valor, tipo) =>
                    tipo === "display"
                        ? valorComCopia(valor, "Telefone")
                        : valor
            },
            {
                title:"CPF",
                data:"cpf",
                className:"none",
                render: (valor, tipo) =>
                    tipo === "display"
                        ? valorComCopia(valor, "CPF")
                        : valor
            },
            {
                title:"Ofertas",
                data:"ofertas",
                className:"none",
                render: (valor, tipo) =>
                    tipo === "display" ? escaparHtml(String(valor)) : valor
            },
            {
                title:"Ações",
                data:null,
                orderable:false,
                searchable:false,
                className:"none colunaAcoesPainel",
                render: (linha, tipo, cliente) =>
                    tipo === "display" ? botoesAcao(cliente) : ""
            }
        ],

        // Coluna de controle explícita: o detalhe abre pelo ⊕ da primeira coluna.
        responsive:{
            details:{
                type:"column",
                target:0
            }
        },

        pageLength:10,
        lengthMenu:[10,25,50,100],

        // Mais recentes primeiro: é a fila de trabalho do operador.
        // Índice 3 = "Data de criação" (0 é o controle e 2 virou "Contato").
        order:[[3,"desc"]],

        language:{
            emptyTable:"Nenhum cliente com oferta neste período.",
            info:"Mostrando _START_ a _END_ de _TOTAL_ clientes",
            infoEmpty:"Nenhum cliente",
            infoFiltered:"(filtrado de _MAX_ no total)",
            lengthMenu:"Exibir _MENU_ por página",
            loadingRecords:"Carregando...",
            processing:"Processando...",
            search:"Buscar:",
            zeroRecords:"Nenhum cliente encontrado para esta busca.",
            paginate:{
                first:"Primeira",
                last:"Última",
                next:"Próxima",
                previous:"Anterior"
            }
        }

    });

    // O container dos cards nasce fora do layout do DataTables; movê-lo para
    // junto da tabela mantém a busca e o paginador em cima e embaixo dele nas
    // duas visões — os controles continuam valendo no modo card.
    const tabela = document.getElementById("tabelaPainel");
    const cards = document.getElementById("cardsPainel");

    if(tabela && cards && tabela.parentNode){
        tabela.parentNode.insertBefore(cards, tabela.nextSibling);
    }

    // Busca, ordenação, paginação e filtro de data passam todos por aqui.
    tabelaPainel.on("draw", renderizarCardsPainel);

    tabelaPainelIniciada = true;

}


// ===============================
// VISÃO EM CARDS
// Mesma origem da tabela: os cards refletem a página exibida, com a busca e a
// ordenação já aplicadas, então as duas visões nunca mostram coisas diferentes.
// ===============================

function renderizarCardsPainel(){

    const container = document.getElementById("cardsPainel");

    if(!container || !tabelaPainel) return;

    // Na visão de tabela os cards estão ocultos: não há o que remontar.
    if(visaoPainel !== "cards") return;

    const linhas = tabelaPainel
        .rows({page:"current", search:"applied", order:"applied"})
        .data()
        .toArray();

    if(!linhas.length){

        container.innerHTML =
            '<div class="cardPainelVazio">Nenhum cliente para exibir.</div>';

        return;

    }

    container.innerHTML = linhas.map(cartaoPainel).join("");

}


function cartaoPainel(cliente){

    const ofertas = cliente.ofertas === 1
        ? "1 oferta"
        : cliente.ofertas + " ofertas";

    return `
<article class="cardPainel">

    <header class="cardPainelTopo">
        <h3>${escaparHtml(cliente.nome)}</h3>
        <span class="seloOfertas">${escaparHtml(ofertas)}</span>
    </header>

    <p class="cardPainelData">
        <i class="bi bi-calendar-event"></i>
        ${escaparHtml(formatarDataHora(cliente.criadoEm)) || "sem data de criação"}
    </p>

    <span class="seloContato ${cliente.contatado ? "contatoFeito" : "contatoPendente"}">
        ${escaparHtml(textoContatoPainel(cliente))}
    </span>

    <div class="cardPainelCampo">
        <span class="rotuloCampo">Celular</span>
        ${valorComCopia(cliente.celular, "Telefone")}
    </div>

    <div class="cardPainelCampo">
        <span class="rotuloCampo">CPF</span>
        ${valorComCopia(cliente.cpf, "CPF")}
    </div>

    <div class="cardPainelAcoes">${botoesAcao(cliente)}</div>

</article>`;

}


function alternarVisaoPainel(visao){

    visaoPainel = visao;

    const caixa = document.getElementById("caixaPainel");

    if(caixa) caixa.classList.toggle("emCards", visao === "cards");

    const botaoTabela = document.getElementById("visaoTabela");
    const botaoCards = document.getElementById("visaoCards");

    if(botaoTabela) botaoTabela.classList.toggle("ativo", visao !== "cards");
    if(botaoCards) botaoCards.classList.toggle("ativo", visao === "cards");

    if(visao === "cards"){

        renderizarCardsPainel();

    }else if(tabelaPainel){

        // A tabela estava escondida: as colunas precisam ser remedidas.
        tabelaPainel.columns.adjust().responsive.recalc();

    }

}


function desenharPainel(){

    if(!tabelaPainel) return;

    atualizarContatosPainel();

    tabelaPainel.clear();
    tabelaPainel.rows.add(clientesFiltradosPainel());
    tabelaPainel.draw();

    atualizarResumoPainel();

}


// Abre o canal escolhido e redesenha: os dois marcam o primeiro contato no
// localStorage, e a linha precisa refletir isso na hora.
function contatarPainel(numero, nome, id, canal){

    if(canal === "telegram"){
        abrirTelegram(numero, nome, id);
    }else{
        abrirWhatsapp(numero, nome, id);
    }

    atualizarContatosPainel();

    // Com o filtro de não contatados ligado, a linha sai da lista — aí não
    // basta reler as linhas, a seleção inteira muda.
    if(somenteNaoContatados){

        desenharPainel();

    }else if(tabelaPainel){

        tabelaPainel.rows().invalidate().draw(false);
        atualizarResumoPainel();

    }

}


// ===============================
// FILTROS DE DATA
// ===============================

function marcarFiltroAtivo(){

    const chips = {
        hoje:"filtroHoje",
        ontem:"filtroOntem",
        todos:"filtroTodos"
    };

    Object.keys(chips).forEach(tipo=>{

        const chip = document.getElementById(chips[tipo]);

        if(chip) chip.classList.toggle("ativo", filtroDataPainel === tipo);

    });

    const campo = document.getElementById("campoDataPainel");

    if(campo) campo.classList.toggle("ativo", filtroDataPainel === "data");

    const contato = document.getElementById("filtroNaoContatado");

    if(contato) contato.classList.toggle("ativo", somenteNaoContatados);

}


// Independente do filtro de data: os dois valem ao mesmo tempo.
function alternarNaoContatados(){

    somenteNaoContatados = !somenteNaoContatados;

    marcarFiltroAtivo();
    desenharPainel();

}


function filtrarPainelPor(tipo){

    filtroDataPainel = tipo;

    if(tipo !== "data"){

        dataEscolhidaPainel = "";

        const entrada = document.getElementById("dataPainel");

        if(entrada) entrada.value = "";

    }

    marcarFiltroAtivo();
    desenharPainel();

}


function filtrarPainelPorData(valor){

    // Limpar o campo de data volta para a lista inteira.
    if(!valor){
        filtrarPainelPor("todos");
        return;
    }

    dataEscolhidaPainel = valor;
    filtroDataPainel = "data";

    marcarFiltroAtivo();
    desenharPainel();

}


// ===============================
// CARGA
// ===============================

async function carregarPainel(){

    mostrarAvisoPainel("Carregando clientes...", "info");

    try{

        const registros = await apiListarClientes();

        painelClientes = registros
            .map(mapearClientePainel)
            .filter(clienteDoPainel);

        // O modal de proposta e o WhatsApp leem a lista global do Painel.
        clientes = painelClientes;

        iniciarTabelaPainel();
        desenharPainel();

    }catch(erro){

        // Sem dados na tela, o operador precisa saber por quê.
        iniciarTabelaPainel();

        mostrarAvisoPainel(erro.message + " ", "erro", true);

        console.error("Falha ao carregar o painel:", erro);

    }

}


function atualizarResumoPainel(){

    const total = painelClientes.length;
    const exibidos = clientesFiltradosPainel().length;
    const rotulo = rotuloFiltroPainel();

    if(!total){

        mostrarAvisoPainel(
            "Nenhum cliente com oferta e celular cadastrado.",
            "info"
        );

        return;

    }

    const recorte = rotulo + (somenteNaoContatados ? " · só não contatados" : "");

    if(!exibidos){

        mostrarAvisoPainel(
            "Nenhum cliente com oferta em " + recorte + ". " +
            'Toque em "Todos" para ver os ' + total + " clientes da lista.",
            "info"
        );

        return;

    }

    const contatados = clientesFiltradosPainel()
        .filter(cliente => cliente.contatado).length;

    mostrarAvisoPainel(
        exibidos + (exibidos === 1 ? " cliente" : " clientes") +
        " com oferta · " + recorte +
        (somenteNaoContatados ? "" : " · " + contatados + " já contatado" +
            (contatados === 1 ? "" : "s")),
        "info"
    );

}


function mostrarAvisoPainel(texto, tipo, comBotao){

    const aviso = document.getElementById("avisoPainel");

    if(!aviso) return;

    aviso.className = "avisoClientes aviso-" + (tipo || "info");
    aviso.textContent = texto;
    aviso.style.display = "block";

    if(comBotao){

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "btnTentarNovamente";
        botao.textContent = "Tentar novamente";
        botao.onclick = carregarPainel;

        aviso.appendChild(botao);

    }

}


// O Painel é a seção aberta ao entrar: carrega junto com a página.
if(document.getElementById("tabelaPainel")){

    marcarFiltroAtivo();
    carregarPainel();

}
