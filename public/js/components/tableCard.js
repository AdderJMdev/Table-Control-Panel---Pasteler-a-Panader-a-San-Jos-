/**
 * Generador de Tarjeta Táctil de Mesa (RF-01, RF-02, RNF-01)
 */

const ESTADO_CLASS_MAP = {
  'LIBRE': 'estado-libre',
  'OCUPADA': 'estado-ocupada',
  'CUENTA_PEDIDA': 'estado-cuenta',
  'RESERVADA': 'estado-reservada'
};

const ESTADO_LABEL_MAP = {
  'LIBRE': 'Libre',
  'OCUPADA': 'Ocupada',
  'CUENTA_PEDIDA': 'Cuenta Pedida',
  'RESERVADA': 'Reservada'
};

/**
 * Calcula el tiempo relativo transcurrido desde la última actualización
 */
function formatElapsedTime(isoString) {
  if (!isoString) return '';
  const now = new Date();
  // Manejo de fecha local de SQLite
  const updated = new Date(isoString.replace(' ', 'T'));
  const diffMinutes = Math.floor((now - updated) / (1000 * 60));

  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const hours = Math.floor(diffMinutes / 60);
  const remainingMins = diffMinutes % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Formatea montos para consumo referencial (RF-07)
 */
function formatCurrency(amount) {
  if (!amount || Number(amount) <= 0) return null;
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Crea o actualiza un elemento de tarjeta de mesa en el DOM
 */
export function createTableCard(mesa, onSelect) {
  const card = document.createElement('div');
  const estadoClass = ESTADO_CLASS_MAP[mesa.estado] || 'estado-libre';
  const estadoLabel = ESTADO_LABEL_MAP[mesa.estado] || mesa.estado;
  const timeElapsed = mesa.estado !== 'LIBRE' ? formatElapsedTime(mesa.ultima_actualizacion) : '';
  const formattedConsumo = formatCurrency(mesa.consumo_estimado);

  card.className = `table-card ${estadoClass}`;
  card.setAttribute('data-id', mesa.id);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  card.innerHTML = `
    <div class="card-header">
      <span class="card-mesa-badge">Mesa ${mesa.numero}</span>
      ${timeElapsed ? `<span class="card-time-elapsed">⏱ ${timeElapsed}</span>` : ''}
    </div>
    <div class="card-center">
      <span class="card-number">${mesa.numero}</span>
    </div>
    <div class="card-footer">
      <span class="card-state-label">${estadoLabel}</span>
      ${formattedConsumo ? `<span class="card-consumo-badge">💵 ${formattedConsumo}</span>` : ''}
      ${mesa.notas ? `<span class="card-consumo-badge" style="font-size: 0.72rem; opacity: 0.9;" title="${mesa.notas}">📝 ${mesa.notas.slice(0, 15)}${mesa.notas.length > 15 ? '...' : ''}</span>` : ''}
    </div>
  `;

  // Evento táctil y de clic optimizado
  card.addEventListener('click', () => {
    if (typeof onSelect === 'function') {
      onSelect(mesa);
    }
  });

  return card;
}
