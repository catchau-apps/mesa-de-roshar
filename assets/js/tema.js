/* Alternância de tema. O valor fica salvo; sem valor salvo, segue o sistema. */
(function () {
  'use strict';
  var CHAVE = 'mesa-roshar:tema';
  var raiz = document.documentElement;

  function aplicar(tema) {
    raiz.dataset.tema = tema;
    try { localStorage.setItem(CHAVE, tema); } catch (e) {}
    document.querySelectorAll('[data-tema-alternar]').forEach(function (b) {
      b.setAttribute('aria-label',
        tema === 'escuro' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro');
    });
  }

  document.addEventListener('click', function (ev) {
    var botao = ev.target.closest('[data-tema-alternar]');
    if (!botao) return;
    aplicar(raiz.dataset.tema === 'escuro' ? 'claro' : 'escuro');
  });

  // Enquanto o usuário não escolher, acompanha a preferência do sistema.
  try {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', function (ev) {
      if (!localStorage.getItem(CHAVE)) raiz.dataset.tema = ev.matches ? 'escuro' : 'claro';
    });
  } catch (e) {}

  aplicar(raiz.dataset.tema || 'claro');
})();
