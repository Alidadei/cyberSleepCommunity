/* 云端存储后端逻辑测试：官方 Supabase 与腾讯云 CloudBase(PG 模式) 双后端
   不需要真实网络，用 mock fetch 验证路径拼接、匿名登录换 token、add/rate/save 请求形状。
   运行：node tests/store-backend-test.mjs */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'index.html'), 'utf8');

/* 从 const LocalStore 切到 const Store（跳过 const SUPABASE 里的空默认值，避免遮蔽注入配置） */
const start = src.indexOf('const LocalStore');
const end = src.indexOf('const Store =');
if (start < 0 || end < 0) { console.error('未找到 Store 代码块'); process.exit(1); }
const block = src.slice(start, end) + 'const Store = (SUPABASE.url && SUPABASE.anonKey) ? SupabaseStore : LocalStore;';

let pass = 0;
function ok(cond, name, extra) {
  if (!cond) throw new Error('FAIL: ' + name + (extra !== undefined ? ' | ' + JSON.stringify(extra) : ''));
  pass++; console.log('  \u2713 ' + name);
}

function run(config) {
  const calls = [];
  const fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET', body: opts.body || null, headers: opts.headers || {} });
    if (String(url).includes('/auth/v1/signin/anonymously')) return { ok: true, status: 200, json: async () => ({ access_token: 'TOK' }) };
    const kind = (opts.method || 'GET').toUpperCase();
    if (kind === 'GET') return { ok: true, status: 200, json: async () => (String(url).includes('select=ratings') ? [{ ratings: config.ratingsSeed || [3] }] : []) };
    return { ok: true, status: 201, json: async () => ({}) };
  };
  const sandbox = { SUPABASE: config, fetch, Date, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  new vm.Script(block).runInContext(sandbox);
  return { store: sandbox.SupabaseStore, calls };
}

/* ---------- CloudBase(PG 模式)后端 ---------- */
{
  const cfg = { url: 'https://pg-demo-xxx.api.tcloudbasegateway.com', anonKey: 'PUBKEY' };
  const { store, calls } = run(cfg);
  ok(store.isCloud === true, 'CloudBase 识别（url 含 tcloudbasegateway）');

  const r0 = store.rest('community_picks?select=id&order=addedAt.desc');
  ok(r0.startsWith('https://pg-demo-xxx.api.tcloudbasegateway.com/v1/rdb/rest/'), 'CloudBase REST 路径 /v1/rdb/rest/', r0);

  await store.load();
  const signin = calls.find(c => c.url.includes('/auth/v1/signin/anonymously'));
  ok(!!signin && signin.method === 'POST' && signin.headers['Content-Type'] === 'application/json', '匿名登录换 token 先于业务请求');
  const loadCall = calls.find(c => c.url.includes('community_picks?select=id,title'));
  ok(loadCall.headers.Authorization === 'Bearer TOK', '业务请求带匿名登录签发的 Bearer token', loadCall && loadCall.headers.Authorization);

  await store.add('测试曲', 'https://example.com/a', 'noise');
  const addCall = calls.find(c => c.method === 'POST' && c.url.includes('community_picks?') === false && c.url.includes('community_picks'));
  const addBody = JSON.parse(addCall.body);
  ok(addBody.title === '测试曲' && Array.isArray(addBody.ratings) && addBody.ratings.length === 0 && typeof addBody.id === 'number', 'add 每行含 id/ratings[] 契约字段', addBody);

  await store.rate(123, 5);
  const rateGet = calls.find(c => c.url.includes('id=eq.123&select=ratings'));
  const ratePatch = calls.find(c => c.method === 'PATCH' && c.url.includes('id=eq.123'));
  ok(!!rateGet && ratePatch && JSON.parse(ratePatch.body).ratings.join(',') === '3,5', 'rate = 读回追加后整体 PATCH（ratings 3→3,5）');

  await store.save([{ id: 9, title: 't', url: 'u', type: null, ratings: [], addedAt: 1 }]);
  const saveCall = calls.find(c => c.method === 'POST' && c.headers.Prefer);
  ok(!!saveCall && saveCall.headers.Prefer === 'resolution=merge-duplicates', 'save 按主键 merge-duplicates upsert');
}

/* ---------- 官方 Supabase 后端 ---------- */
{
  const cfg = { url: 'https://abcdefgh.supabase.co', anonKey: 'eyJhbGciOiJIUzI1NiJ9.XXX' };
  const { store, calls } = run(cfg);
  ok(store.isCloud === false, '官方 Supabase 识别（无 tcloudbasegateway）');
  ok(store.rest('community_picks') === 'https://abcdefgh.supabase.co/rest/v1/community_picks', '官方 REST 路径 /rest/v1/');

  const h = await store.headers();
  ok(h.Authorization === 'Bearer eyJhbGciOiJIUzI1NiJ9.XXX' && h.apikey === 'eyJhbGciOiJIUzI1NiJ9.XXX', '官方直接用 anonKey 双头（apikey + Bearer）');
  ok(!calls.some(c => c.url.includes('/auth/v1/signin/anonymously')), '官方后端不触发匿名登录');
}

console.log('ALL PASS: ' + pass + ' assertions');