// ===============================
// MENSAGENS DE PRIMEIRO CONTATO
// Cinquenta redações para a mesma abordagem. O rodízio evita que a operação
// dispare o mesmo texto para leads seguidos — mensagens idênticas em massa
// são o que faz o WhatsApp marcar o número como spam.
//
// {nome} é trocado pelo primeiro nome do cliente.
// ===============================

const MENSAGENS_INICIAIS = [

    "Olá, {nome}! Tudo bem? 😊\n\nAqui é a Carol, da Velox Consig.\n\nIdentificamos que você possui margem disponível para contratação de crédito para trabalhador CLT, com desconto das parcelas direto na folha.\n\nPosso te enviar o valor disponível e uma simulação das parcelas?",

    "Oi, {nome}, tudo certo?\n\nMe chamo Carol e falo pela Velox Consig.\n\nSeu CPF aparece com margem liberada para crédito consignado CLT — aquele com desconto em folha, sem boleto para pagar.\n\nQuer que eu veja quanto dá para liberar no seu caso?",

    "{nome}, boa tarde! 😊\n\nSou a Carol, da Velox Consig.\n\nTrabalhamos com crédito consignado para quem tem carteira assinada: a parcela sai direto do salário e a taxa costuma ser bem menor que a do cartão.\n\nPosso fazer uma simulação rápida para você?",

    "Olá, {nome}!\n\nCarol aqui, da Velox Consig.\n\nFiz uma consulta de margem no seu nome e apareceu saldo disponível para consignado CLT.\n\nTe mando os valores?",

    "Oi, {nome}! 😊\n\nAqui é a Carol, da Velox Consig.\n\nVocê já sabia que, sendo CLT, dá para contratar crédito com desconto direto na folha e juros bem abaixo do cartão e do cheque especial?\n\nPosso te mostrar quanto você teria disponível?",

    "{nome}, tudo bem?\n\nCarol falando, da Velox Consig.\n\nTenho uma boa notícia: você está elegível para crédito consignado CLT, com parcelas descontadas em folha.\n\nQuer ver os valores e prazos disponíveis?",

    "Olá, {nome}! 👋\n\nSou a Carol, da Velox Consig.\n\nEstou entrando em contato porque sua margem para crédito consignado está liberada neste momento.\n\nPosso te enviar a simulação sem compromisso?",

    "Oi, {nome}!\n\nAqui é a Carol, da Velox Consig.\n\nFaço atendimento de crédito consignado para trabalhador CLT — o desconto vem na folha, então não tem risco de esquecer a parcela.\n\nQuer que eu consulte quanto está disponível para você?",

    "{nome}, oi! Tudo bem? 😊\n\nCarol, da Velox Consig.\n\nSeu perfil está apto a crédito consignado com desconto em folha. Costuma sair bem mais barato que empréstimo comum.\n\nPosso simular e te mandar aqui?",

    "Olá, {nome}!\n\nMe chamo Carol e sou consultora da Velox Consig.\n\nVi que você tem margem disponível para crédito consignado CLT.\n\nSe fizer sentido para você, faço a simulação e te envio os valores por aqui. Pode ser?",

    "Oi, {nome}! 😊\n\nCarol, da Velox Consig, falando.\n\nVocê tem interesse em saber quanto consegue liberar em crédito consignado, com as parcelas saindo direto do salário?\n\nA consulta é rápida e não compromete nada.",

    "{nome}, bom dia!\n\nAqui é a Carol, da Velox Consig.\n\nSua margem para consignado CLT está liberada. Esse crédito tem parcela fixa e desconto automático em folha.\n\nQuer que eu veja as condições para você?",

    "Olá, {nome}! Tudo bem?\n\nSou a Carol, da Velox Consig.\n\nEstou passando para avisar que apareceu margem disponível no seu CPF para crédito consignado de trabalhador CLT.\n\nPosso te mandar quanto dá para liberar?",

    "Oi, {nome}! 👋\n\nCarol, da Velox Consig.\n\nMuita gente CLT não sabe que tem direito a crédito com desconto em folha e taxa reduzida. Você está nessa lista.\n\nQuer conferir os valores?",

    "{nome}, tudo certo? 😊\n\nAqui é a Carol, da Velox Consig.\n\nConsultei sua margem e ela está positiva para consignado CLT.\n\nSe quiser, te envio agora as opções de parcela e o valor liberado.",

    "Olá, {nome}!\n\nCarol aqui, consultora da Velox Consig.\n\nTrabalho com crédito consignado CLT — parcelas descontadas na folha, sem consulta ao SPC para a maioria dos casos.\n\nPosso simular para você?",

    "Oi, {nome}!\n\nSou a Carol, da Velox Consig. 😊\n\nSeu nome apareceu na consulta com margem disponível para crédito consignado.\n\nQuer saber quanto e em quantas vezes?",

    "{nome}, olá!\n\nCarol falando, da Velox Consig.\n\nEstou entrando em contato sobre uma condição de crédito para quem tem carteira assinada: desconto direto na folha e parcela fixa até o fim.\n\nPosso te mostrar os números?",

    "Olá, {nome}! Tudo bem com você? 😊\n\nAqui é a Carol, da Velox Consig.\n\nVocê tem margem liberada para consignado CLT neste momento. Essa liberação pode mudar de um mês para o outro.\n\nQuer aproveitar e ver a simulação?",

    "Oi, {nome}!\n\nCarol, da Velox Consig.\n\nFaço a parte de crédito consignado para trabalhador CLT. É o tipo de crédito com uma das menores taxas do mercado, justamente porque desconta em folha.\n\nPosso conferir quanto está disponível para você?",

    "{nome}, tudo bem? 👋\n\nMe chamo Carol e sou da Velox Consig.\n\nIdentifiquei margem disponível no seu CPF para contratação de crédito consignado.\n\nTe envio a simulação?",

    "Olá, {nome}!\n\nCarol, da Velox Consig, tudo bem?\n\nSe precisar organizar as contas, quitar uma dívida cara ou tirar um projeto do papel, o consignado CLT costuma ser a saída mais barata.\n\nPosso ver quanto você tem disponível?",

    "Oi, {nome}! 😊\n\nAqui é a Carol, da Velox Consig.\n\nSua margem para crédito consignado está ativa. O desconto vem na folha, então é uma parcela só, no dia certo, sem boleto.\n\nQuer ver os valores?",

    "{nome}, bom te falar! 😊\n\nCarol, da Velox Consig.\n\nVocê aparece elegível para crédito consignado CLT. Consigo verificar o valor liberado e as opções de prazo em poucos minutos.\n\nPosso seguir?",

    "Olá, {nome}!\n\nSou a Carol, da Velox Consig.\n\nEstou entrando em contato porque nossa consulta apontou margem disponível no seu nome para crédito com desconto em folha.\n\nQuer receber a simulação por aqui mesmo?",

    "Oi, {nome}! Tudo bem?\n\nCarol, consultora da Velox Consig. 👋\n\nO consignado CLT permite parcelas menores e prazos mais longos que o empréstimo pessoal comum.\n\nPosso simular com base na sua margem?",

    "{nome}, oi!\n\nAqui é a Carol, da Velox Consig.\n\nTenho uma condição de crédito consignado disponível para o seu perfil, com desconto direto na folha de pagamento.\n\nQuer que eu detalhe os valores?",

    "Olá, {nome}! 😊\n\nCarol falando, da Velox Consig.\n\nVi que você tem saldo de margem para consignado. Muita gente usa para trocar dívida cara por uma parcela menor.\n\nPosso te mostrar como ficaria?",

    "Oi, {nome}!\n\nMe chamo Carol e trabalho na Velox Consig.\n\nSua margem para crédito consignado CLT está liberada para contratação.\n\nSe tiver interesse, faço a simulação agora e te mando aqui.",

    "{nome}, tudo bem? 😊\n\nCarol, da Velox Consig.\n\nVocê tem direito a crédito consignado por ser CLT — parcela descontada em folha e taxa bem abaixo das linhas comuns.\n\nQuer ver quanto está disponível no seu caso?",

    "Olá, {nome}! 👋\n\nAqui é a Carol, da Velox Consig.\n\nEstou passando para te avisar da margem liberada no seu CPF para crédito consignado.\n\nPosso enviar a simulação sem compromisso nenhum?",

    "Oi, {nome}!\n\nCarol, da Velox Consig, tudo certo?\n\nO crédito consignado CLT tem uma vantagem simples: como desconta na folha, o banco cobra menos juros.\n\nQuer que eu veja o seu valor disponível?",

    "{nome}, olá! Tudo bem? 😊\n\nSou a Carol, da Velox Consig.\n\nFiz a consulta da sua margem e ela está positiva. Dá para simular valores e prazos agora mesmo.\n\nPosso te enviar?",

    "Olá, {nome}!\n\nCarol aqui, da Velox Consig.\n\nAtendo trabalhadores CLT com crédito consignado — o que desconta direto no salário, com parcela fixa.\n\nPosso conferir a sua margem e te passar os números?",

    "Oi, {nome}! 😊\n\nAqui quem fala é a Carol, da Velox Consig.\n\nVocê está entre os perfis com margem liberada para consignado neste mês.\n\nQuer aproveitar para ver quanto conseguiria liberar?",

    "{nome}, tudo bem?\n\nCarol, da Velox Consig. 👋\n\nSe você precisa de um valor com parcela que caiba no orçamento, o consignado CLT costuma resolver melhor que o cartão.\n\nPosso simular para você?",

    "Olá, {nome}!\n\nSou a Carol e represento a Velox Consig.\n\nNossa consulta indicou margem disponível no seu nome para crédito com desconto em folha.\n\nTe mando os valores e você decide com calma?",

    "Oi, {nome}! Tudo bem? 😊\n\nCarol, da Velox Consig.\n\nO consignado para CLT libera o dinheiro na conta e desconta as parcelas direto do salário — sem risco de atraso.\n\nQuer ver a sua simulação?",

    "{nome}, oi! 👋\n\nAqui é a Carol, da Velox Consig.\n\nSua margem para crédito consignado está disponível para uso.\n\nPosso levantar as melhores condições e te apresentar por aqui?",

    "Olá, {nome}!\n\nCarol falando, da Velox Consig.\n\nTrabalho com crédito consignado CLT e vi que você tem saldo de margem para contratar.\n\nQuer que eu prepare uma simulação com os prazos disponíveis?",

    "Oi, {nome}, tudo bem? 😊\n\nMe chamo Carol, da Velox Consig.\n\nEstou entrando em contato para te apresentar uma opção de crédito com desconto em folha, liberada para o seu perfil.\n\nPosso continuar?",

    "{nome}, tudo certo?\n\nCarol, da Velox Consig, por aqui.\n\nSua margem de consignado está livre. Isso quer dizer que você pode contratar sem comprometer o restante do salário além do limite legal.\n\nQuer ver quanto dá?",

    "Olá, {nome}! 😊\n\nAqui é a Carol, da Velox Consig.\n\nConsegui verificar sua margem para crédito consignado CLT e ela está disponível.\n\nPosso te mandar o valor liberado e as opções de parcela?",

    "Oi, {nome}!\n\nCarol, consultora da Velox Consig. 👋\n\nSe estiver precisando de um dinheiro com parcela leve, vale olhar o consignado: desconto em folha e uma das menores taxas.\n\nSimulo para você?",

    "{nome}, olá!\n\nSou a Carol, da Velox Consig.\n\nSeu CPF apareceu na consulta com margem liberada para contratação de crédito consignado.\n\nQuer receber a simulação agora?",

    "Olá, {nome}! Tudo bem? 😊\n\nCarol, da Velox Consig.\n\nO crédito consignado CLT não pesa como as linhas comuns porque a parcela sai direto da folha. Muita gente usa para quitar o cartão.\n\nPosso ver o seu caso?",

    "Oi, {nome}! 👋\n\nAqui é a Carol, da Velox Consig.\n\nVocê tem margem disponível para crédito consignado neste momento.\n\nSe quiser, faço a consulta completa e te apresento as condições. Pode ser?",

    "{nome}, tudo bem? 😊\n\nCarol falando, da Velox Consig.\n\nTenho como verificar quanto você consegue liberar em consignado CLT, com as parcelas descontadas em folha.\n\nQuer que eu faça essa consulta?",

    "Olá, {nome}!\n\nMe chamo Carol e falo em nome da Velox Consig.\n\nIdentificamos margem ativa no seu nome para crédito consignado de trabalhador CLT.\n\nPosso te enviar os valores disponíveis?",

    "Oi, {nome}! Tudo bem com você? 😊\n\nCarol, da Velox Consig.\n\nEstou com uma consulta de margem liberada em seu nome para crédito com desconto em folha.\n\nQuer ver as opções antes que as condições mudem?"

];


// Chave do rodízio: guarda a próxima posição da lista a ser usada.
const CHAVE_RODIZIO_MENSAGEM = "rodizio_mensagem_inicial";


// Cada cliente fica com a mensagem que já recebeu — reabrir a conversa não
// troca o texto. Um cliente novo pega a próxima da fila, então a lista inteira
// é percorrida antes de qualquer repetição.
function indiceMensagemInicial(id){

    const chaveCliente = "mensagem_inicial_" + id;

    const guardado = Number(localStorage.getItem(chaveCliente));

    if(
        localStorage.getItem(chaveCliente) !== null &&
        guardado >= 0 &&
        guardado < MENSAGENS_INICIAIS.length
    ){
        return guardado;
    }

    const atual = Number(localStorage.getItem(CHAVE_RODIZIO_MENSAGEM) || 0) %
        MENSAGENS_INICIAIS.length;

    localStorage.setItem(
        CHAVE_RODIZIO_MENSAGEM,
        String((atual + 1) % MENSAGENS_INICIAIS.length)
    );

    localStorage.setItem(chaveCliente, String(atual));

    return atual;

}


function mensagemInicial(primeiroNome, id){

    const modelo = MENSAGENS_INICIAIS[indiceMensagemInicial(id)];

    return modelo.replace(/\{nome\}/g, primeiroNome);

}
