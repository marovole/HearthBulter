const fs = require('fs');
const path = require('path');

console.log('🔧 为 Cloudflare Workers 创建 Node.js 模块 stubs...\n');

// 创建 stubs 目录
const stubsDir = path.join(process.cwd(), '.open-next/node-stubs');
if (!fs.existsSync(stubsDir)) {
  fs.mkdirSync(stubsDir, { recursive: true });
}

// 需要 stub 的模块和它们的基本实现
const stubs = {
  'async_hooks.js': `
// Cloudflare Workers stub for async_hooks
export class AsyncLocalStorage {
  constructor() {
    this.store = new Map();
  }
  
  run(store, callback, ...args) {
    this.store.set('current', store);
    try {
      return callback(...args);
    } finally {
      this.store.delete('current');
    }
  }
  
  getStore() {
    return this.store.get('current');
  }
  
  enterWith(store) {
    this.store.set('current', store);
  }
  
  exit(callback, ...args) {
    this.store.delete('current');
    return callback(...args);
  }
}

export default { AsyncLocalStorage };
`,

  'process.js': `
// Cloudflare Workers stub for process
const process = {
  env: {},
  cwd: () => '/',
  platform: 'cloudflare',
  version: 'v20.0.0',
  versions: { node: '20.0.0' },
  nextTick: (cb, ...args) => Promise.resolve().then(() => cb(...args)),
};

export default process;
`,

  'stream.js': `
// Cloudflare Workers stub for stream
export class Readable {}
export class Writable {}
export class Duplex {}
export class Transform {}
export class PassThrough {}

export default {
  Readable,
  Writable,
  Duplex,
  Transform,
  PassThrough,
};
`,

  'buffer.js': `
// Cloudflare Workers stub for buffer
// Use the global Buffer if available
export const Buffer = globalThis.Buffer || class Buffer extends Uint8Array {
  static from(data) {
    if (typeof data === 'string') {
      return new TextEncoder().encode(data);
    }
    return new Uint8Array(data);
  }
  
  static alloc(size) {
    return new Uint8Array(size);
  }
  
  toString(encoding = 'utf8') {
    return new TextDecoder(encoding).decode(this);
  }
};

export default { Buffer };
`,

  'crypto.js': `
// Cloudflare Workers stub for crypto
// Use Web Crypto API
export default globalThis.crypto || {};
export const webcrypto = globalThis.crypto || {};
export const createHash = () => ({ update: () => ({}), digest: () => '' });
export const randomBytes = (size) => globalThis.crypto.getRandomValues(new Uint8Array(size));
`,

  'querystring.js': `
// Cloudflare Workers stub for querystring
export function parse(str) {
  const params = new URLSearchParams(str);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

export function stringify(obj) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    params.append(key, value);
  }
  return params.toString();
}

export default { parse, stringify };
`,

  'path.js': `
// Cloudflare Workers stub for path
export function join(...paths) {
  return paths.filter(Boolean).join('/').replace(/\\/\\//g, '/');
}

export function resolve(...paths) {
  return join(...paths);
}

export function dirname(p) {
  return p.split('/').slice(0, -1).join('/') || '/';
}

export function basename(p) {
  return p.split('/').pop() || '';
}

export function extname(p) {
  const name = basename(p);
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(idx) : '';
}

export const sep = '/';
export const delimiter = ':';

export default { join, resolve, dirname, basename, extname, sep, delimiter };
`,
};

// 创建每个 stub 文件
Object.entries(stubs).forEach(([filename, content]) => {
  const filePath = path.join(stubsDir, filename);
  fs.writeFileSync(filePath, content.trim());
  console.log(`  ✓ 创建 ${filename}`);
});

console.log(`\n✅ 创建了 ${Object.keys(stubs).length} 个 stub 文件`);
console.log(`📁 位置: ${stubsDir}`);
console.log('\n💡 下一步: 修改 cloudflare 文件使用这些 stubs');
