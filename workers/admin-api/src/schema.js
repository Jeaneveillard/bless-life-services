const TOP_LEVEL_KEYS = [
  'notary',
  'cpr',
  'officiant',
  'decoration',
  'candleLeadTime',
  'candles',
  'misc',
];

const SERVICE_PRICE_KEYS = ['price', 'stripe', 'paypal'];
const SERVICE_DEPOSIT_KEYS = ['deposit', 'stripe', 'paypal'];
const CANDLE_KEYS = ['name', 'description', 'price', 'size', 'image', 'stripe', 'paypal'];
const MISC_KEYS = ['notaryExpiration', 'hours', 'youtube'];

const IMAGE_PATTERN = /^assets\/[A-Za-z0-9._-]+$/;

function fail(error) {
  return { ok: false, error };
}

function trimString(value, path) {
  if (typeof value !== 'string') {
    return fail(`${path} must be a string`);
  }
  return value.trim();
}

function hasExactKeys(obj, allowedKeys, path) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return fail(`${path} must be an object`);
  }
  const keys = Object.keys(obj);
  if (keys.length !== allowedKeys.length) {
    return fail(`${path} has invalid keys`);
  }
  for (const key of allowedKeys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return fail(`${path} is missing required key: ${key}`);
    }
  }
  for (const key of keys) {
    if (!allowedKeys.includes(key)) {
      return fail(`${path} has unknown key: ${key}`);
    }
  }
  return null;
}

function validateHttpsUrl(value, path) {
  if (value !== '' && !value.startsWith('https://')) {
    return fail(`${path} must start with https:// when non-empty`);
  }
  return null;
}

function validateImagePath(value, path) {
  if (value !== '' && !IMAGE_PATTERN.test(value)) {
    return fail(`${path} must match assets/ path pattern when non-empty`);
  }
  return null;
}

function validatePaymentFields(obj, path) {
  for (const field of ['stripe', 'paypal']) {
    const trimmed = trimString(obj[field], `${path}.${field}`);
    if (typeof trimmed === 'object' && trimmed.ok === false) {
      return trimmed;
    }
    obj[field] = trimmed;
    const urlError = validateHttpsUrl(trimmed, `${path}.${field}`);
    if (urlError) {
      return urlError;
    }
  }
  return null;
}

function validateServicePrice(obj, path) {
  const keysError = hasExactKeys(obj, SERVICE_PRICE_KEYS, path);
  if (keysError) {
    return keysError;
  }
  const price = trimString(obj.price, `${path}.price`);
  if (typeof price === 'object' && price.ok === false) {
    return price;
  }
  obj.price = price;
  return validatePaymentFields(obj, path);
}

function validateServiceDeposit(obj, path) {
  const keysError = hasExactKeys(obj, SERVICE_DEPOSIT_KEYS, path);
  if (keysError) {
    return keysError;
  }
  const deposit = trimString(obj.deposit, `${path}.deposit`);
  if (typeof deposit === 'object' && deposit.ok === false) {
    return deposit;
  }
  obj.deposit = deposit;
  return validatePaymentFields(obj, path);
}

function validateCandle(obj, path) {
  const keysError = hasExactKeys(obj, CANDLE_KEYS, path);
  if (keysError) {
    return keysError;
  }
  for (const field of ['name', 'description', 'price', 'size']) {
    const trimmed = trimString(obj[field], `${path}.${field}`);
    if (typeof trimmed === 'object' && trimmed.ok === false) {
      return trimmed;
    }
    obj[field] = trimmed;
  }
  const image = trimString(obj.image, `${path}.image`);
  if (typeof image === 'object' && image.ok === false) {
    return image;
  }
  obj.image = image;
  const imageError = validateImagePath(image, `${path}.image`);
  if (imageError) {
    return imageError;
  }
  return validatePaymentFields(obj, path);
}

function validateMisc(obj) {
  const keysError = hasExactKeys(obj, MISC_KEYS, 'misc');
  if (keysError) {
    return keysError;
  }
  for (const field of ['notaryExpiration', 'hours']) {
    const trimmed = trimString(obj[field], `misc.${field}`);
    if (typeof trimmed === 'object' && trimmed.ok === false) {
      return trimmed;
    }
    obj[field] = trimmed;
  }
  const youtube = trimString(obj.youtube, 'misc.youtube');
  if (typeof youtube === 'object' && youtube.ok === false) {
    return youtube;
  }
  obj.youtube = youtube;
  return validateHttpsUrl(youtube, 'misc.youtube');
}

export function validateSiteContent(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return fail('input must be an object');
  }

  const topKeysError = hasExactKeys(input, TOP_LEVEL_KEYS, 'root');
  if (topKeysError) {
    return topKeysError;
  }

  const data = structuredClone(input);

  const notaryError = validateServicePrice(data.notary, 'notary');
  if (notaryError) {
    return notaryError;
  }

  const cprError = validateServicePrice(data.cpr, 'cpr');
  if (cprError) {
    return cprError;
  }

  const officiantError = validateServiceDeposit(data.officiant, 'officiant');
  if (officiantError) {
    return officiantError;
  }

  const decorationError = validateServiceDeposit(data.decoration, 'decoration');
  if (decorationError) {
    return decorationError;
  }

  const leadTime = trimString(data.candleLeadTime, 'candleLeadTime');
  if (typeof leadTime === 'object' && leadTime.ok === false) {
    return leadTime;
  }
  data.candleLeadTime = leadTime;

  if (!Array.isArray(data.candles)) {
    return fail('candles must be an array');
  }
  if (data.candles.length !== 3) {
    return fail('candles must contain exactly 3 items');
  }
  for (let i = 0; i < data.candles.length; i++) {
    const candleError = validateCandle(data.candles[i], `candles[${i}]`);
    if (candleError) {
      return candleError;
    }
  }

  const miscError = validateMisc(data.misc);
  if (miscError) {
    return miscError;
  }

  return { ok: true, data };
}
