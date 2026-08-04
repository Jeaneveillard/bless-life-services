function requireToken(env) {
  if (typeof env.GITHUB_TOKEN !== 'string' || env.GITHUB_TOKEN.length === 0) {
    const err = new Error('GITHUB_TOKEN is not configured');
    err.status = 503;
    throw err;
  }
}

function repoContentsUrl(env, path) {
  const repo = env.GITHUB_REPO;
  if (typeof repo !== 'string' || !repo.includes('/')) {
    const err = new Error('GITHUB_REPO is not configured');
    err.status = 503;
    throw err;
  }
  return `https://api.github.com/repos/${repo}/contents/${path}`;
}

function branch(env) {
  return typeof env.GITHUB_BRANCH === 'string' && env.GITHUB_BRANCH.length > 0
    ? env.GITHUB_BRANCH
    : 'main';
}

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'bless-life-admin-api',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function textToBase64(text) {
  return bytesToBase64(new TextEncoder().encode(text));
}

function base64ToBytes(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64ToText(b64) {
  return new TextDecoder().decode(base64ToBytes(b64));
}

function githubError(res, action) {
  const err = new Error(`GitHub ${action} failed: ${res.status}`);
  err.status = res.status === 404 ? 404 : 502;
  err.githubStatus = res.status;
  return err;
}

export async function getFile(env, path) {
  requireToken(env);
  const url = `${repoContentsUrl(env, path)}?ref=${encodeURIComponent(branch(env))}`;
  const res = await fetch(url, { headers: githubHeaders(env) });
  if (!res.ok) {
    throw githubError(res, 'getFile');
  }
  const data = await res.json();
  if (typeof data.sha !== 'string' || typeof data.content !== 'string') {
    const err = new Error('GitHub getFile returned unexpected payload');
    err.status = 502;
    throw err;
  }
  return {
    sha: data.sha,
    contentText: base64ToText(data.content),
  };
}

export async function putFile(env, path, contentText, sha, message) {
  requireToken(env);
  const body = {
    message,
    content: textToBase64(contentText),
    branch: branch(env),
  };
  if (sha) {
    body.sha = sha;
  }
  const res = await fetch(repoContentsUrl(env, path), {
    method: 'PUT',
    headers: {
      ...githubHeaders(env),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw githubError(res, 'putFile');
  }
}

export async function putBinary(env, path, bytes, shaOrNull, message, contentType) {
  requireToken(env);
  void contentType;
  const body = {
    message,
    content: bytesToBase64(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)),
    branch: branch(env),
  };
  if (shaOrNull) {
    body.sha = shaOrNull;
  }
  const res = await fetch(repoContentsUrl(env, path), {
    method: 'PUT',
    headers: {
      ...githubHeaders(env),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw githubError(res, 'putBinary');
  }
}
