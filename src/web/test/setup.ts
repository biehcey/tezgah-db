import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

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
