// ===============================
// IMPORTAÇÕES DE CLIENTES (sidebar > Importações)
// Depende de api.js e de app.js (escaparHtml, somenteNumeros...).
// ===============================

let importacoes = [];
let tabelaImportacoes = null;
let tabelaImportacoesIniciada = false;
let arquivoImportacao = null;


// ===============================
// MAPEAMENTO
// Só o POST desta rota foi documentado; o formato do registro listado
// ainda não. Os nomes prováveis são aceitos e o que faltar fica em branco.
// Ao confirmar o contrato, reduzir ao caminho real.
// ===============================

function numeroOuNulo(valor){

    if(valor === null || valor === undefined || valor === "") return null;

    const numero = Number(valor);

    return isNaN(numero) ? null : numero;

}


function mapearImportacaoDaApi(registro){

    registro = registro || {};

    return {

        idApi: registro.id != null ? registro.id : (registro.key || ""),
        key: registro.key || "",

        arquivo:
            registro.nomeArquivo ||
            registro.arquivo ||
            registro.fileName ||
            registro.nome ||
            "",

        situacao: String(
            registro.status ||
            registro.situacao ||
            ""
        ).trim(),

        total: numeroOuNulo(
            registro.totalRegistros != null ? registro.totalRegistros :
            registro.total != null ? registro.total :
            registro.quantidade != null ? registro.quantidade :
            registro.linhas
        ),

        importados: numeroOuNulo(
            registro.importados != null ? registro.importados :
            registro.processados != null ? registro.processados :
            registro.sucesso
        ),

        erros: numeroOuNulo(
            registro.erros != null ? registro.erros :
            registro.falhas != null ? registro.falhas :
            registro.invalidos
        ),

        criadoEm:
            registro.createdAtUtc ||
            registro.criadoEm ||
            registro.dataUpload ||
            ""

    };

}


function classeSituacao(situacao){

    const texto = String(situacao || "").toLowerCase();

    if(/conclu|sucesso|finaliz|process(ado|ada)/.test(texto)) return "com";
    if(/erro|falh|recus|invalid/.test(texto)) return "erro";

    return "nao";

}


// ===============================
// TABELA
// ===============================

function iniciarTabelaImportacoes(){

    if(tabelaImportacoesIniciada) return;

    const numero = valor => valor === null ? "—" : String(valor);

    tabelaImportacoes = new DataTable("#tabelaImportacoes",{

        data: importacoes,

        columns:[
            {
                title:"Arquivo",
                data:"arquivo",
                responsivePriority:1,
                render: valor => escaparHtml(valor || "—")
            },
            {
                title:"Situação",
                data:"situacao",
                responsivePriority:3,
                render: (valor, tipo) =>
                    tipo === "display"
                        ? '<span class="selo selo-' + classeSituacao(valor) + '">' +
                          escaparHtml(valor || "—") + "</span>"
                        : valor
            },
            {
                title:"Registros",
                data:"total",
                className:"colunaValor",
                responsivePriority:5,
                render: (valor, tipo) => tipo === "display" ? numero(valor) : (valor || 0)
            },
            {
                title:"Importados",
                data:"importados",
                className:"colunaValor",
                responsivePriority:6,
                render: (valor, tipo) => tipo === "display" ? numero(valor) : (valor || 0)
            },
            {
                title:"Erros",
                data:"erros",
                className:"colunaValor",
                responsivePriority:7,
                render: (valor, tipo) => tipo === "display" ? numero(valor) : (valor || 0)
            },
            {
                title:"Enviado em",
                data:"criadoEm",
                responsivePriority:4,
                render: (valor, tipo) =>
                    tipo === "display" ? escaparHtml(formatarDataHora(valor)) : (valor || "")
            },
            {
                title:"Ações",
                data:null,
                orderable:false,
                searchable:false,
                className:"colunaAcoes",
                responsivePriority:2,
                render: (linha, tipo, importacao) =>
                    '<button type="button" class="btnTabela btnExcluir" title="Excluir" ' +
                    "onclick=\"confirmarExclusaoImportacao('" + escaparArgumento(importacao.idApi) + "')\">" +
                    '<i class="bi bi-trash"></i></button>'
            }
        ],

        responsive:true,
        pageLength:10,
        lengthMenu:[10,25,50],
        order:[[5,"desc"]],

        language:{
            emptyTable:"Nenhuma importação enviada.",
            info:"Mostrando _START_ a _END_ de _TOTAL_ importações",
            infoEmpty:"Nenhuma importação",
            infoFiltered:"(filtrado de _MAX_ no total)",
            lengthMenu:"Exibir _MENU_ por página",
            loadingRecords:"Carregando...",
            processing:"Processando...",
            search:"Buscar:",
            zeroRecords:"Nenhuma importação encontrada para esta busca.",
            paginate:{
                first:"Primeira",
                last:"Última",
                next:"Próxima",
                previous:"Anterior"
            }
        }

    });

    tabelaImportacoesIniciada = true;

}


function atualizarTabelaImportacoes(){

    if(!tabelaImportacoes) return;

    tabelaImportacoes.clear();
    tabelaImportacoes.rows.add(importacoes);
    tabelaImportacoes.draw(false);

}


// ===============================
// CARGA
// ===============================

async function carregarImportacoes(){

    const aviso = document.getElementById("avisoImportacoes");

    mostrarAvisoImportacoes("Carregando importações...", "info");

    try{

        const registros = await apiListarImportacoes();

        importacoes = registros.map(mapearImportacaoDaApi);

        iniciarTabelaImportacoes();
        atualizarTabelaImportacoes();

        if(aviso) aviso.style.display = "none";

    }catch(erro){

        iniciarTabelaImportacoes();

        // Só o POST foi confirmado: a rota pode não ter listagem.
        if(erro.status === 404 || erro.status === 405){

            mostrarAvisoImportacoes(
                "Esta API não expõe listagem de importações — o envio de arquivo continua funcionando.",
                "info"
            );

        }else{

            mostrarAvisoImportacoes(erro.message + " ", "erro", true);

        }

        console.error("Falha ao listar importações:", erro);

    }

}


function mostrarAvisoImportacoes(texto, tipo, comBotao){

    const aviso = document.getElementById("avisoImportacoes");

    if(!aviso) return;

    aviso.className = "avisoClientes aviso-" + (tipo || "info");
    aviso.textContent = texto;
    aviso.style.display = "block";

    if(comBotao){

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "btnTentarNovamente";
        botao.textContent = "Tentar novamente";
        botao.onclick = carregarImportacoes;

        aviso.appendChild(botao);

    }

}


// ===============================
// ENVIO DE ARQUIVO
// ===============================

function abrirModalImportacao(){

    arquivoImportacao = null;

    document.getElementById("arquivoImportacao").value = "";
    document.getElementById("nomeArquivoEscolhido").textContent = "Nenhum arquivo selecionado";

    limparErroImportacao();

    bootstrap.Modal
        .getOrCreateInstance(document.getElementById("modalImportacao"))
        .show();

}


function selecionarArquivoImportacao(evento){

    arquivoImportacao = evento.target.files[0] || null;

    document.getElementById("nomeArquivoEscolhido").textContent =
        arquivoImportacao
            ? arquivoImportacao.name
            : "Nenhum arquivo selecionado";

    limparErroImportacao();

}


function mostrarErroImportacao(mensagem){

    const caixa = document.getElementById("erroImportacao");

    caixa.textContent = mensagem;
    caixa.style.display = "block";

}


function limparErroImportacao(){

    const caixa = document.getElementById("erroImportacao");

    caixa.textContent = "";
    caixa.style.display = "none";

}


function enviandoImportacao(ativo){

    const botao = document.getElementById("btnEnviarImportacao");

    botao.disabled = ativo;
    botao.textContent = ativo ? "Enviando..." : "Enviar";

}


async function enviarImportacao(){

    limparErroImportacao();

    if(!arquivoImportacao){
        mostrarErroImportacao("Escolha um arquivo para enviar.");
        return;
    }

    enviandoImportacao(true);

    try{

        await apiEnviarImportacao(arquivoImportacao);

        bootstrap.Modal
            .getOrCreateInstance(document.getElementById("modalImportacao"))
            .hide();

        await carregarImportacoes();

        // A importação cria clientes no servidor: a lista local fica velha
        // no mesmo instante, então é recarregada junto.
        await carregarClientes();

        mostrarAvisoImportacoes(
            "Arquivo enviado. A lista de clientes foi atualizada.",
            "info"
        );

    }catch(erro){

        mostrarErroImportacao(erro.message);
        console.error("Falha ao enviar importação:", erro);

    }finally{

        enviandoImportacao(false);

    }

}


async function confirmarExclusaoImportacao(idApi){

    const importacao = importacoes.find(i => String(i.idApi) === String(idApi));

    if(!importacao) return;

    if(!confirm(
        'Excluir a importação "' + (importacao.arquivo || idApi) + '"?\n\n' +
        "Esta ação não pode ser desfeita."
    )){
        return;
    }

    try{

        await apiExcluirImportacao(idApi);

        importacoes = importacoes.filter(i => String(i.idApi) !== String(idApi));

        atualizarTabelaImportacoes();

    }catch(erro){

        alert("Não foi possível excluir: " + erro.message);
        console.error("Falha ao excluir importação:", erro);

    }

}
