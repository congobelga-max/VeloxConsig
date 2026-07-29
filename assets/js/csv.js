// ===============================
// LEITURA DE CSV
// Usado pela importação local (app.js) e pelo upload para a API
// (importacoes.js). Carregado antes dos dois.
// ===============================


// Colunas exigidas na planilha de clientes, com os nomes aceitos para cada uma.
// A comparação é feita sem acento e sem diferenciar maiúsculas.
const ALIASES_COLUNAS = {
    nome:["nome","cliente","nome completo","nome do cliente"],
    telefone:["telefone","celular","fone","whatsapp","tel"],
    cpf:["cpf","documento","doc"]
};

const COLUNAS_OBRIGATORIAS = Object.keys(ALIASES_COLUNAS);


// ===============================
// PASTA DE LEADS PUBLICADA PELO APACHE
//
// A pasta real é C:\VeloxConsig\leads, fora do htdocs. O navegador não
// consegue abri-la por caminho — nenhuma página lê o disco por path —, então
// ela precisa estar publicada pelo Apache. Alias necessário no httpd.conf:
//
//   Alias /leads "C:/VeloxConsig/leads"
//   <Directory "C:/VeloxConsig/leads">
//       Require local
//       Options -Indexes
//   </Directory>
//
// `Require local` mantém a pasta acessível só a partir desta máquina.
// ===============================

const LEADS_CONFIG = {
    URL_PASTA:"/leads/",
    ARQUIVO_PADRAO:"leads_crm_04.csv"
};


async function baixarArquivoLeads(nomeArquivo){

    const nome = nomeArquivo || LEADS_CONFIG.ARQUIVO_PADRAO;
    const url = LEADS_CONFIG.URL_PASTA + encodeURIComponent(nome);

    let resposta;

    try{

        resposta = await fetch(url,{cache:"no-store"});

    }catch(erro){

        throw new Error(
            "Não consegui acessar " + url + ". A pasta de leads precisa estar " +
            "publicada no Apache (Alias /leads)."
        );

    }

    if(!resposta.ok){

        throw new Error(
            "Arquivo não encontrado em " + url + " (erro " + resposta.status + ")."
        );

    }

    const buffer = await resposta.arrayBuffer();

    return {
        nome: nome,
        buffer: buffer,
        texto: decodificarTexto(buffer)
    };

}


function ehArquivoCsv(arquivo){

    if(!arquivo) return false;

    if(/\.csv$/i.test(arquivo.name || "")) return true;

    return /(^|\/)(csv|comma-separated)/i.test(arquivo.type || "");

}


// Excel brasileiro grava CSV em windows-1252; lido como UTF-8, todo acento
// vira caractere inválido. Tenta UTF-8 estrito e cai para 1252 se falhar.
function decodificarTexto(buffer){

    let bytes = new Uint8Array(buffer);

    // BOM de UTF-8: sobra como caractere invisível no primeiro cabeçalho.
    if(bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF){
        bytes = bytes.subarray(3);
    }

    try{

        return new TextDecoder("utf-8",{fatal:true}).decode(bytes);

    }catch(erro){

        return new TextDecoder("windows-1252").decode(bytes);

    }

}


function lerArquivoComoTexto(arquivo){

    return new Promise((resolver, rejeitar)=>{

        const leitor = new FileReader();

        leitor.onload = () => {
            try{
                resolver(decodificarTexto(leitor.result));
            }catch(erro){
                rejeitar(erro);
            }
        };

        leitor.onerror = () => rejeitar(leitor.error);

        leitor.readAsArrayBuffer(arquivo);

    });

}


function primeiraLinhaUtil(texto){

    const linhas = String(texto || "").split(/\r\n|\r|\n/);

    for(const linha of linhas){
        if(linha.trim() !== "") return linha;
    }

    return "";

}


// O SheetJS assume vírgula. Aqui o separador é deduzido do cabeçalho:
// ponto e vírgula é o padrão do Excel em português.
function detectarSeparadorCsv(texto){

    const cabecalho = primeiraLinhaUtil(texto);

    const candidatos = [";", ",", "\t", "|"];

    let escolhido = ";";
    let maior = 0;

    for(const separador of candidatos){

        const ocorrencias = cabecalho.split(separador).length - 1;

        if(ocorrencias > maior){
            maior = ocorrencias;
            escolhido = separador;
        }

    }

    return escolhido;

}


function normalizarCabecalho(texto){

    return String(texto || "")
        .replace(/^﻿/, "")
        .replace(/^"+|"+$/g, "")
        // Sem acento: "Endereço" e "Endereco" viram a mesma coluna.
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim()
        .toLowerCase();

}


// Confere se o cabeçalho tem as três colunas e conta as linhas de dados.
function analisarCabecalhoCsv(texto){

    const separador = detectarSeparadorCsv(texto);
    const cabecalho = primeiraLinhaUtil(texto);

    const colunas = cabecalho
        .split(separador)
        .map(normalizarCabecalho)
        .filter(coluna => coluna !== "");

    const faltando = COLUNAS_OBRIGATORIAS.filter(obrigatoria =>
        !ALIASES_COLUNAS[obrigatoria].some(alias => colunas.includes(alias))
    );

    const linhas = String(texto || "")
        .split(/\r\n|\r|\n/)
        .filter(linha => linha.trim() !== "")
        .length;

    return {
        separador: separador,
        colunas: colunas,
        faltando: faltando,
        // A primeira linha é o cabeçalho.
        linhas: Math.max(0, linhas - 1)
    };

}
