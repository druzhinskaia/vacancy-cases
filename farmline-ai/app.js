(() => {
  const order = {
    number: 'ФЛ-1042',
    item: 'ФМ-018',
    quantity: 100,
    batch: 'КХ-2705'
  };
  const fields = [
    ['number', 'Заказ'],
    ['item', 'Артикул'],
    ['quantity', 'Количество, уп.'],
    ['batch', 'Серия']
  ];
  const samples = {
    partial: {
      document: { ...order, quantity: 95 },
      note: 'Количество в документе меньше, чем в заказе.',
      action: 'Уточнить у закупок, согласована ли частичная поставка, и сверить количество при приёмке.'
    },
    scan: {
      document: { ...order, batch: null },
      note: 'Номер серии в скане не читается.',
      action: 'Запросить читаемую копию и сверить серию с заказом.'
    },
    match: {
      document: { ...order },
      note: 'Все четыре поля совпали.',
      action: 'Передать документ на стандартное подтверждение приёмки.'
    }
  };

  const result = document.querySelector('#demo-result');
  const note = result.querySelector('.result-note');
  const rows = [...result.querySelectorAll('tbody tr')];
  const next = result.querySelector('.next-step');

  function showSample(sample) {
    const requiresReview = fields.some(([key]) => sample.document[key] !== order[key]);
    note.classList.toggle('matched', !requiresReview);
    note.querySelector('strong').textContent = requiresReview ? 'Требуется проверка.' : 'Поля совпали.';
    note.lastChild.textContent = ` ${sample.note}`;
    next.lastChild.textContent = ` ${sample.action}`;

    fields.forEach(([key], index) => {
      const value = sample.document[key];
      rows[index].classList.toggle('flagged', value !== order[key]);
      rows[index].cells[1].textContent = value ?? 'Не читается';
    });
  }

  document.querySelectorAll('input[name="sample"]').forEach(option => {
    option.addEventListener('change', () => showSample(samples[option.value]));
  });
  showSample(samples[document.querySelector('input[name="sample"]:checked').value]);
})();
