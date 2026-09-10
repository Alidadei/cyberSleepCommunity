/* cyberSleepCommunity index.html 行为测试：Node + 最小 DOM 桩，无外部依赖。
 * 运行：node tests/dom-test.mjs
 * 覆盖：类型星图节点（默认收起、点选展开、无类型、自定义标签节点）/
 *       B站分享文本拆解 + 标题抓取 / 发布 / URL 去重 / AdGuard / 星星评分（真实+样例模拟）/
 *       ESC / 入场动画两段式 / 导入合并去重 / APP 同款徽章 / 排序契约 / 中英切换 / 红线扫描 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

/* HTML 结构冒烟：关键 id 必须在标记里恰好出现一次（防解析层删改——桩按 id 注册，看不出结构缺失）。
   navAbout 已注释隐藏（保留 id 字符串即视为结构完整，恢复取消注释即可） */
for (const id of ['list','loadMsg','brandTitle','subtitle','navLang','formTitle','labelTitle','labelUrl','labelType','formHint','letterCaption','sisterApp','sisterName','introHint','navAbout','typeList','tagNodes','searchBox','fTitle','fUrl','fType','fSubmit','fMsg','fileImport','ioMsg','navPublish','navExport','navImport','formPanel','intro','introText','introSign','skyStars','letterBox','navLetter','hamburgerBtn','mainNav','rankingOverlay']) {
  const n = (html.match(new RegExp('id="' + id + '"', 'g')) || []).length;
  if (n !== 1) throw new Error('HTML 结构错误: id="' + id + '" 出现 ' + n + ' 次（应为 1 次）');
}

const scripts = html.match(/<script>[\s\S]*?<\/script>/g)
  .map(s => s.replace(/<\/?script>/g, ''));
if (!scripts.length) throw new Error('script not found');
const script = scripts.join('\n');

/* 红线：不得出现 prompt()/alert()/confirm() */
for (const banned of ['prompt(', 'alert(', 'confirm(']) {
  if (script.includes(banned)) throw new Error('red line violated: ' + banned);
}

/* ---------- 最小 DOM 桩 ---------- */
class ClassList {
  constructor(el) { this.el = el; this.set = new Set(); }
  _sync() { this.el.attrs['class'] = [...this.set].join(' '); }
  add(...cs) { cs.forEach(c => this.set.add(c)); this._sync(); }
  remove(...cs) { cs.forEach(c => this.set.delete(c)); this._sync(); }
  toggle(c, force) {
    const on = force === undefined ? !this.set.has(c) : force;
    on ? this.set.add(c) : this.set.delete(c); this._sync(); return on;
  }
  contains(c) { return this.set.has(c); }
}
function makeCtx() {
  const noop = () => {};
  return {
    scale: noop, setTransform: noop, drawImage: noop, fillRect: noop, beginPath: noop,
    arc: noop, fill: noop, moveTo: noop, lineTo: noop, stroke: noop, save: noop,
    restore: noop, translate: noop, rotate: noop, clearRect: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop })
  };
}
let allNodes = [];
class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = []; this.parentNode = null;
    this.attrs = {}; this.style = {}; this._handlers = {};
    this.classList = new ClassList(this);
    this.value = ''; this.disabled = false; this.target = ''; this.rel = ''; this.href = '';
    this.type = ''; this.files = []; this._removed = false;
    allNodes.push(this);
  }
  get id() { return this.attrs.id || ''; }
  set id(v) { this.attrs.id = v; }
  get className() { return this.attrs['class'] || ''; }
  set className(v) { this.attrs['class'] = v; this.classList.set = new Set(v.split(/\s+/).filter(Boolean)); }
  get textContent() {
    return this.children.map(c => typeof c === 'string' ? c : c.textContent).join('');
  }
  set textContent(v) { this.children = [String(v)]; }
  get innerHTML() { return ''; }
  set innerHTML(v) { if (v === '') this.children = []; else throw new Error('innerHTML only supports clearing'); }
  appendChild(n) {
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this; this.children.push(n); return n;
  }
  removeChild(n) {
    const i = this.children.indexOf(n);
    if (i >= 0) { this.children.splice(i, 1); n.parentNode = null; }
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); this._removed = true; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(ev, fn) { (this._handlers[ev] ||= []).push(fn); }
  removeEventListener(ev, fn) { if (this._handlers[ev]) this._handlers[ev] = this._handlers[ev].filter(f => f !== fn); }
  dispatch(ev) { (this._handlers[ev] || []).forEach(fn => fn({ target: this })); }
  _match(token) {
    const t = token.match(/^([a-z]*)((?:\.[\w-]+)*)(?:\[([\w-]+)="([^"]*)"\])?$/i);
    if (!t) throw new Error('bad selector token: ' + token);
    const [, tag, classes, attr, val] = t;
    if (tag && this.tagName !== tag.toUpperCase()) return false;
    for (const c of classes.split('.').filter(Boolean)) if (!this.classList.contains(c)) return false;
    if (attr && this.attrs[attr] !== val) return false;
    return true;
  }
  querySelectorAll(sel) {
    const out = [];
    for (const part of sel.split(',')) {
      for (const r of this._query(part.trim())) if (!out.includes(r)) out.push(r);
    }
    return out;
  }
  _query(sel) {
    const tokens = sel.trim().split(/\s+/);
    if (!tokens[0]) return [];
    const out = [];
    const walk = (node, i) => {
      for (const c of node.children) {
        if (c && typeof c === 'object' && c._match) {
          if (c._match(tokens[i])) { i + 1 === tokens.length ? out.push(c) : walk(c, i + 1); }
          else walk(c, i);
        }
      }
    };
    walk(this, 0);
    return out;
  }
  getBoundingClientRect() { return { x: 0, y: 0, width: 100, height: 20 }; }
  getContext() { return makeCtx(); }
}
function makeEl(tag) { return new El(tag); }

const registry = {};
for (const id of ['list','loadMsg','brandTitle','subtitle','navLang','formTitle','labelTitle','labelUrl','labelType','formHint','letterCaption','sisterApp','sisterName','introHint','navAbout','typeList','tagNodes','searchBox','fTitle','fUrl','fType','fSubmit','fMsg','fileImport','ioMsg','navPublish','navExport','navImport','formPanel','intro','introText','introSign','skyStars','letterBox','navLetter','hamburgerBtn','mainNav','rankingOverlay']) {
  registry[id] = makeEl(id === 'fTitle' || id === 'fUrl' || id === 'fileImport' ? 'input' : 'div');
  registry[id].id = id;
}

let docHandlers = {};
const cssVars = {};
const documentElement = { style: { setProperty(k, v) { cssVars[k] = v; } }, lang: '' };
const bodyKids = [];
const document = {
  documentElement,
  body: { style: {}, appendChild: n => bodyKids.push(n) },
  createElement: makeEl,
  createElementNS: (ns, tag) => makeEl(tag),
  createTextNode: t => ({ TEXT: true, textContent: String(t) }),
  getElementById: id => (registry[id] && !registry[id]._removed) ? registry[id] : null,
  querySelectorAll: sel => registry.list.querySelectorAll(sel).concat(
    registry.rankingOverlay.querySelectorAll(sel)).concat(
    sel.includes('.rate') ? allNodes.filter(n => n._match('.rate[aria-expanded="true"]')) : []),
  addEventListener: (ev, fn) => { (docHandlers[ev] ||= []).push(fn); },
  removeEventListener: (ev, fn) => { if (docHandlers[ev]) docHandlers[ev] = docHandlers[ev].filter(f => f !== fn); },
  title: '',
};

const storage = new Map();
const localStorage = {
  getItem: k => storage.has(k) ? storage.get(k) : null,
  setItem: (k, v) => storage.set(k, String(v)),
};
/* 预置「已看过入场动画」：默认路径跳过打字（打字/两段式另行断言） */
const sessionStore = new Map([['csc_intro_done', '1']]);
const sessionStorage = {
  getItem: k => sessionStore.has(k) ? sessionStore.get(k) : null,
  setItem: (k, v) => sessionStore.set(k, String(v)),
};

class FileReader {
  readAsText(f) { this.result = f.content; setImmediate(() => this.onload()); }
}
class Blob { constructor(parts) { this.parts = parts; } }

const sandbox = {
  document, localStorage, sessionStorage, FileReader, Blob,
  URL: Object.assign(URL, { createObjectURL: () => 'blob:x' }),
  fetch: () => Promise.reject(new Error('offline in tests')),
  AbortController,
  setInterval: () => 0,   /* 测试不真的轮询，也避免计时器挂住进程 */
  requestAnimationFrame: () => 0,
  matchMedia: () => ({ matches: false }),
  location: { search: '' },
  innerWidth: 900, innerHeight: 700, devicePixelRatio: 1,
  addEventListener: () => {}, removeEventListener: () => {},
  console, setTimeout, clearTimeout, Math, Date, JSON, Set, Object, Array, Number, String, RegExp, Promise,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
new vm.Script(script).runInContext(sandbox);
const { sortPicks, playIntro, urlKey } = sandbox;

const cards = () => registry.rankingOverlay.querySelectorAll('.card');
const g = id => registry[id];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0;
function ok(cond, name, extra) {
  if (!cond) throw new Error('FAIL: ' + name + (extra !== undefined ? ' | ' + JSON.stringify(extra) : ''));
  pass++; console.log('  ✓ ' + name);
}
const store = () => JSON.parse(storage.get('csc_community_picks') || '[]');
const sampleStore = () => JSON.parse(storage.get('csc_sample_ratings') || '{}');
const liveNodes = () => registry.tagNodes.querySelectorAll('.node');
const clickNode = label => liveNodes().find(n => n.children[1].textContent === label).onclick();
const ensureNode = label => { const n = liveNodes().find(x => x.children[1].textContent === label); n.onclick(); };
const cardTitle = c => c.children[0].children[1].textContent;

/* ---------- 1. 初始化：默认收起 + 节点星图 + 主题 ---------- */
await sleep(20);
ok(g('brandTitle').textContent === '电子安眠药', '品牌名默认中文（电子安眠药）', g('brandTitle').textContent);
ok(registry.typeList.children.length === 4, '类型建议列表（datalist）4 项');
ok(cards().length === 0, '默认榜单收起（未点亮节点）', cards().length);
ok(!registry.list.textContent.includes('点亮一颗星'), '首页不再显示点亮指引');
ok(liveNodes().length === 6, '节点 = 全部 + 4 内置类型 + 无类型', liveNodes().length);
ok(/^#[0-9a-f]{6}$/i.test(cssVars['--bg'] || ''), '时辰主题脚本已写入 --bg（夜/昼插值）', cssVars['--bg']);
ok(cssVars['--t'] !== undefined && !Number.isNaN(parseFloat(cssVars['--t'])), '昼夜渐变因子 --t 已就绪', cssVars['--t']);
ok(cssVars['--accent-rgb'] && cssVars['--accent-rgb'].split(',').length === 3, 'accent RGB 三元组供透明度派生', cssVars['--accent-rgb']);

/* ---------- 2. 点节点展开 + B站分享文本拆解 + 发布 ---------- */
clickNode('噪音干扰型');
ok(registry.rankingOverlay.classList.contains('open'), '点击节点打开排行榜覆盖层');
ok(cards().length === 1 && cardTitle(cards()[0]).includes('雨声助眠 8 小时'), '点「噪音干扰型」展开样例卡', cards().length);
ok(cards()[0].children[1].textContent.includes('★ 4.9 · 302 次评价'), '样例卡渲染示例评分', cards()[0].children[1].textContent);
ok(cards()[0].querySelectorAll('.type')[0].textContent === '# 噪音干扰型', '类型标签 # 前缀无框样式');

g('fTitle').value = '';
g('fUrl').value = '【深海鲸鱼白噪音 · 循环三小时】 https://www.bilibili.com/video/BV1xx411c7mD?share_source=copy_web';
g('fUrl').dispatch('input');
ok(g('fTitle').value === '深海鲸鱼白噪音 · 循环三小时', '分享文本自动拆出标题', g('fTitle').value);
ok(g('fUrl').value === 'https://www.bilibili.com/video/BV1xx411c7mD?share_source=copy_web', '分享文本自动拆出链接');
const submitResult = await g('fSubmit').onclick().then(() => 'resolved').catch(e => 'THREW: ' + e.message);
ok(submitResult === 'resolved' && g('fMsg').classList.contains('ok'), '发布成功反馈 ok 态', g('fMsg').textContent);
ok(store().length === 1, '数据入库（契约字段）', store());

/* ---------- 3. URL 去重提示 ---------- */
g('fTitle').value = '换个标题再发一次';
g('fUrl').value = 'https://www.bilibili.com/video/BV1xx411c7mD?share_source=copy_web';
await g('fSubmit').onclick();
ok(g('fMsg').classList.contains('bad') && g('fMsg').textContent.includes('已经在社区里了'), '同链接被去重拦下', g('fMsg').textContent);
ok(store().length === 1, '去重不重复入库');
g('fTitle').value = '';
g('fUrl').value = 'http://m.bilibili.com/search/?keyword=%E9%9B%A8%E5%A3%B0%E5%8A%A9%E7%9C%A08%E5%B0%8F%E6%97%B6';
await g('fSubmit').onclick();
ok(g('fMsg').textContent.includes('已经在社区里了（雨声助眠 8 小时 · 雨打窗台）'), '与内置精选同链也被拦（协议/尾斜杠归一）', g('fMsg').textContent);

/* ---------- 4. AdGuard 拦截 ---------- */
g('fTitle').value = '兼职刷单加微信 abc12345';
g('fUrl').value = 'https://example.com/ads';
await g('fSubmit').onclick();
ok(g('fMsg').classList.contains('bad') && g('fMsg').textContent.startsWith('未发布：'), 'AdGuard 拦截广告内容', g('fMsg').textContent);
ok(store().length === 1, '被拦截内容不入库');

/* ---------- 5. 无类型节点 + 星星评分（社区卡） ---------- */
clickNode('无类型');
await sleep(10);
ok(cards().length === 1 && cardTitle(cards()[0]).includes('深海鲸鱼'), '「无类型」节点收录未分类推荐', cards().length);
const whaleCard = cards()[0];
ok(whaleCard.children[1].textContent.includes('bilibili.com'), '暂无评分时显示来源域名', whaleCard.children[1].textContent);
const rateBtn = whaleCard.querySelectorAll('.rate')[0];
ok(rateBtn.getAttribute('aria-expanded') === 'false', '评分按钮初始收起');
rateBtn.onclick();
const starsRow = whaleCard.children[2];
ok(starsRow.classList.contains('open'), '点评分按钮展开星星行');
ok(starsRow.querySelectorAll('.star').length === 5, '五颗星');
const star4 = starsRow.querySelectorAll('.star')[3];
star4.onmouseenter();
ok(starsRow.querySelectorAll('.star').filter(s => s.classList.contains('on')).length === 4, 'hover 第 4 颗预览点亮 4 颗');
starsRow.onmouseleave();
ok(starsRow.querySelectorAll('.star').every(s => !s.classList.contains('on')), '移出后预览清空');
await star4.onclick();
ok(starsRow.textContent.includes('已评分 ✓'), '评分后行内 ✓ 反馈', starsRow.textContent);
await sleep(1600);
ok(store()[0].ratings.join() === '4', '评分入库 ratings=[4]', store()[0].ratings);
const whaleCard2 = cards().find(c => cardTitle(c).includes('深海鲸鱼'));
ok(whaleCard2.children[1].textContent.includes('★ 4.0 · 1 次评价'), '刷新后 meta 显示聚合分', whaleCard2.children[1].textContent);
ok(whaleCard2.querySelectorAll('.rate')[0].getAttribute('aria-expanded') === 'false', '✓ 1.5s 后列表重渲染、入口复位');

/* ---------- 6. ESC 关闭星星行 ---------- */
whaleCard2.querySelectorAll('.rate')[0].onclick();
const row2 = whaleCard2.children[2];
ok(row2.classList.contains('open'), '再次展开');
docHandlers.keydown.forEach(fn => fn({ key: 'Escape' }));
ok(!row2.classList.contains('open'), 'ESC 关闭星星行');

/* ---------- 7. 自定义类型标签（可添加） ---------- */
g('fTitle').value = '篝火白噪音';
g('fUrl').value = 'https://example.com/campfire';
g('fType').value = '白噪音';
await g('fSubmit').onclick();
ok(g('fMsg').classList.contains('ok'), '自定义标签发布成功');
ok(liveNodes().some(n => n.children[1].textContent === '白噪音'), '自定义标签自动生成节点');
clickNode('白噪音');
ok(cards().length === 1 && cardTitle(cards()[0]).includes('篝火白噪音'), '自定义节点可筛选', cards().length);
ok(cards()[0].children[1].textContent.includes('# 白噪音'), '卡片标签以 # 前缀展示');
clickNode('白噪音');   /* 收起 */

/* ---------- 8. 样例评分模拟（并入示例聚合值） ---------- */
clickNode('噪音干扰型');
const noiseSampleCardUrl = cards()[0].children[0].children[1].href;   /* 噪音样例链接 */
const noiseSampleCard = cards().find(c => cardTitle(c).includes('雨声助眠 8 小时'));
noiseSampleCard.querySelectorAll('.rate')[0].onclick();
const srow = noiseSampleCard.children[2];
await srow.querySelectorAll('.star')[4].onclick();   /* 给 5 星 */
ok(sampleStore()[urlKey(noiseSampleCardUrl)].join() === '5', '样例评分存独立本地键（不污染契约数据）');
await sleep(1600);
const noiseMeta = cards().find(c => cardTitle(c).includes('雨声助眠 8 小时')).children[1].textContent;
ok(noiseMeta.includes('★ 4.9 · 303 次评价'), '样例评分并入示例聚合值（302→303 次）', noiseMeta);

/* ---------- 9. 发布面板 ---------- */
g('navPublish').onclick();
ok(g('formPanel').classList.contains('open'), '导航「推荐药方」展开面板');
g('navPublish').onclick();
ok(!g('formPanel').classList.contains('open'), '再点收起面板');
g('navPublish').onclick();
docHandlers.keydown.forEach(fn => fn({ key: 'Escape' }));
ok(!g('formPanel').classList.contains('open'), 'ESC 关闭面板');

/* ---------- 10. 导入合并去重 + APP 同款徽章 ---------- */
const fileRow = [
  { id: store()[0].id, title: '重复 id 的旧数据', url: 'https://old.example.com/1', type: null, ratings: [5], addedAt: 1 },
  { id: 1720000000001, title: '雨声（与内置精选同款）', url: 'https://m.bilibili.com/search?keyword=%E9%9B%A8%E5%A3%B0%E5%8A%A9%E7%9C%A08%E5%B0%8F%E6%97%B6', type: 'noise', ratings: [4,5], addedAt: 1720000000001 },
  { id: 1720000000002, title: '没链接的坏行', url: '', type: null, ratings: [], addedAt: 3 },
  { id: 1720000000003, title: '今晚的篝火声', url: 'https://example.com/fire2', type: 'white-noise', addedAt: 1720000000003 },
];
g('fileImport').files = [{ content: JSON.stringify(fileRow) }];
g('fileImport').onchange({ target: g('fileImport') });
await sleep(50);
ok(g('ioMsg').textContent.includes('已导入 2 条 · 跳过 2 条重复/无效'), '导入合并统计', g('ioMsg').textContent);
ok(store().length === 4, '合并入库 4 条', store().length);
ensureNode('噪音干扰型');
const twinCard = cards().find(c => cardTitle(c).includes('雨声（与内置精选同款）'));
ok(!!twinCard && twinCard.querySelectorAll('.twin').length === 1, '同款内容显示「APP 同款」徽章');
ok(twinCard && twinCard.querySelectorAll('.twin')[0].textContent === 'APP 同款', '徽章文案');

/* ---------- 11. 排序契约（噪音型内 + 纯函数） ---------- */
ensureNode('噪音干扰型');
const noiseTitles = cards().map(cardTitle);
ok(JSON.stringify(noiseTitles) === JSON.stringify([
  '【样例】雨声助眠 8 小时 · 雨打窗台',
  '雨声（与内置精选同款）']), '同类型内按平均分降序（样例与真实内容同榜）', noiseTitles);
ok(sortPicks([
  { title:'a', ratings:[4], addedAt:1 },
  { title:'b', ratings:[5], addedAt:2 },
  { title:'c', ratings:[4], addedAt:3 }
]).map(p => p.title).join(',') === 'b,c,a', 'sortPicks 纯函数：平均分→评分数→时间');

/* ---------- 12. 中英双语切换 ---------- */
g('navLang').onclick();
ok(g('navPublish').textContent === 'Prescribe' && g('brandTitle').textContent === 'Cyber Sleeping Pills', '切换 EN：导航与品牌变英文', g('brandTitle').textContent);
ok(liveNodes().some(n => n.children[1].textContent === 'Anxiety'), 'EN 下节点标签变英文');
ok(cards().length === 2 && cards().every(c => c.children[1].textContent.includes('# Noise')), 'EN 下类型标签 # Noise（噪音型 2 张卡）', cards().length);
g('navLang').onclick();
ok(g('navPublish').textContent === '推荐药方' && g('brandTitle').textContent === '电子安眠药', '切回中文：推荐药方 / 电子安眠药');

/* ---------- 13. 入场动画两段式（重播路径） ---------- */
sessionStore.delete('csc_intro_done');
playIntro();
ok(bodyKids.filter(n => n.id === 'intro').length === 1, '重播重建入场遮罩');
const replayIntro = bodyKids.filter(n => n.id === 'intro').pop();
await sleep(900);
ok(replayIntro.children[0].children[0].textContent.length > 0, '重播正在打字');
replayIntro.dispatch('click');   /* 第一次交互：显示全文并停住 */
ok(replayIntro.children[0].children[0].classList.contains('done'), '第一次交互显示全文');
ok(!replayIntro.classList.contains('bye'), '显示全文后停住，不自动进入');
replayIntro.dispatch('click');   /* 第二次交互：进入网站 */
ok(replayIntro.classList.contains('bye'), '第二次交互进入网站（淡出）');
await sleep(2600);
ok(!bodyKids.some(n => n.id === 'intro' && !n._removed), '淡出后遮罩移除');

/* ---------- 14. 无效链接 ---------- */
g('fTitle').value = '';
g('fUrl').value = 'not a url at all';
await g('fSubmit').onclick();
ok(g('fMsg').textContent === '链接无效，请检查', '无效链接文案');

console.log('\nALL PASS: ' + pass + ' assertions');
