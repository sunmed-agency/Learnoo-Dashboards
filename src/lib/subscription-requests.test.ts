import assert from 'node:assert/strict';
import test from 'node:test';
import { whatsappLink } from './subscription-requests.ts';

test('WhatsApp links add the Egyptian country code to local numbers only', () => {
  assert.equal(whatsappLink('01012345678'), 'https://wa.me/201012345678');
  assert.equal(whatsappLink('010 1234-5678'), 'https://wa.me/201012345678');
  assert.equal(whatsappLink('+201012345678'), 'https://wa.me/201012345678');
  assert.equal(whatsappLink('00966501234567'), 'https://wa.me/966501234567');
  assert.equal(whatsappLink('201012345678'), 'https://wa.me/201012345678');
});
