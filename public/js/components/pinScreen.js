/**
 * Pantalla de Bloqueo por PIN (Pantalla Táctil Touch-First)
 *
 * Teclado numérico grande (mínimo 60px) para entradas de 6 dígitos.
 * Usada para:
 *  - Desbloquear la app al iniciar (PIN de acceso o clave maestra).
 *  - Autorizar cambios administrativos con la clave maestra.
 */
export class PinScreen {
  constructor() {
    this.buffer = [];
    this.resolver = null;
    this.validate = null;
    this.checking = false;
    this.initElements();
    this.buildKeypad();
    this.bindEvents();
  }

  initElements() {
    this.screen = document.getElementById('pin-screen');
    this.dotsContainer = document.getElementById('pin-dots');
    this.errorEl = document.getElementById('pin-error');
    this.subtitleEl = document.getElementById('pin-subtitle');
    this.btnCancel = document.getElementById('pin-btn-cancel');
  }

  buildKeypad() {
    const keypad = document.getElementById('pin-keypad');
    if (!keypad) return;

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'confirmar'];
    keypad.innerHTML = '';

    keys.forEach((k) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pin-key touch-btn';
      btn.dataset.key = k;

      if (k === 'borrar') {
        btn.textContent = '⌫';
        btn.classList.add('pin-key-action');
      } else if (k === 'confirmar') {
        btn.textContent = '↵';
        btn.classList.add('pin-key-action');
      } else {
        btn.textContent = k;
      }

      btn.addEventListener('click', () => this.handleKey(k));
      keypad.appendChild(btn);
    });
  }

  bindEvents() {
    if (this.btnCancel) {
      this.btnCancel.addEventListener('click', () => this.cancel());
    }

    // Soporte de teclado físico para desarrollo/administración
    document.addEventListener('keydown', (e) => {
      if (!this.isVisible()) return;

      if (/^[0-9]$/.test(e.key)) {
        this.handleKey(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        this.handleKey('borrar');
      } else if (e.key === 'Enter') {
        this.submit();
      } else if (e.key === 'Escape') {
        if (!this.isBoot) this.cancel();
      }
    });
  }

  isVisible() {
    return !!(this.screen && this.screen.classList.contains('is-active'));
  }

  /**
   * Solicita un PIN y resuelve con el valor autorizado (o null si se cancela).
   * validate(pin) debe resolver true si el PIN es correcto.
   */
  requestPin({ subtitle, validate, cancellable = false }) {
    this.isBoot = !cancellable;
    this.validate = validate;
    this.buffer = [];
    this.checking = false;

    if (this.subtitleEl) {
      this.subtitleEl.textContent = subtitle || 'Ingrese su PIN de acceso';
    }
    this.setError('');
    this.renderDots();
    this.setKeysEnabled(true);

    if (this.btnCancel) {
      this.btnCancel.style.display = cancellable ? 'block' : 'none';
    }

    if (this.screen) {
      this.screen.classList.remove('is-error');
      this.screen.classList.add('is-active');
      this.screen.setAttribute('aria-hidden', 'false');
    }

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  close() {
    if (this.screen) {
      this.screen.classList.remove('is-active', 'is-error');
      this.screen.setAttribute('aria-hidden', 'true');
    }
  }

  cancel() {
    if (!this.resolver) return;
    this.close();
    this.resolver(null);
    this.resolver = null;
  }

  handleKey(key) {
    if (this.checking) return;

    if (key === 'borrar') {
      this.buffer.pop();
    } else if (key === 'confirmar') {
      this.submit();
      return;
    } else if (this.buffer.length < 6) {
      this.buffer.push(key);
    }

    this.setError('');
    this.screen?.classList.remove('is-error');
    this.renderDots();

    // Auto-enviar al completar los 6 dígitos
    if (this.buffer.length === 6) {
      setTimeout(() => this.submit(), 180);
    }
  }

  submit() {
    if (this.checking || this.buffer.length !== 6) return;

    const pin = this.buffer.join('');
    this.checking = true;
    this.setKeysEnabled(false);

    const validateFn = this.validate || (() => Promise.resolve(true));

    Promise.resolve(validateFn(pin))
      .then((ok) => {
        if (ok && this.resolver) {
          this.close();
          this.resolver(pin);
          this.resolver = null;
        } else {
          this.setError('PIN incorrecto. Inténtelo de nuevo.');
          this.screen?.classList.add('is-error');
          setTimeout(() => {
            this.buffer = [];
            this.setError('');
            this.screen?.classList.remove('is-error');
            this.renderDots();
            this.checking = false;
            this.setKeysEnabled(true);
          }, 700);
        }
      })
      .catch((err) => {
        this.setError(err?.message || 'No se pudo verificar. Inténtelo de nuevo.');
        this.screen?.classList.add('is-error');
        setTimeout(() => {
          this.buffer = [];
          this.setError('');
          this.screen?.classList.remove('is-error');
          this.renderDots();
          this.checking = false;
          this.setKeysEnabled(true);
        }, 900);
      });
  }

  renderDots() {
    if (!this.dotsContainer) return;
    this.dotsContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const dot = document.createElement('span');
      dot.className = 'pin-dot';
      if (i < this.buffer.length) {
        dot.classList.add('filled');
      }
      this.dotsContainer.appendChild(dot);
    }
  }

  setKeysEnabled(enabled) {
    document.querySelectorAll('.pin-key').forEach((btn) => {
      btn.disabled = !enabled;
    });
  }

  setError(message) {
    if (this.errorEl) {
      this.errorEl.textContent = message;
    }
  }
}

export const pinScreen = new PinScreen();