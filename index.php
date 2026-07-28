<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Velox Consig">
<meta name="theme-color" content="#000000">

<title>VeloxConsig CRM Mobile</title>

<link rel="icon" type="image/jpeg" href="https://i.ibb.co/bM4HXvHD/Logo-VC.jpg">
<link rel="apple-touch-icon" href="https://i.ibb.co/bM4HXvHD/Logo-VC.jpg">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link rel="stylesheet"

href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

<link rel="stylesheet" href="assets/css/style.css">

<!-- Trava de acesso: precisa rodar antes de qualquer renderização.
     Para desativar o login, basta remover estas duas tags. -->
<script src="assets/js/auth.js"></script>
<script>exigirAutenticacao();</script>
</head>

<body>

<header>

<img
    src="https://i.ibb.co/bM4HXvHD/Logo-VC.jpg"
    alt="VeloxConsig CRM"
    style="width:170px; max-width:90%; height:auto;"
    loading="eager">

<button type="button" class="btnSair" onclick="sair()" aria-label="Sair da conta">
    <i class="bi bi-box-arrow-right"></i>
</button>

<div id="usuarioLogado" class="usuarioLogado"></div>

</header>

<div class="container-fluid">


<div class="dashboard">

<div class="cardDash" onclick="aplicarFiltro('todos')" id="dashTodos">
<h2 id="total">0</h2>
<span>Total</span>
</div>

<div class="cardDash" onclick="aplicarFiltro('pendentes')" id="dashPendentes">
<h2 id="consultados">0</h2>
<span>Consultados</span>
</div>

<div class="cardDash" onclick="aplicarFiltro('com')" id="dashCom">
<h2 id="comMargem">0</h2>
<span>Com Margem</span>
</div>

<div class="cardDash" onclick="aplicarFiltro('sem')" id="dashSem">
<h2 id="semMargem">0</h2>
<span>Sem Margem</span>
</div>

<div class="cardDash" onclick="aplicarFiltro('aguardando')" id="dashAguardando">
<h2 id="aguardandoResposta">0</h2>
<span>Aguardando resposta</span>
</div>

</div>

<div class="importar">

<button
type="button"
class="btnImportar"
onclick="document.getElementById('arquivo').click()">

<i class="bi bi-upload"></i>

Importar

</button>

<input
id="arquivo"
type="file"
accept=".xlsx,.xls,.csv">    
	<button class="btnExportar" onclick="exportarPlanilha()">

        <i class="bi bi-download"></i>

        Exportar

    </button>
</div>
<div class="pesquisa">

    <i class="bi bi-search"></i>

    <input
        type="search"
        id="campoPesquisa"
        placeholder="Pesquisar nome, CPF ou telefone..."
        autocomplete="off">

    <button
        type="button"
        id="limparPesquisa"
        onclick="limparPesquisa()"
        aria-label="Limpar pesquisa">

        <i class="bi bi-x-lg"></i>

    </button>

</div>
<div id="clientes">

<!-- cards -->

</div>

</div>

<footer>

VeloxConsig CRM Mobile

</footer>

<script src="assets/js/app.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<div class="modal fade" id="modalProposta" tabindex="-1" aria-hidden="true">
 <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
  <div class="modal-content modalPropostaConteudo">
   <div class="modal-header"><h5 class="modal-title">✨ Montar proposta</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
   <div class="modal-body">
    <div id="clienteProposta" class="clienteProposta"></div>
    <div class="cabecalhoTelegram">
    <label class="form-label fw-bold mb-0">Resposta do Telegram</label>
    <button type="button" class="btnLimparProposta" onclick="limparTratador()">Limpar</button>
</div>
    <textarea id="textoTelegram" class="form-control campoProposta" rows="9" placeholder="Toque aqui para colar a resposta do Telegram..." onclick="colarTelegramAutomaticamente()" onfocus="colarTelegramAutomaticamente()"></textarea>
    <button class="btnGerarProposta" onclick="gerarProposta()">✨ Gerar proposta</button>
    <div id="avisoProposta" class="avisoProposta"></div>
    <label class="form-label fw-bold mt-3">Mensagem para o cliente</label>
    <textarea id="mensagemProposta" class="form-control campoProposta" rows="9"></textarea>
   </div>
   <div class="modal-footer modalPropostaAcoes">
    <button class="btnCopiarProposta" onclick="copiarProposta()">Copiar</button>
    <button class="btnEnviarProposta" onclick="enviarPropostaWhatsApp()"><i class="bi bi-whatsapp"></i> Enviar no WhatsApp</button>
   </div>
  </div>
 </div>
</div>

</body>
</html>
