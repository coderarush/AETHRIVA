import test from 'node:test';
import assert from 'node:assert/strict';
import {deviceCatalog, searchCatalog} from '../dist/connections/catalog.js';
import {createBluetoothController, parseHeartRateMeasurement, parseBloodPressureMeasurement, parsePulseOximeterMeasurement, decodeSFloat} from '../dist/connections/bluetooth.js';

const at = '2026-10-31T03:00:00.000Z';
const packet = (...bytes) => new DataView(Uint8Array.from(bytes).buffer);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};

// Hardware is the external boundary. The controller and decoder remain real.
function hardware({start, serviceError, requestError, connection, profile = 'heart_rate', characteristicIds = ['heart_rate_measurement']} = {}) {
  const listeners = new Map();
  const characteristic = new EventTarget();
  characteristic.startNotifications = () => start?.promise ?? Promise.resolve(characteristic);
  characteristic.stopNotifications = () => Promise.resolve(characteristic);
  characteristic.send = value => {
    characteristic.value = value;
    characteristic.dispatchEvent(new Event('characteristicvaluechanged'));
  };
  const device = new EventTarget();
  device.id = 'device-1';
  device.name = 'Actual monitor';
  for (const target of [device, characteristic]) {
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    target.addEventListener = (type, listener) => { listeners.set(listener, {target, type}); add(type, listener); };
    target.removeEventListener = (type, listener) => { listeners.delete(listener); remove(type, listener); };
  }
  const server = {
    connected: false,
    async connect() { await connection?.promise; server.connected = true; return server; },
    disconnect() { server.connected = false; device.dispatchEvent(new Event('gattserverdisconnected')); },
    async getPrimaryService(name) {
      if (name !== profile) throw new DOMException('No such service', 'NotFoundError');
      if (serviceError) throw serviceError;
      return {async getCharacteristic(name) {
        if (!characteristicIds.includes(name)) throw new DOMException('No such characteristic', 'NotFoundError');
        return characteristic;
      }};
    },
  };
  device.gatt = server;
  const requests = [];
  const bluetooth = {requestDevice(options) {
    requests.push(options);
    return requestError ? Promise.reject(requestError) : Promise.resolve(device);
  }};
  return {bluetooth, device, server, characteristic, requests, listeners};
}

test('catalog finds EKG by its ECG alias and filters exact categories', () => {
  assert(searchCatalog('EKG').some(entry => entry.id === 'alivecor-kardiamobile-6l'));
  assert(searchCatalog('polar h10').some(entry => entry.id === 'polar-h10-ecg'));
  assert(searchCatalog('blood pressure', {category: 'blood-pressure'}).length > 0);
  assert(searchCatalog('blood pressure', {category: 'ecg'}).every(entry => entry.category === 'ecg'));
  assert.equal(searchCatalog('unlisted-device-xyz').length, 0);
  assert.equal(new Set(deviceCatalog.map(entry => entry.id)).size, deviceCatalog.length);
  assert(deviceCatalog.filter(entry => entry.category === 'ecg').every(entry => !entry.canConnect));
});

test('heart-rate decoder handles 8-bit and 16-bit values and actual RR units', () => {
  const basic = parseHeartRateMeasurement(packet(0x00, 72), at);
  assert.equal(basic.bpm, 72);
  assert.equal(basic.timestamp, at);
  assert.equal(basic.contactDetected, null);
  assert.deepEqual(basic.rrIntervalsSeconds, []);
  const extended = parseHeartRateMeasurement(packet(0x1f, 0x2c, 0x01, 0x14, 0x00, 0x00, 0x04, 0x00, 0x02), at);
  assert.equal(extended.bpm, 300);
  assert.equal(extended.contactDetected, true);
  assert.equal(extended.energyExpendedKJ, 20);
  assert.deepEqual(extended.rrIntervalsSeconds, [1, 0.5]);
  assert.equal(parseHeartRateMeasurement(packet(0x04, 65), at).contactDetected, false);
});

test('decoder rejects truncated, inconsistent and reserved fields', () => {
  for (const bytes of [[], [0], [1, 72], [8, 72, 1], [16, 72], [16, 72, 1], [0, 72, 1], [32, 72], [2, 72]]) {
    assert.throws(() => parseHeartRateMeasurement(packet(...bytes), at), /measurement/i, JSON.stringify(bytes));
  }
});

test('chooser is invoked synchronously and connection waits for notification readiness', async () => {
  const start = deferred();
  const hw = hardware({start});
  const controller = createBluetoothController({bluetooth: hw.bluetooth, now: () => at});
  const connecting = controller.connect('standard-heart-rate');
  assert.equal(hw.requests.length, 1);
  assert.deepEqual(hw.requests[0], {filters: [{services: ['heart_rate']}], optionalServices: ['battery_service', 'device_information']});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(controller.getSnapshot().status, 'connecting');
  assert.equal(controller.getSnapshot().connected, false);
  assert.equal(controller.getSnapshot().samples.length, 0);
  start.resolve();
  await connecting;
  assert.equal(controller.getSnapshot().status, 'waiting');
  assert.equal(controller.getSnapshot().latestSample, null);
  hw.characteristic.send(packet(0, 73));
  assert.equal(controller.getSnapshot().status, 'receiving');
  assert.equal(controller.getSnapshot().latestSample.bpm, 73);
  assert.equal(controller.getSnapshot().latestSample.kind, 'heart_rate');
  assert.equal(controller.getSnapshot().device.name, 'Actual monitor');
  controller.disconnect();
});

test('only valid notifications enter a bounded session buffer and snapshots are isolated', async () => {
  const hw = hardware();
  const controller = createBluetoothController({bluetooth: hw.bluetooth, maxSamples: 2, now: () => at});
  await controller.connect();
  for (const bpm of [70, 71, 72]) hw.characteristic.send(packet(0, bpm));
  hw.characteristic.send(packet(1, 9));
  const snapshot = controller.getSnapshot();
  assert.deepEqual(snapshot.samples.map(sample => sample.bpm), [71, 72]);
  assert.equal(snapshot.totalSamples, 3);
  assert.equal(snapshot.invalidPacketCount, 1);
  assert.equal(snapshot.latestSample.bpm, 72);
  snapshot.samples[0].bpm = 999;
  snapshot.latestSample.bpm = 999;
  assert.equal(controller.getSnapshot().latestSample.bpm, 72);
  assert.equal(controller.getSnapshot().samples[0].bpm, 71);
  controller.disconnect();
  hw.characteristic.send(packet(0, 90));
  assert.equal(controller.getSnapshot().totalSamples, 3);
  assert.equal(controller.getSnapshot().status, 'disconnected');
  assert.equal(hw.listeners.size, 0);
  assert.equal(hw.server.connected, false);
});

test('unsupported environments and catalog-only ECG entries never open a chooser', async () => {
  const unsupported = createBluetoothController({bluetooth: null});
  assert.equal((await unsupported.connect()).status, 'unsupported');
  const hw = hardware();
  const insecure = createBluetoothController({bluetooth: hw.bluetooth, secureContext: false});
  assert.equal((await insecure.connect()).status, 'unsupported');
  const controller = createBluetoothController({bluetooth: hw.bluetooth});
  assert.equal((await controller.connect(deviceCatalog.find(entry => entry.id === 'alivecor-kardiamobile-6l'))).errorCode, 'integration_required');
  assert.equal(hw.requests.length, 0);
  assert.equal((await controller.connect({catalogId: 'unknown'})).errorCode, 'unknown_device');
});

test('chooser cancellation and permissions errors leave no fake device or measurements', async () => {
  for (const [name, expected] of [['NotFoundError', 'cancelled'], ['NotAllowedError', 'permission_denied'], ['SecurityError', 'permission_denied']]) {
    const hw = hardware({requestError: new DOMException('Picker failure', name)});
    const controller = createBluetoothController({bluetooth: hw.bluetooth});
    const snapshot = await controller.connect();
    assert.equal(snapshot.errorCode, expected);
    assert.equal(snapshot.connected, false);
    assert.equal(snapshot.device, null);
    assert.deepEqual(snapshot.samples, []);
  }
});

test('service and notification failures disconnect and remove all listeners', async () => {
  for (const kind of ['service', 'notifications']) {
    const start = kind === 'notifications' ? deferred() : null;
    const hw = hardware({serviceError: kind === 'service' ? new Error('Service unavailable') : null, start});
    const controller = createBluetoothController({bluetooth: hw.bluetooth});
    const connecting = controller.connect();
    if (start) start.reject(new Error('Notifications unavailable'));
    assert.equal((await connecting).status, 'error');
    assert.equal(controller.getSnapshot().connected, false);
    assert.equal(hw.server.connected, false);
    assert.equal(hw.listeners.size, 0);
  }
});

test('physical disconnect removes subscriptions and stops accepting old packets', async () => {
  const hw = hardware();
  const updates = [];
  const controller = createBluetoothController({bluetooth: hw.bluetooth, onChange: value => updates.push(value.status)});
  await controller.connect();
  hw.characteristic.send(packet(0, 88));
  hw.server.disconnect();
  hw.characteristic.send(packet(0, 99));
  assert.equal(controller.getSnapshot().status, 'disconnected');
  assert.equal(controller.getSnapshot().latestSample.bpm, 88);
  assert.equal(controller.getSnapshot().totalSamples, 1);
  assert.equal(hw.listeners.size, 0);
  assert.deepEqual(updates, ['connecting', 'waiting', 'receiving', 'disconnected']);
});

test('disconnect while GATT connects cannot resurrect a cancelled session', async () => {
  const connection = deferred();
  const hw = hardware({connection});
  const controller = createBluetoothController({bluetooth: hw.bluetooth});
  const connecting = controller.connect();
  await new Promise(resolve => setImmediate(resolve));
  controller.disconnect();
  connection.resolve();
  await connecting;
  assert.equal(controller.getSnapshot().status, 'disconnected');
  assert.equal(hw.server.connected, false);
  assert.equal(hw.listeners.size, 0);
});

test('medical SFLOAT preserves signed exponents and maps all special values to unavailable', () => {
  assert.equal(decodeSFloat(0xf0a0), 16);
  assert.equal(decodeSFloat(0x0000), 0);
  assert.equal(decodeSFloat(0x0fff), -1);
  for (const raw of [0x07fe, 0x07ff, 0x0800, 0x0801, 0x0802]) assert.equal(decodeSFloat(raw), null);
});

test('blood-pressure decoder preserves units, optional fields and missing measurements', () => {
  const basic = parseBloodPressureMeasurement(packet(0, 120, 0, 80, 0, 93, 0), at);
  assert.deepEqual([basic.kind, basic.systolic, basic.diastolic, basic.meanPressure, basic.unit], ['blood_pressure', 120, 80, 93, 'mmHg']);
  const metric = parseBloodPressureMeasurement(packet(1, 160, 240, 107, 240, 125, 240), at);
  assert.deepEqual([metric.systolic, metric.diastolic, metric.meanPressure, metric.unit], [16, 10.700000000000001, 12.5, 'kPa']);
  const optional = parseBloodPressureMeasurement(packet(30, 120, 0, 80, 0, 93, 0, 234, 7, 10, 31, 3, 4, 5, 70, 0, 2, 1, 0), at);
  assert.equal(optional.pulseRate, 70);
  assert.equal(optional.userId, 2);
  assert.equal(optional.measurementStatus, 1);
  assert.equal(optional.deviceTimestamp, '2026-10-31T03:04:05');
  const missing = parseBloodPressureMeasurement(packet(0, 255, 7, 254, 7, 0, 8), at);
  assert.deepEqual([missing.systolic, missing.diastolic, missing.meanPressure], [null, null, null]);
  for (const bytes of [[0, 1], [2, 120, 0, 80, 0, 93, 0], [4, 120, 0, 80, 0, 93, 0, 70], [32, 120, 0, 80, 0, 93, 0]]) {
    assert.throws(() => parseBloodPressureMeasurement(packet(...bytes), at), /measurement/i);
  }
});

test('pulse-oximeter decoder handles spot-check and continuous optional fields without substituting missing values', () => {
  const spot = parsePulseOximeterMeasurement(packet(0, 98, 0, 75, 0), at, 'spot-check');
  assert.deepEqual([spot.kind, spot.spo2, spot.pulseRate, spot.mode], ['pulse_oximeter', 98, 75, 'spot-check']);
  const continuous = parsePulseOximeterMeasurement(packet(31, 98, 0, 60, 0, 97, 0, 61, 0, 96, 0, 59, 0, 32, 0, 4, 0, 0, 25, 240), at, 'continuous');
  assert.deepEqual(continuous.fast, {spo2: 97, pulseRate: 61});
  assert.deepEqual(continuous.slow, {spo2: 96, pulseRate: 59});
  assert.equal(continuous.measurementStatus, 32);
  assert.equal(continuous.deviceSensorStatus, 4);
  assert.equal(continuous.pulseAmplitudeIndex, 2.5);
  const missing = parsePulseOximeterMeasurement(packet(0, 255, 7, 2, 8), at);
  assert.equal(missing.spo2, null);
  assert.equal(missing.pulseRate, null);
  for (const [bytes, mode] of [[[0, 98], 'spot-check'], [[1, 98, 0, 60, 0], 'spot-check'], [[1, 98, 0, 60, 0], 'continuous'], [[32, 98, 0, 60, 0], 'continuous']]) {
    assert.throws(() => parsePulseOximeterMeasurement(packet(...bytes), at, mode), /measurement/i);
  }
});

test('general chooser filters supported services as alternatives and receives real blood-pressure indications', async () => {
  const hw = hardware({profile: 'blood_pressure', characteristicIds: ['blood_pressure_measurement']});
  const controller = createBluetoothController({bluetooth: hw.bluetooth, now: () => at});
  await controller.connect();
  assert.deepEqual(hw.requests[0].filters, [
    {services: ['heart_rate']}, {services: ['blood_pressure']}, {services: ['pulse_oximeter']},
  ]);
  assert.equal(controller.getSnapshot().profile, 'blood_pressure');
  hw.characteristic.send(packet(0, 123, 0, 81, 0, 95, 0));
  assert.equal(controller.getSnapshot().latestSample.systolic, 123);
  assert.equal(controller.getSnapshot().latestSample.kind, 'blood_pressure');
  controller.disconnect();
});

test('selected pulse-oximeter profile accepts either standard characteristic and cleans up', async () => {
  for (const characteristicId of [0x2a5e, 0x2a5f]) {
    const hw = hardware({profile: 'pulse_oximeter', characteristicIds: [characteristicId]});
    const controller = createBluetoothController({bluetooth: hw.bluetooth, now: () => at});
    await controller.connect({profile: 'pulse_oximeter'});
    assert.deepEqual(hw.requests[0].filters, [{services: ['pulse_oximeter']}]);
    assert.equal(controller.getSnapshot().status, 'waiting');
    hw.characteristic.send(packet(0, 97, 0, 66, 0));
    assert.equal(controller.getSnapshot().latestSample.spo2, 97);
    assert.equal(controller.getSnapshot().latestSample.mode, characteristicId === 0x2a5e ? 'spot-check' : 'continuous');
    controller.disconnect();
    assert.equal(hw.listeners.size, 0);
  }
});

test('one-time pulse-ox reading arriving during subscription is retained but not published before readiness', async () => {
  const start = deferred();
  const hw = hardware({start, profile: 'pulse_oximeter', characteristicIds: [0x2a5e]});
  const controller = createBluetoothController({bluetooth: hw.bluetooth, now: () => at});
  const connecting = controller.connect({profile: 'pulse_oximeter'});
  await new Promise(resolve => setImmediate(resolve));
  hw.characteristic.send(packet(0, 96, 0, 74, 0));
  assert.equal(controller.getSnapshot().status, 'connecting');
  assert.equal(controller.getSnapshot().samples.length, 0);
  start.resolve();
  await connecting;
  assert.equal(controller.getSnapshot().status, 'receiving');
  assert.equal(controller.getSnapshot().latestSample.spo2, 96);
  assert.equal(controller.getSnapshot().latestSample.pulseRate, 74);
  controller.disconnect();
});

test('pulse-oximeter parser blocks demo, test, unavailable and invalid values in both measurement modes', () => {
  for (const [mode, flags] of [['spot-check', 2], ['continuous', 4]]) {
    for (const [status, reason] of [[0x0400, 'demonstration'], [0x0800, 'test'], [0x2000, 'unavailable'], [0x8000, 'invalid']]) {
      const sample = parsePulseOximeterMeasurement(packet(flags, 98, 0, 72, 0, status & 255, status >> 8), at, mode);
      assert.equal(sample.usable, false);
      assert.match(sample.rejectionReason, new RegExp(reason));
      assert.equal(sample.spo2, null);
      assert.equal(sample.pulseRate, null);
    }
  }
});

test('measurement and sensor quality flags remain readable alongside warning-only readings', () => {
  // Spot-check status: early estimate, calibrating, questionable; sensor: poor signal, no contact.
  const plx = parsePulseOximeterMeasurement(packet(6, 97, 0, 75, 0, 64, 80, 16, 8, 0), at);
  assert.equal(plx.usable, true);
  assert.equal(plx.spo2, 97);
  assert.match(plx.qualityWarnings.join(' '), /early estimate/i);
  assert.match(plx.qualityWarnings.join(' '), /calibrat/i);
  assert.match(plx.qualityWarnings.join(' '), /questionable/i);
  assert.match(plx.qualityWarnings.join(' '), /poor signal/i);
  assert.match(plx.qualityWarnings.join(' '), /not in contact/i);
  const bp = parseBloodPressureMeasurement(packet(16, 120, 0, 80, 0, 93, 0, 35, 0), at);
  assert.equal(bp.usable, true);
  assert.match(bp.qualityWarnings.join(' '), /movement/i);
  assert.match(bp.qualityWarnings.join(' '), /cuff.*loose/i);
  assert.match(bp.qualityWarnings.join(' '), /position/i);
});

test('rejected pulse-oximeter packets never enter history or refresh the last accepted reading', async () => {
  let clock = at;
  const hw = hardware({profile: 'pulse_oximeter', characteristicIds: [0x2a5e]});
  const controller = createBluetoothController({bluetooth: hw.bluetooth, now: () => clock});
  await controller.connect({profile: 'pulse_oximeter'});
  hw.characteristic.send(packet(2, 98, 0, 72, 0, 0, 4));
  assert.equal(controller.getSnapshot().latestSample, null);
  assert.equal(controller.getSnapshot().totalSamples, 0);
  hw.characteristic.send(packet(0, 96, 0, 74, 0));
  clock = '2026-10-31T03:01:00.000Z';
  for (const status of [0x0400, 0x0800, 0x2000, 0x8000]) {
    hw.characteristic.send(packet(2, 99, 0, 90, 0, status & 255, status >> 8));
    const snapshot = controller.getSnapshot();
    assert.equal(snapshot.status, 'waiting');
    assert.equal(snapshot.latestSampleStale, true);
    assert.equal(snapshot.latestSample.spo2, 96);
    assert.equal(snapshot.latestSample.timestamp, at);
    assert.equal(snapshot.totalSamples, 1);
    assert.equal(snapshot.samples.length, 1);
    assert.match(snapshot.message, /ignored|unavailable|invalid/i);
  }
  assert.equal(controller.getSnapshot().rejectedPacketCount, 5);
  hw.characteristic.send(packet(0, 97, 0, 75, 0));
  assert.equal(controller.getSnapshot().latestSampleStale, false);
  assert.equal(controller.getSnapshot().latestSample.timestamp, clock);
  assert.equal(controller.getSnapshot().totalSamples, 2);
  controller.disconnect();
});

test('unavailable numeric packets wait without fabricating a new observation', async () => {
  const hw = hardware({profile: 'blood_pressure', characteristicIds: ['blood_pressure_measurement']});
  const controller = createBluetoothController({bluetooth: hw.bluetooth});
  await controller.connect({profile: 'blood_pressure'});
  hw.characteristic.send(packet(0, 255, 7, 255, 7, 255, 7));
  assert.equal(controller.getSnapshot().latestSample, null);
  assert.equal(controller.getSnapshot().status, 'waiting');
  assert.equal(controller.getSnapshot().totalSamples, 0);
  assert.match(controller.getSnapshot().message, /unavailable/i);
  controller.disconnect();
});

test('quality warnings reach controller messages and snapshots without sharing mutable arrays', async () => {
  const hw = hardware({profile: 'blood_pressure', characteristicIds: ['blood_pressure_measurement']});
  const controller = createBluetoothController({bluetooth: hw.bluetooth});
  await controller.connect({profile: 'blood_pressure'});
  hw.characteristic.send(packet(16, 120, 0, 80, 0, 93, 0, 3, 0));
  const snapshot = controller.getSnapshot();
  assert.match(snapshot.message, /movement/i);
  assert.match(snapshot.message, /cuff/i);
  snapshot.latestSample.qualityWarnings.length = 0;
  assert.equal(controller.getSnapshot().latestSample.qualityWarnings.length, 2);
  controller.disconnect();
});

test('a bad final packet during subscription leaves the earlier accepted reading marked stale', async () => {
  const start = deferred();
  const hw = hardware({start});
  const controller = createBluetoothController({bluetooth: hw.bluetooth, now: () => at});
  const connecting = controller.connect('standard-heart-rate');
  await new Promise(resolve => setImmediate(resolve));
  hw.characteristic.send(packet(0, 70));
  hw.characteristic.send(packet(1, 70));
  start.resolve();
  await connecting;
  assert.equal(controller.getSnapshot().latestSample.bpm, 70);
  assert.equal(controller.getSnapshot().latestSample.timestamp, at);
  assert.equal(controller.getSnapshot().latestSampleStale, true);
  assert.equal(controller.getSnapshot().status, 'waiting');
  assert.equal(controller.getSnapshot().invalidPacketCount, 1);
  controller.disconnect();
});
