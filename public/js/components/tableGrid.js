import { createTableCard } from './tableCard.js';

/**
 * Gestor del Grid de Mesas y Resumen en Header (RF-01, RF-02)
 */
export class TableGrid {
  constructor(containerElement, onSelectTable) {
    this.container = containerElement;
    this.onSelectTable = onSelectTable;

    this.countLibre = document.getElementById('count-libre');
    this.countOcupada = document.getElementById('count-ocupada');
    this.countCuenta = document.getElementById('count-cuenta');
    this.countTotal = document.getElementById('count-total');
  }

  /**
   * Renderiza las tarjetas en el contenedor y actualiza contadores
   */
  render(mesas, activeFilter = 'TODAS') {
    if (!this.container) return;

    // Actualizar contadores del encabezado
    let libres = 0;
    let ocupadas = 0;
    let cuentas = 0;
    let reservadas = 0;

    mesas.forEach((m) => {
      if (m.estado === 'LIBRE') libres++;
      else if (m.estado === 'OCUPADA') ocupadas++;
      else if (m.estado === 'CUENTA_PEDIDA') cuentas++;
      else if (m.estado === 'RESERVADA') reservadas++;
    });

    if (this.countLibre) this.countLibre.textContent = libres;
    if (this.countOcupada) this.countOcupada.textContent = ocupadas;
    if (this.countCuenta) this.countCuenta.textContent = cuentas;
    if (this.countTotal) this.countTotal.textContent = mesas.length;

    // Filtrar mesas si se aplica un filtro
    const mesasFiltradas = activeFilter === 'TODAS'
      ? mesas
      : mesas.filter((m) => m.estado === activeFilter);

    // Reconstruir grid de forma limpia
    this.container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    mesasFiltradas.forEach((mesa) => {
      const card = createTableCard(mesa, this.onSelectTable);
      fragment.appendChild(card);
    });

    this.container.appendChild(fragment);
  }
}
