import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_LANDING_PLANS, emptyLandingPlan, landingPlansErrors, landingPlansPayload, type LandingPlans } from './landing-plans.ts';

const plans = (): LandingPlans => structuredClone(DEFAULT_LANDING_PLANS);

test('the default plans are valid and there are three of them', () => {
  assert.equal(DEFAULT_LANDING_PLANS.plans.length, 3);
  assert.deepEqual(landingPlansErrors(plans()), []);
});

test('the payload trims text, drops blank feature lines and keeps an empty price as "contact us"', () => {
  const form = plans();
  form.contact_url = '  https://wa.me/201000000000 ';
  form.plans[0].name.ar = '  البداية ';
  form.plans[0].features.ar = ['', ' نطاق خاص ', '   '];
  form.plans[1].price = null;
  form.plans[2].price = 9999.6;

  const payload = landingPlansPayload(form);
  assert.equal(payload.contact_url, 'https://wa.me/201000000000');
  assert.equal(payload.plans[0].name.ar, 'البداية');
  assert.deepEqual(payload.plans[0].features.ar, ['نطاق خاص']);
  assert.equal(payload.plans[1].price, null);
  assert.equal(payload.plans[2].price, 10000);

  form.contact_url = '   ';
  assert.equal(landingPlansPayload(form).contact_url, null);
});

test('missing names, empty features, bad numbers and a non-https link are flagged', () => {
  const form = plans();
  form.contact_url = 'http://wa.me/20100';
  form.plans[0].name.en = ' ';
  form.plans[1].features.ar = ['', '  '];
  form.plans[1].price = -5;
  form.plans[2].max_students = 0;

  assert.deepEqual(landingPlansErrors(form).sort(), [
    'contact_url',
    'plans.0.name.en',
    'plans.1.features.ar',
    'plans.1.price',
    'plans.2.max_students',
  ]);
});

test('a new empty plan needs names and features before it can be saved', () => {
  const form: LandingPlans = { contact_url: null, plans: [emptyLandingPlan()] };
  assert.deepEqual(landingPlansErrors(form).sort(), ['plans.0.features.ar', 'plans.0.features.en', 'plans.0.name.ar', 'plans.0.name.en']);
  assert.deepEqual(landingPlansErrors({ contact_url: null, plans: [] }), ['plans']);
});
