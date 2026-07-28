let clientes = [];

let filtroAtual = "todos";

let pesquisaAtual = "";

const arquivo = document.getElementById("arquivo");

arquivo.addEventListener("change", importarPlanilha);

// =========================
// IMPORTAR PLANILHA
// =========================


function importarPlanilha(e){

    const file = e.target.files[0];

    if(!file) return;

    const reader = new FileReader();

    reader.onload = function(evt){

        let workbook;

        try{

            if(typeof evt.target.result === "string"){

                workbook = XLSX.read(evt.target.result,{
                    type:"binary"
                });

            }else{

                workbook = XLSX.read(
                    new Uint8Array(evt.target.result),
                    {
                        type:"array"
                    }
                );

            }

        }catch(erro){

            alert("Não foi possível ler esta planilha.");
            console.error(erro);
            e.target.value = "";
            return;

        }

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const json = XLSX.utils.sheet_to_json(sheet,{
            defval:""
        });


        // ==========================================
        // GUARDA O HISTÓRICO DA LISTA ATUAL
        // ==========================================

        const historico = {};

        clientes.forEach(cliente=>{

            const id = somenteNumeros(cliente.cpf);

            if(id){

                historico[id] = {
                    status: cliente.status || "nao",
                    data: cliente.data || "",
                    hora: cliente.hora || ""
                };

            }

        });


        // ==========================================
        // MONTA A NOVA LISTA
        // ==========================================

        const novosClientes = [];

        json.forEach(linha=>{

            const nome =
                linha.NOME ||
                linha.Nome ||
                linha.nome ||
                linha.CLIENTE ||
                linha.Cliente ||
                "";

            if(String(nome).trim() === "") return;


            const cpf =
                linha.CPF ||
                linha.cpf ||
                "";


            const telefone =
                linha.TELEFONE ||
                linha.Telefone ||
                linha.telefone ||
                linha.CELULAR ||
                linha.Celular ||
                linha.celular ||
                "";


            const id = somenteNumeros(cpf);

            if(!id) return;


            // ==========================================
            // VERIFICA SE O CPF JÁ EXISTIA
            // ==========================================

            const clienteAnterior = historico[id] || null;


            // ==========================================
            // STATUS DA PLANILHA
            // ==========================================

            const statusBruto = String(
                linha.Status ||
                linha.STATUS ||
                ""
            ).trim();

            const statusPlanilha = statusBruto.toUpperCase();

            let statusFinal;


            // Se a planilha possui um status válido,
            // ela tem prioridade.

            if(statusPlanilha === "COM"){

                statusFinal = "com";

            }else if(statusPlanilha === "SEM"){

                statusFinal = "sem";

            }else if(
                statusPlanilha === "NÃO CONSULTADO" ||
                statusPlanilha === "NAO CONSULTADO" ||
                statusPlanilha === "NÃO" ||
                statusPlanilha === "NAO"
            ){

                statusFinal = "nao";

            }else if(clienteAnterior){

                // CPF já existia na lista atual
                statusFinal = clienteAnterior.status;

            }else{

                // Procura histórico salvo neste navegador
                statusFinal =
                    localStorage.getItem("status_" + id) ||
                    "nao";

            }


            // ==========================================
            // DATA
            // ==========================================

            let dataFinal = "";

            if(linha.Data || linha.DATA){

                dataFinal =
                    linha.Data ||
                    linha.DATA;

            }else if(clienteAnterior){

                dataFinal =
                    clienteAnterior.data ||
                    "";

            }else{

                dataFinal =
                    localStorage.getItem("data_" + id) ||
                    "";

            }


            // ==========================================
            // HORA
            // ==========================================

            let horaFinal = "";

            if(linha.Hora || linha.HORA){

                horaFinal =
                    linha.Hora ||
                    linha.HORA;

            }else if(clienteAnterior){

                horaFinal =
                    clienteAnterior.hora ||
                    "";

            }else{

                horaFinal =
                    localStorage.getItem("hora_" + id) ||
                    "";

            }


            // ==========================================
            // NÃO CONSULTADO NÃO DEVE TER DATA/HORA
            // ==========================================

            if(statusFinal === "nao"){

                dataFinal = "";
                horaFinal = "";

            }


            // ==========================================
            // ADICIONA À NOVA LISTA
            // ==========================================

            novosClientes.push({

                id: id,

                nome: String(nome).trim(),

                cpf: formatarCPF(cpf),

                telefone: formatarTelefone(telefone),

                status: statusFinal,

                data: dataFinal,

                hora: horaFinal

            });


            // ==========================================
            // ATUALIZA O LOCALSTORAGE
            // ==========================================

            localStorage.setItem(
                "status_" + id,
                statusFinal
            );

            if(statusFinal !== "nao"){

                if(dataFinal){

                    localStorage.setItem(
                        "data_" + id,
                        dataFinal
                    );

                }

                if(horaFinal){

                    localStorage.setItem(
                        "hora_" + id,
                        horaFinal
                    );

                }

            }else{

                localStorage.removeItem(
                    "data_" + id
                );

                localStorage.removeItem(
                    "hora_" + id
                );

            }

        });


        // ==========================================
        // SUBSTITUI PELA NOVA LISTA
        // ==========================================

        clientes = novosClientes;


        clientes.sort((a,b)=>
            a.nome.localeCompare(b.nome)
        );


        // Volta para TODOS ao importar nova lista

        filtroAtual = "todos";

        document
            .querySelectorAll(".cardDash")
            .forEach(card=>
                card.classList.remove("ativo")
            );

        const dashTodos =
            document.getElementById("dashTodos");

        if(dashTodos){

            dashTodos.classList.add("ativo");

        }


        renderizarCards();

        atualizarDashboard();

        e.target.value = "";

    };


    if(reader.readAsBinaryString){

        reader.readAsBinaryString(file);

    }else{

        reader.readAsArrayBuffer(file);

    }

}

// ==========================================
// ATUALIZAR DASHBOARD
// ==========================================

function atualizarDashboard(){

    let total=clientes.length;

    let consultados=0;

    let com=0;

    let sem=0;

    let aguardando=0;

    clientes.forEach(c=>{

        if(c.status!="nao")
            consultados++;

        if(c.status=="com")
            com++;

        if(c.status=="sem")
            sem++;

        if(aguardandoResposta(c))
            aguardando++;

    });

    document.getElementById("total").innerHTML=total;

    document.getElementById("consultados").innerHTML=consultados;

    document.getElementById("comMargem").innerHTML=com;

    document.getElementById("semMargem").innerHTML=sem;

    const aguardandoEl=document.getElementById("aguardandoResposta");
    if(aguardandoEl) aguardandoEl.innerHTML=aguardando;

}

// ==========================================
// RENDERIZAR CARD
// ==========================================

function renderizarCards(){

    const lista = document.getElementById("clientes");

    lista.innerHTML = "";

    clientes.forEach(cliente=>{
		
		if(filtroAtual=="pendentes" && cliente.status!="nao")
		return;

		if(filtroAtual=="com" && cliente.status!="com")
		return;

		if(filtroAtual=="sem" && cliente.status!="sem")
		return;

		if(filtroAtual=="aguardando" && !aguardandoResposta(cliente))
		return;

		if(pesquisaAtual){

			const termo = pesquisaAtual.toLowerCase();

			const nome = String(cliente.nome || "").toLowerCase();

			const cpf = somenteNumeros(cliente.cpf);

			const telefone = somenteNumeros(cliente.telefone);

			const termoNumerico = somenteNumeros(pesquisaAtual);

			const encontrouNome =
				nome.includes(termo);

			const encontrouCPF =
				termoNumerico &&
				cpf.includes(termoNumerico);

			const encontrouTelefone =
				termoNumerico &&
				telefone.includes(termoNumerico);

			if(
				!encontrouNome &&
				!encontrouCPF &&
				!encontrouTelefone
			){
        return;
    }

}

        let corStatus="nao";

        if(cliente.status=="com") corStatus="com";

        if(cliente.status=="sem") corStatus="sem";

        lista.innerHTML += `

<div class="cliente">

    <div class="topo">

        <div class="nome">
            ${escaparHtml(cliente.nome)}
        </div>

        <div class="status ${corStatus}"></div>

    </div>

    <div class="rotulo">
        CPF
    </div>

    <div class="valor valorCopiavel"
         onclick="copiarTexto('${escaparArgumento(cliente.cpf)}', 'CPF')"
         title="Clique para copiar o CPF">
        ${escaparHtml(cliente.cpf)}
    </div>

    <div class="rotulo">
        Telefone
    </div>

    <div class="valor valorCopiavel"
         onclick="copiarTexto('${escaparArgumento(cliente.telefone)}', 'Telefone')"
         title="Clique para copiar o telefone">
        ${escaparHtml(cliente.telefone)}
    </div>

    ${aguardandoResposta(cliente)
        ? `<div class="aguardandoRespostaCard">📲 Aguardando resposta</div>`
        : ""}

    <div class="acoes">

	<button
		class="btnZap"
		onclick="abrirWhatsapp('${somenteNumeros(cliente.telefone)}', '${escaparArgumento(cliente.nome)}', '${cliente.id}')">

		<i class="bi bi-whatsapp"></i>

		WhatsApp

	</button>
    <button class="btnProposta" onclick="abrirModalProposta('${cliente.id}')">✨ Montar proposta</button>
    <div class="dropdown">

            <button
                class="menu"
                data-bs-toggle="dropdown">

                <i class="bi bi-three-dots-vertical"></i>

            </button>

            <ul class="dropdown-menu dropdown-menu-end">

				<li>

					<a
						class="dropdown-item"
						href="#"
						onclick="alterarStatus('${cliente.id}','com')">

						🟢 Com margem

					</a>

				</li>

				<li>

				 <a
						class="dropdown-item"
						href="#"
						onclick="alterarStatus('${cliente.id}','sem')">

						🟡 Sem margem

				</a>

				</li>

				<li>

					<a
						class="dropdown-item"
						href="#"
						onclick="alterarStatus('${cliente.id}','nao')">

						⚪ Não Consultado

					</a>

				</li>            
			</ul>

        </div>

    </div>

</div>

`;

    });

}

// =========================
// ABRIR WHATSAPP
// =========================

function abrirWhatsapp(numero, nome, id){

    numero = String(numero || "").replace(/\D/g,"");

    if(numero.length === 10 || numero.length === 11){
        numero = "55" + numero;
    }

    const primeiroNome = String(nome || "").trim().split(/\s+/)[0];
    const chave = "contato_inicial_" + id;
    const jaContatado = localStorage.getItem(chave) === "sim";

    let mensagem;

    if(jaContatado){
        mensagem =
            "Oi, " + primeiroNome + "! Passando para dar continuidade ao nosso contato sobre as condições de crédito disponíveis para você. 😊\n\n" +
            "Caso tenha interesse, posso verificar as opções atualizadas e te enviar por aqui.";
    }else{
        mensagem =
            "Olá, " + primeiroNome + "! Tudo bem? 😊\n\n" +
            "Aqui é Carol, da Velox Consig.\n\n" +
            "Estamos entrando em contato porque identificamos que você possui margem disponível para contratação de crédito para trabalhador CLT, com desconto das parcelas direto na folha.\n\n" +
            "Posso te enviar o valor disponível e uma simulação das parcelas?";

        const agora = new Date();
        localStorage.setItem(chave, "sim");
        localStorage.setItem("contato_data_" + id, agora.toLocaleDateString("pt-BR"));
        localStorage.setItem("contato_hora_" + id, agora.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}));

        atualizarDashboard();
    }

    const url = "https://wa.me/" + numero + "?text=" + encodeURIComponent(mensagem);
    window.open(url, "_blank");
}

// =========================
// COPIAR CPF
// =========================

function copiarTexto(texto, tipo){

    let textoLimpo = String(texto || "").replace(/\D/g,'');

    // CPF deve sempre ser copiado com 11 dígitos.
    // Se o zero à esquerda foi perdido na planilha, ele é reposto somente na cópia.
    if(String(tipo || "").toLowerCase().includes("cpf")){
        textoLimpo = textoLimpo.padStart(11, "0");
    }

    const input = document.createElement("input");
    input.value = textoLimpo;
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, 99999);
    document.execCommand("copy");
    document.body.removeChild(input);

    alert(tipo + " copiado!");

}

// =========================
// ALTERAR STATUS
// =========================

function alterarStatus(id,status){

    clientes.forEach(cliente=>{

        if(cliente.id==id){

            cliente.status=status;

            if(status==="nao"){

                cliente.data="";
                cliente.hora="";

                localStorage.setItem("status_"+id,"nao");
                localStorage.removeItem("data_"+id);
                localStorage.removeItem("hora_"+id);

            }else{

                const agora=new Date();

                cliente.data=agora.toLocaleDateString("pt-BR");

                cliente.hora=agora.toLocaleTimeString("pt-BR",{
                    hour:"2-digit",
                    minute:"2-digit"
                });

                localStorage.setItem("status_"+id,status);
                localStorage.setItem("data_"+id,cliente.data);
                localStorage.setItem("hora_"+id,cliente.hora);

            }

        }

    });

    renderizarCards();
    atualizarDashboard();

    if(status!=="nao" && filtroAtual=="todos"){

        setTimeout(function(){

            irParaProximoCliente(id);

        },150);

    }

}

// =========================
// ir Para Proximo Cliente
// =========================

function irParaProximoCliente(idAtual){

    const indiceAtual = clientes.findIndex(c => c.id == idAtual);

    if(indiceAtual == -1) return;

    const cards = document.querySelectorAll(".cliente");

    for(let i = indiceAtual + 1; i < clientes.length; i++){

        if(clientes[i].status == "nao"){

            if(cards[i]){

                cards[i].scrollIntoView({

                    behavior:"smooth",

                    block:"center"

                });
				
				if(navigator.vibrate){

					navigator.vibrate(80);

				}

                setTimeout(()=>{

                    cards[i].classList.add("destacado");

                    setTimeout(()=>{

                        cards[i].classList.remove("destacado");

                    },1200);

                },400);

            }

            return;

        }

    }

}
// ===============================
// APLICAR fILTRO
// ===============================

function aplicarFiltro(filtro){

    filtroAtual = filtro;

    document
        .querySelectorAll(".cardDash")
        .forEach(c=>c.classList.remove("ativo"));

    if(filtro=="todos")
        document.getElementById("dashTodos").classList.add("ativo");

    if(filtro=="pendentes")
        document.getElementById("dashPendentes").classList.add("ativo");

    if(filtro=="com")
        document.getElementById("dashCom").classList.add("ativo");

    if(filtro=="sem")
        document.getElementById("dashSem").classList.add("ativo");

    if(filtro=="aguardando")
        document.getElementById("dashAguardando").classList.add("ativo");

    renderizarCards();
}	
// ===============================
// EXPORTAR PLANILHA
// ===============================

	
function exportarPlanilha(){

    const agora = new Date();

    const dia = String(agora.getDate()).padStart(2,"0");
    const mes = String(agora.getMonth()+1).padStart(2,"0");
    const ano = agora.getFullYear();

    const hora = String(agora.getHours()).padStart(2,"0");
    const minuto = String(agora.getMinutes()).padStart(2,"0");

    const nomeArquivo =
        `Clientes_${dia}-${mes}-${ano}_${hora}-${minuto}.xlsx`;

    const dados = clientes.map(cliente => ({

        Nome: cliente.nome,

        CPF: cliente.cpf,

        Telefone: cliente.telefone,

        Status:
            cliente.status === "com"
                ? "COM"
                : cliente.status === "sem"
                    ? "SEM"
                    : "NÃO CONSULTADO",

        Data: cliente.data,

        Hora: cliente.hora

    }));

    const ws = XLSX.utils.json_to_sheet(dados);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Clientes");

    XLSX.writeFile(wb, nomeArquivo);

}
// ===============================
// FUNÇÕES AUXILIARES
// ===============================

function somenteNumeros(texto){
    return String(texto || "").replace(/\D/g,"");
}

// Cliente que já recebeu o primeiro contato mas ainda não foi consultado.
// Mesma regra usada pelo contador do dashboard e pelo filtro "aguardando".
function aguardandoResposta(cliente){

    return cliente.status === "nao" &&
        localStorage.getItem("contato_inicial_" + cliente.id) === "sim";

}

// Os cards são montados como texto HTML, então todo valor vindo da planilha
// precisa ser escapado — um nome como "D'Ávila" quebrava a marcação.
function escaparHtml(texto){

    return String(texto == null ? "" : texto)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#39;");

}

// Valor que vai dentro de uma string JS entre aspas simples,
// dentro de um atributo onclick: escapa para o JS e depois para o HTML.
function escaparArgumento(texto){

    return escaparHtml(
        String(texto == null ? "" : texto)
            .replace(/\\/g,"\\\\")
            .replace(/'/g,"\\'")
    );

}

function formatarTelefone(numero){

    numero = somenteNumeros(numero);

    if(numero.length==11){

        return "("+
            numero.substring(0,2)+") "+
            numero.substring(2,7)+"-"+
            numero.substring(7);

    }

    if(numero.length==10){

        return "("+
            numero.substring(0,2)+") "+
            numero.substring(2,6)+"-"+
            numero.substring(6);

    }

    return numero;

}

function formatarCPF(cpf){

    cpf = somenteNumeros(cpf);

    if(cpf.length!=11)
        return cpf;

    return cpf.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        "$1.$2.$3-$4"
    );

}



// ===============================
// AJUSTA DADOS IMPORTADOS
// ===============================

	



// ===============================
// MENSAGEM CASO NÃO TENHA DADOS
// ===============================

if(clientes.length===0){

    document.getElementById("clientes").innerHTML=`

        <div class="alert alert-warning text-center">

            Nenhum cliente encontrado na planilha.

        </div>

    `;

}



// ===============================
// PESQUISA DE CLIENTES
// ===============================

const campoPesquisa = document.getElementById("campoPesquisa");

if(campoPesquisa){

    campoPesquisa.addEventListener("input", function(){

        pesquisaAtual = this.value.trim();

        const botaoLimpar =
            document.getElementById("limparPesquisa");

        if(botaoLimpar){

            botaoLimpar.style.display =
                pesquisaAtual ? "block" : "none";

        }

        renderizarCards();

    });

}

function limparPesquisa(){

    pesquisaAtual = "";

    const campo =
        document.getElementById("campoPesquisa");

    const botao =
        document.getElementById("limparPesquisa");

    if(campo){

        campo.value = "";
        campo.focus();

    }

    if(botao){

        botao.style.display = "none";

    }

    renderizarCards();

}


let clientePropostaAtual=null;
function abrirModalProposta(id){
 clientePropostaAtual=clientes.find(c=>String(c.id)===String(id));
 if(!clientePropostaAtual)return alert("Cliente não encontrado.");
 document.getElementById("clienteProposta").textContent="Cliente: "+clientePropostaAtual.nome;
 document.getElementById("textoTelegram").value=""; document.getElementById("mensagemProposta").value="";
 const av=document.getElementById("avisoProposta"); av.style.display="none"; av.textContent="";
 bootstrap.Modal.getOrCreateInstance(document.getElementById("modalProposta")).show();
}

function normalizarRetornoTelegram(texto){
    return String(texto || "")
        .replace(/\r\n?/g, "\n")
        .replace(/\u00A0/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[‐‑‒–—]/g, "—")
        .replace(/[ \t]+/g, " ")
        .replace(/ *\n */g, "\n")
        .trim();
}

function ofertasPaypro(t){
 const ls=normalizarRetornoTelegram(t).split("\n"); let on=false,o=[];
 for(const x0 of ls){const x=x0.trim();
  if(/paypro/i.test(x)&&/ofertas disponíveis/i.test(x)){on=true;continue}
  if(on&&/digite o número da oferta|voltar aos bancos|bancos disponíveis/i.test(x))break;
  if(!on)continue;
  const m=x.match(/^\d+[\.\s—-]+\s*(\d+)\s*x\s+de\s+R\$\s*([\d.]+,\d{2})\s*(?:→|>|—|-)+\s*libera\s+R\$\s*([\d.]+,\d{2})/i);
  if(m)o.push({prazo:+m[1],parcela:m[2],liberado:m[3]});
 } return o;
}
function resumoBancos(t){
 const o=[]; for(const x0 of normalizarRetornoTelegram(t).split("\n")){const x=x0.trim();
  const m=x.match(/^\d+\s*[—-]\s*(.+?)\s*[—-]\s*(\d+)\s*x\s+R\$\s*([\d.]+,\d{2})\s*(?:→|>|—|-)+\s*R\$\s*([\d.]+,\d{2})/i);
  if(m)o.push({banco:m[1].trim(),prazo:+m[2],parcela:m[3],liberado:m[4]});
 } return o;
}
function valorBR(v){return Number(String(v).replace(/\./g,"").replace(",","."))}

let colagemTelegramEmAndamento = false;

async function colarTelegramAutomaticamente(){

    const campo = document.getElementById("textoTelegram");

    if(!campo || campo.value.trim() || colagemTelegramEmAndamento){
        return;
    }

    if(!navigator.clipboard || !navigator.clipboard.readText){
        return;
    }

    colagemTelegramEmAndamento = true;

    try{

        const texto = await navigator.clipboard.readText();

        if(texto && !campo.value.trim()){
            campo.value = texto;
            campo.dispatchEvent(new Event("input", {bubbles:true}));

            // Após colar a resposta do Telegram, gera a proposta automaticamente.
            gerarProposta();
        }

    }catch(erro){
        // Safari/iOS pode exigir autorização do sistema para colar.
    }finally{
        colagemTelegramEmAndamento = false;
    }

}

function limparTratador(){

    const telegram = document.getElementById("textoTelegram");
    const mensagem = document.getElementById("mensagemProposta");
    const aviso = document.getElementById("avisoProposta");

    if(telegram) telegram.value = "";
    if(mensagem) mensagem.value = "";

    if(aviso){
        aviso.textContent = "";
        aviso.style.display = "none";
    }

    if(telegram){
        telegram.focus();
    }

}

function gerarProposta(){
 if(!clientePropostaAtual)return;

 const t=normalizarRetornoTelegram(document.getElementById("textoTelegram").value);
 if(!t)return alert("Cole primeiro a resposta do Telegram.");

 const av=document.getElementById("avisoProposta");
 const campo=document.getElementById("mensagemProposta");
 av.style.display="none"; av.textContent="";

 const id=clientePropostaAtual.id;
 const margemMatch=t.match(/Margem disponível:\s*R\$\s*([\d.]+,\d{2})/i);
 const margem=margemMatch ? valorBR(margemMatch[1]) : null;

 // Oferta: Paypro primeiro; se não houver, melhor oferta encontrada.
 let o=ofertasPaypro(t), pay=true;
 if(!o.length){
   const r=resumoBancos(t), p=r.filter(x=>/paypro/i.test(x.banco));
   if(p.length)o=p;
   else if(r.length){
     r.sort((x,y)=>valorBR(y.liberado)-valorBR(x.liberado));
     o=[r[0]]; pay=false;
   }
 }

 if(o.length){
   o.sort((x,y)=>x.prazo-y.prazo);
   let maior=o.reduce((m,x)=>valorBR(x.liberado)>valorBR(m.liberado)?x:m,o[0]);
   let msg="Consegui algumas condições disponíveis para você 😊\n\n💰 Você pode liberar até R$ "+maior.liberado+".\n\nVeja as opções:\n\n";
   o.forEach(x=>msg+="• "+x.prazo+"x de R$ "+x.parcela+" → recebe R$ "+x.liberado+"\n");
   msg+="\nQual dessas opções fica melhor para você?";
   campo.value=msg;
   localStorage.setItem("classificacao_"+id,"oferta_disponivel");
   localStorage.setItem("classificacao_texto_"+id,"Oferta disponível");
   av.textContent=pay ? "✓ Oferta disponível — Paypro priorizada." : "✓ Oferta disponível.";
   av.style.display="block";
   return;
 }

 // Timeout tem prioridade sobre "nenhum banco", pois ainda cabe nova tentativa.
 const pendente=/banco não respondeu a tempo|banco nao respondeu a tempo|tente novamente em alguns minutos|\btimeout\b/i.test(t);
 if(pendente){
   campo.value="A consulta ainda está em processamento em uma das instituições. Vou realizar uma nova tentativa e, assim que tiver o retorno, te aviso por aqui. 😊";
   localStorage.setItem("classificacao_"+id,"consulta_pendente");
   localStorage.setItem("classificacao_texto_"+id,"Consulta pendente — Banco sem resposta");
   av.textContent="🟡 CONSULTA PENDENTE — Banco sem resposta. Realizar nova consulta.";
   av.style.display="block";
   return;
 }

 const naoElegivel=/perfil não elegível|perfil nao elegivel|margem disponível R\$\s*0[,.]00 abaixo do mínimo|margem disponivel R\$\s*0[,.]00 abaixo do minimo/i.test(t) || margem===0;
 if(naoElegivel){
   campo.value="Verifiquei as condições disponíveis e, neste momento, não foi possível liberar uma proposta para contratação.\n\nCaso haja alguma atualização nas condições disponíveis, podemos realizar uma nova consulta. 😊";
   localStorage.setItem("classificacao_"+id,"sem_margem");
   localStorage.setItem("classificacao_texto_"+id,"Sem margem — Não elegível");
   av.textContent="🔴 SEM MARGEM — NÃO ELEGÍVEL" + (margem!==null ? " | Margem: R$ "+margem.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "");
   av.style.display="block";
   return;
 }

 const semOferta=/nenhum banco disponível no momento|nenhum banco disponivel no momento|sem oferta disponível no momento|sem oferta disponivel no momento|cliente não aprovado pelo motor de crédito|cliente nao aprovado pelo motor de credito|\bdenied\b/i.test(t);
 if(semOferta){
   campo.value="Fiz a consulta das condições disponíveis no momento e, por enquanto, não conseguimos uma proposta liberada para contratação.\n\nAs condições podem sofrer atualizações. Vou deixar seu contato em acompanhamento e, assim que surgir uma opção disponível, entro em contato. 😊";
   const comMargem=margem!==null && margem>0;
   localStorage.setItem("classificacao_"+id,comMargem ? "com_margem_sem_oferta" : "sem_oferta");
   localStorage.setItem("classificacao_texto_"+id,comMargem ? "Com margem — Sem oferta bancária" : "Sem oferta bancária");
   av.textContent=(comMargem ? "🟠 COM MARGEM — SEM OFERTA BANCÁRIA" : "🟠 SEM OFERTA BANCÁRIA") +
      (margem!==null ? " | Margem: R$ "+margem.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "");
   av.style.display="block";
   return;
 }

 campo.value="";
 av.textContent="⚠️ Não consegui identificar o resultado da consulta. Verifique se todo o retorno do bot foi copiado.";
 av.style.display="block";
}

async function copiarProposta(){
 const f=document.getElementById("mensagemProposta"),m=f.value.trim();if(!m)return alert("Gere a proposta primeiro.");
 try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(m);else{f.select();document.execCommand("copy")}}catch(e){f.select();document.execCommand("copy")}
 alert("Proposta copiada!");
}
function enviarPropostaWhatsApp(){
 if(!clientePropostaAtual)return; const m=document.getElementById("mensagemProposta").value.trim();if(!m)return alert("Gere a proposta primeiro.");
 let n=String(clientePropostaAtual.telefone||"").replace(/\D/g,"");if(n.length===10||n.length===11)n="55"+n;
 window.open("https://wa.me/"+n+"?text="+encodeURIComponent(m), "_blank");
}

// ===============================
// GARANTE ATUALIZAÇÃO DO DASHBOARD
// ===============================

atualizarDashboard();



// ===============================
// GARANTE RENDERIZAÇÃO
// ===============================

renderizarCards();
