import {deviceCatalog} from './catalog.js';

function binaryView(value) {
  if (value instanceof DataView) return value;
  if (value instanceof ArrayBuffer) return new DataView(value);
  if (ArrayBuffer.isView(value)) return new DataView(value.buffer, value.byteOffset, value.byteLength);
  throw new Error('Invalid measurement: expected binary data.');
}

// Quality flags are device reports, not a diagnosis. A "usable" sample can still have warnings.
// PLXS 1.0.1 §§3.1.1.4–5, tables 3.4–5; continuous measurements reuse these definitions:
// https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/PLXS_v1.0.1/out/en/index-en.html
// Blood Pressure Measurement status: GSS §3.34.3, table 3.55 (2026-09-09):
// https://btprodspecificationrefs.blob.core.windows.net/gatt-specification-supplement/GATT_Specification_Supplement.pdf
export function withMeasurementQuality(sample) {
  const warnings = [];
  let rejectionReason = null;
  if (sample.kind === 'heart_rate') {
    if (sample.contactDetected === false) warnings.push('The monitor reports poor sensor contact. Adjust its fit.');
  } else if (sample.kind === 'blood_pressure') {
    const status = sample.measurementStatus ?? 0;
    if (status & 1) warnings.push('The cuff detected body movement during this reading.');
    if (status & 2) warnings.push('The device reports that the cuff is too loose.');
    if (status & 4) warnings.push('The device detected an irregular pulse during this reading.');
    const range = (status >> 3) & 3;
    if (range === 1) warnings.push('Pulse rate is above the device’s measurement range.');
    if (range === 2) warnings.push('Pulse rate is below the device’s measurement range.');
    if (status & 32) warnings.push('The device reports an improper measurement position.');
    if ([sample.systolic, sample.diastolic, sample.meanPressure].some(value => value === null)) warnings.push('One or more pressure values are unavailable.');
    if ([sample.systolic, sample.diastolic, sample.meanPressure, sample.pulseRate].every(value => value === null)) rejectionReason = 'Measurement values are unavailable.';
  } else if (sample.kind === 'pulse_oximeter') {
    const status = sample.measurementStatus ?? 0;
    for (const [bit, message] of [
      [5, 'The device is still measuring.'], [6, 'This is an early estimate from the device.'],
      [9, 'This reading came from device storage; it is not a new live measurement.'],
      [12, 'The device is calibrating.'], [14, 'The device marked this measurement as questionable.'],
    ]) if (status & (1 << bit)) warnings.push(message);
    const sensor = sample.deviceSensorStatus ?? 0;
    const sensorWarnings = [
      'The device is updating its display.', 'The device reports an equipment malfunction.',
      'The device reports a signal-processing problem.', 'The sensor reports an inadequate signal.',
      'The sensor reports a poor signal.', 'The sensor reports low perfusion.',
      'The sensor reports an erratic signal.', 'The sensor cannot detect a pulsatile signal.',
      'The device reports a questionable pulse signal.', 'The device is still analyzing the signal.',
      'The sensor reports interference.', 'The sensor is not in contact with the user.',
      'The device does not recognize the attached sensor.', 'The sensor has moved out of position.',
      'The device reports a sensor malfunction.', 'The sensor is disconnected.',
    ];
    sensorWarnings.forEach((message, bit) => { if (sensor & (1 << bit)) warnings.push(message); });
    if (sample.clockNotSet) warnings.push('The device clock is not set; its measurement time is unavailable.');
    if (sample.spo2 === null) warnings.push('Oxygen saturation is unavailable.');
    if (sample.pulseRate === null) warnings.push('Pulse rate is unavailable.');
    for (const [bit, reason] of [
      [10, 'Device demonstration data was ignored.'], [11, 'Device test data was ignored.'],
      [13, 'The device reports that this measurement is unavailable.'],
      [15, 'The device reports that this measurement is invalid.'],
    ]) {
      if (status & (1 << bit)) { rejectionReason = reason; break; }
    }
    if (!rejectionReason && sample.spo2 === null && sample.pulseRate === null) rejectionReason = 'Measurement values are unavailable.';
    if (rejectionReason) {
      // Even direct parser consumers must not mistake demo/test/invalid numbers for readings.
      sample.spo2 = null;
      sample.pulseRate = null;
      sample.pulseAmplitudeIndex = null;
      if (sample.fast) sample.fast = {spo2: null, pulseRate: null};
      if (sample.slow) sample.slow = {spo2: null, pulseRate: null};
    }
  }
  return {...sample, qualityWarnings: warnings, usable: rejectionReason === null, rejectionReason};
}

/** Decode Bluetooth SIG Heart Rate Measurement, not ECG or resting heart rate. */
export function parseHeartRateMeasurement(value, timestamp = Date.now()) {
  const data = binaryView(value);
  const fail = () => { throw new Error('Invalid heart-rate measurement: inconsistent flags or length.'); };
  if (data.byteLength < 2) fail();
  const flags = data.getUint8(0);
  if ((flags & 0xe0) || ((flags & 0x02) && !(flags & 0x04))) fail();
  let offset = 1;
  const requireBytes = count => { if (offset + count > data.byteLength) fail(); };
  requireBytes(flags & 1 ? 2 : 1);
  const bpm = flags & 1 ? data.getUint16(offset, true) : data.getUint8(offset);
  offset += flags & 1 ? 2 : 1;
  let energyExpendedKJ = null;
  if (flags & 8) {
    requireBytes(2);
    energyExpendedKJ = data.getUint16(offset, true);
    offset += 2;
  }
  const rrIntervalsSeconds = [];
  if (flags & 16) {
    if (offset === data.byteLength || (data.byteLength - offset) % 2) fail();
    while (offset < data.byteLength) {
      rrIntervalsSeconds.push(data.getUint16(offset, true) / 1024);
      offset += 2;
    }
  }
  if (offset !== data.byteLength) fail();
  return withMeasurementQuality({
    kind: 'heart_rate', bpm, unit: 'bpm', timestamp: new Date(timestamp).toISOString(),
    contactSupported: Boolean(flags & 4),
    contactDetected: flags & 4 ? Boolean(flags & 2) : null,
    energyExpendedKJ, rrIntervalsSeconds,
  });
}

/** ISO/IEEE 11073 16-bit medical float. Special values represent unavailable data. */
export function decodeSFloat(raw) {
  if ([0x07fe, 0x07ff, 0x0800, 0x0801, 0x0802].includes(raw)) return null;
  let exponent = raw >> 12;
  if (exponent >= 8) exponent -= 16;
  let mantissa = raw & 0x0fff;
  if (mantissa >= 0x0800) mantissa -= 0x1000;
  return mantissa * 10 ** exponent;
}

function measurementReader(value) {
  const data = binaryView(value);
  let offset = 0;
  const fail = () => { throw new Error('Invalid measurement: inconsistent flags or length.'); };
  const take = size => { if (offset + size > data.byteLength) fail(); const position = offset; offset += size; return position; };
  return {
    byte: () => data.getUint8(take(1)),
    uint16: () => data.getUint16(take(2), true),
    uint24: () => { const position = take(3); return data.getUint8(position) | (data.getUint8(position + 1) << 8) | (data.getUint8(position + 2) << 16); },
    sfloat: () => decodeSFloat(data.getUint16(take(2), true)),
    dateTime: () => {
      const position = take(7);
      const parts = [data.getUint16(position, true), ...Array.from({length: 5}, (_, index) => data.getUint8(position + 2 + index))];
      const [year, month, day, hour, minute, second] = parts;
      if (!year || !month || !day) return null;
      if (month > 12 || day > 31 || hour > 23 || minute > 59 || second > 59) fail();
      const formatted = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
      const check = new Date(`${formatted}Z`);
      if (Number.isNaN(check.getTime()) || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) fail();
      return formatted; // Sensor local time: deliberately no invented timezone.
    },
    flags: allowed => { const flags = data.getUint8(take(1)); if (flags & ~allowed) fail(); return flags; },
    done: () => { if (offset !== data.byteLength) fail(); },
  };
}

export function parseBloodPressureMeasurement(value, timestamp = Date.now()) {
  const read = measurementReader(value);
  const flags = read.flags(0x1f);
  const sample = {
    kind: 'blood_pressure', timestamp: new Date(timestamp).toISOString(),
    systolic: read.sfloat(), diastolic: read.sfloat(), meanPressure: read.sfloat(),
    unit: flags & 1 ? 'kPa' : 'mmHg', deviceTimestamp: null, pulseRate: null, userId: null, measurementStatus: null,
  };
  if (flags & 2) sample.deviceTimestamp = read.dateTime();
  if (flags & 4) sample.pulseRate = read.sfloat();
  if (flags & 8) sample.userId = read.byte();
  if (flags & 16) sample.measurementStatus = read.uint16();
  read.done();
  return withMeasurementQuality(sample);
}

export function parsePulseOximeterMeasurement(value, timestamp = Date.now(), mode = 'spot-check') {
  if (!['spot-check', 'continuous'].includes(mode)) throw new Error('Invalid measurement mode.');
  const read = measurementReader(value);
  const flags = read.flags(0x1f);
  const pair = () => ({spo2: read.sfloat(), pulseRate: read.sfloat()});
  const sample = {
    kind: 'pulse_oximeter', timestamp: new Date(timestamp).toISOString(), mode, ...pair(), unit: '%',
    deviceTimestamp: null, measurementStatus: null, deviceSensorStatus: null, pulseAmplitudeIndex: null,
  };
  if (mode === 'continuous') {
    sample.fast = flags & 1 ? pair() : null;
    sample.slow = flags & 2 ? pair() : null;
    if (flags & 4) sample.measurementStatus = read.uint16();
    if (flags & 8) sample.deviceSensorStatus = read.uint24();
    if (flags & 16) sample.pulseAmplitudeIndex = read.sfloat();
  } else {
    if (flags & 1) sample.deviceTimestamp = read.dateTime();
    if (flags & 2) sample.measurementStatus = read.uint16();
    if (flags & 4) sample.deviceSensorStatus = read.uint24();
    if (flags & 8) sample.pulseAmplitudeIndex = read.sfloat();
    sample.clockNotSet = Boolean(flags & 16);
    if (sample.clockNotSet) sample.deviceTimestamp = null;
  }
  read.done();
  return withMeasurementQuality(sample);
}

const profiles = {
  heart_rate: {label: 'heart-rate', characteristics: [{id: 'heart_rate_measurement', parse: parseHeartRateMeasurement}]},
  blood_pressure: {label: 'blood-pressure', characteristics: [{id: 'blood_pressure_measurement', parse: parseBloodPressureMeasurement}]},
  pulse_oximeter: {label: 'pulse-oximeter', characteristics: [
    {id: 0x2a5e, optional: true, parse: (value, time) => parsePulseOximeterMeasurement(value, time, 'spot-check')},
    {id: 0x2a5f, optional: true, parse: (value, time) => parsePulseOximeterMeasurement(value, time, 'continuous')},
  ]},
};
const categoryProfiles = {'heart-rate': 'heart_rate', 'blood-pressure': 'blood_pressure', 'pulse-oximeter': 'pulse_oximeter'};
const copySample = sample => sample && {
  ...sample,
  qualityWarnings: [...sample.qualityWarnings],
  ...(sample.rrIntervalsSeconds && {rrIntervalsSeconds: [...sample.rrIntervalsSeconds]}),
  ...(sample.fast && {fast: {...sample.fast}}), ...(sample.slow && {slow: {...sample.slow}}),
};

/** Owns one user-selected BLE session. It never uploads or persists measurements. */
export function createBluetoothController(options = {}) {
  const bluetooth = Object.hasOwn(options, 'bluetooth') ? options.bluetooth : globalThis.navigator?.bluetooth;
  const secureContext = options.secureContext ?? globalThis.isSecureContext ?? true;
  const supported = Boolean(secureContext && bluetooth?.requestDevice);
  const now = options.now ?? Date.now;
  const onChange = options.onChange ?? (() => {});
  const maxSamples = Number.isFinite(options.maxSamples) ? Math.max(1, Math.min(1000, Math.floor(options.maxSamples))) : 120;
  let generation = 0;
  let session = null;
  let state = {
    status: supported ? 'available' : 'unsupported', supported, available: supported, connected: false,
    device: null, catalogId: null, profile: null, latestSample: null, latestSampleStale: false, samples: [], totalSamples: 0, invalidPacketCount: 0, rejectedPacketCount: 0,
    errorCode: null,
    message: supported ? 'Ready to choose a compatible health monitor.' : secureContext
      ? 'This browser does not support Bluetooth connections. Use a supported Chrome or Edge browser.'
      : 'Bluetooth requires a secure HTTPS page or localhost.',
  };

  function getSnapshot() {
    return {...state, device: state.device && {...state.device}, latestSample: copySample(state.latestSample), samples: state.samples.map(copySample)};
  }

  function update(changes) {
    state = {...state, ...changes};
    onChange(getSnapshot());
    return getSnapshot();
  }

  function release(resource) {
    if (!resource) return;
    resource.ready = false;
    for (const subscription of resource.subscriptions) subscription.characteristic.removeEventListener('characteristicvaluechanged', subscription.onValue);
    resource.device?.removeEventListener('gattserverdisconnected', resource.onDisconnect);
    // Disconnecting tears down the notification subscription without device control writes.
    try { if (resource.device?.gatt?.connected) resource.device.gatt.disconnect(); } catch { /* Already disconnected. */ }
  }

  function disconnect() {
    generation += 1;
    const previous = session;
    session = null;
    release(previous);
    return update({status: supported ? 'disconnected' : 'unsupported', connected: false, latestSampleStale: Boolean(state.latestSample), errorCode: null,
      message: supported ? 'Disconnected. Session readings stay only in this page’s memory.' : state.message});
  }

  async function connect(selection) {
    if (!supported) return getSnapshot();
    if (state.status === 'connecting') return getSnapshot();
    const catalogId = typeof selection === 'string' ? selection : selection?.catalogId ?? selection?.id;
    const selected = catalogId ? deviceCatalog.find(device => device.id === catalogId) : null;
    if (catalogId && !selected) return update({errorCode: 'unknown_device', message: 'This device is not in the catalog.'});
    if (selected && !selected.canConnect) return update({errorCode: 'integration_required', message: selected.setup});
    const requestedProfile = selected?.profile ?? categoryProfiles[selected?.category] ?? selection?.profile ?? selection?.serviceId ?? categoryProfiles[selection?.category];
    if (requestedProfile && !Object.hasOwn(profiles, requestedProfile)) return update({errorCode: 'unsupported_profile', message: 'This measurement type does not have a browser adapter yet.'});
    const candidates = requestedProfile ? [requestedProfile] : Object.keys(profiles);

    const token = ++generation;
    release(session);
    session = null;
    update({status: 'connecting', connected: false, device: null, catalogId: selected?.id ?? null, profile: null,
      latestSample: null, latestSampleStale: false, samples: [], totalSamples: 0, invalidPacketCount: 0, rejectedPacketCount: 0, errorCode: null,
      message: 'Choose your actual monitor in the browser Bluetooth picker.'});
    let resource;
    try {
      // Must remain before the first await: requestDevice needs the click’s user activation.
      const requestedDevice = bluetooth.requestDevice({
        filters: candidates.map(profile => ({services: [profile]})),
        optionalServices: ['battery_service', 'device_information'],
      });
      const device = await requestedDevice;
      if (token !== generation) return getSnapshot();
      if (!device?.gatt) throw new Error('This device does not expose a Bluetooth GATT server.');
      resource = {device, subscriptions: [], ready: false, pendingPackets: []};
      session = resource;
      const active = () => token === generation && session === resource;
      resource.onDisconnect = () => {
        if (!active()) return;
        generation += 1;
        session = null;
        release(resource);
        update({status: 'disconnected', connected: false, latestSampleStale: Boolean(state.latestSample), errorCode: null, message: 'The monitor disconnected. Choose it again to resume readings.'});
      };
      const publish = sample => {
        if (!active() || !resource.ready) return;
        if (!sample.usable) {
          update({status: 'waiting', latestSampleStale: Boolean(state.latestSample), rejectedPacketCount: state.rejectedPacketCount + 1,
            errorCode: 'unusable_measurement', message: `${sample.rejectionReason} Waiting for a usable measurement.${state.latestSample ? ' The last accepted reading is unchanged.' : ''}`});
          return;
        }
        update({status: 'receiving', connected: true, latestSample: sample, latestSampleStale: false,
          samples: [...state.samples, sample].slice(-maxSamples), totalSamples: state.totalSamples + 1, errorCode: null,
          message: sample.qualityWarnings.length ? sample.qualityWarnings.join(' ') : `Receiving ${profiles[sample.kind].label} measurements.`});
      };
      const invalid = count => update({status: 'waiting', latestSampleStale: Boolean(state.latestSample), invalidPacketCount: state.invalidPacketCount + count, errorCode: 'invalid_measurement', message: `An unreadable measurement packet was ignored. Waiting for the next measurement.${state.latestSample ? ' The last accepted reading is unchanged.' : ''}`});
      const queue = packet => { resource.pendingPackets = [...resource.pendingPackets, packet].slice(-maxSamples); };
      const receive = (event, parse) => {
        if (!active()) return;
        let sample;
        try { sample = parse(event.target.value, now()); }
        catch {
          if (resource.ready) invalid(1);
          else queue({invalid: true});
          return;
        }
        if (!resource.ready) {
          // Spot-check devices may emit their only reading before startNotifications resolves.
          queue({sample});
          return;
        }
        publish(sample);
      };
      device.addEventListener('gattserverdisconnected', resource.onDisconnect);
      const server = await device.gatt.connect();
      if (!active()) { release(resource); return getSnapshot(); }
      let service, profile;
      for (const candidate of candidates) {
        try { service = await server.getPrimaryService(candidate); profile = candidate; }
        catch (error) { if (error?.name !== 'NotFoundError') throw error; }
        if (!active()) { release(resource); return getSnapshot(); }
        if (service) break;
      }
      if (!service) throw new Error('No supported measurement service is available.');
      for (const definition of profiles[profile].characteristics) {
        let characteristic;
        try { characteristic = await service.getCharacteristic(definition.id); }
        catch (error) { if (definition.optional && error?.name === 'NotFoundError') continue; throw error; }
        if (!active()) { release(resource); return getSnapshot(); }
        const onValue = event => receive(event, definition.parse);
        resource.subscriptions.push({characteristic, onValue});
        characteristic.addEventListener('characteristicvaluechanged', onValue);
        await characteristic.startNotifications();
        if (!active()) { release(resource); return getSnapshot(); }
      }
      if (!resource.subscriptions.length) throw new Error('No supported measurement characteristic is available.');
      resource.ready = true;
      update({status: 'waiting', connected: true, profile, device: {id: device.id, name: device.name || 'Unnamed health monitor'},
        message: `Connected to the ${profiles[profile].label} service. Waiting for a measurement.`});
      for (const packet of resource.pendingPackets) {
        if (!active()) break;
        if (packet.invalid) invalid(1);
        else publish(packet.sample);
      }
      resource.pendingPackets = [];
      return getSnapshot();
    } catch (error) {
      release(resource);
      if (token !== generation) return getSnapshot();
      session = null;
      let errorCode = 'connection_failed';
      let status = 'error';
      let message = 'Could not connect to a supported measurement service. Check that the monitor is on, nearby, and not busy in another app.';
      if (error?.name === 'NotFoundError' && !resource) {
        errorCode = 'cancelled'; status = 'available';
        message = 'No device selected. Turn on your monitor and try again when ready.';
      } else if (['NotAllowedError', 'SecurityError'].includes(error?.name)) {
        errorCode = 'permission_denied';
        message = 'Bluetooth permission was denied or blocked. Check this site’s browser permissions and try again.';
      } else if (error?.name === 'NotSupportedError') {
        errorCode = 'unavailable';
        message = 'Bluetooth is unavailable on this device or browser. Check Bluetooth settings or use another supported device.';
      }
      return update({status, connected: false, device: null, errorCode, message});
    }
  }

  return {connect, disconnect, getSnapshot};
}
