// ===============================
// TOASTS
// Substituem os alert() do projeto: o alert trava a página inteira e, no
// celular, cobre o que o operador estava lendo. Estes empilham num canto,
// somem sozinhos e não interrompem o fluxo.
//
// Não substituem confirm(): aquele espera uma resposta.
// ===============================

const DURACAO_TOAST = {
    sucesso: 3500,
    info: 4000,
    erro: 6000
};

const ICONE_TOAST = {
    sucesso: "bi-check-circle-fill",
    erro: "bi-exclamation-triangle-fill",
    info: "bi-info-circle-fill"
};


// O container nasce na primeira notificação: nenhuma das páginas precisa
// declarar marcação para isso funcionar.
function containerToast(){

    let container = document.getElementById("toasts");

    if(!container){

        container = document.createElement("div");
        container.id = "toasts";
        container.className = "toasts";

        // Leitores de tela anunciam o texto sem levar o foco para cá.
        container.setAttribute("role", "status");
        container.setAttribute("aria-live", "polite");

        document.body.appendChild(container);

    }

    return container;

}


function fecharToast(toast){

    if(!toast || toast.dataset.saindo === "sim") return;

    toast.dataset.saindo = "sim";
    toast.classList.add("saindo");

    // Espera a transição terminar antes de tirar do DOM.
    setTimeout(()=>{
        if(toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);

}


function notificar(mensagem, tipo, duracao){

    const texto = String(mensagem == null ? "" : mensagem).trim();

    if(!texto) return;

    tipo = ICONE_TOAST[tipo] ? tipo : "info";

    const toast = document.createElement("div");

    toast.className = "toast-vc toast-" + tipo;

    const icone = document.createElement("i");
    icone.className = "bi " + ICONE_TOAST[tipo];

    // textContent: a mensagem pode carregar retorno de erro da API.
    const corpo = document.createElement("span");
    corpo.className = "toastTexto";
    corpo.textContent = texto;

    const fechar = document.createElement("button");
    fechar.type = "button";
    fechar.className = "toastFechar";
    fechar.setAttribute("aria-label", "Fechar aviso");
    fechar.innerHTML = '<i class="bi bi-x-lg"></i>';
    fechar.onclick = () => fecharToast(toast);

    toast.appendChild(icone);
    toast.appendChild(corpo);
    toast.appendChild(fechar);

    containerToast().appendChild(toast);

    // Um quadro depois, para a transição de entrada acontecer.
    requestAnimationFrame(()=> toast.classList.add("visivel"));

    setTimeout(
        () => fecharToast(toast),
        duracao || DURACAO_TOAST[tipo]
    );

}
