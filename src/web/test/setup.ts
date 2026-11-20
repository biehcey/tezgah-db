import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom `<dialog>`'un `showModal`/`close`'unu uygulamıyor; yalnızca `open` niteliğini ve `close` olayını taklit eder.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom Range'in yerleşim ölçülerini vermez; CodeMirror odaklı editörde kaydırırken bunları ister.
if (typeof Range !== 'undefined' && !('getClientRects' in Range.prototype)) {
  const empty = { length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] };
  Object.assign(Range.prototype, {
    getClientRects: () => empty,
    getBoundingClientRect: () => new DOMRect(),
  });
}

afterEach(() => {
  cleanup();
});
