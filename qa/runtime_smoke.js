const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const files = [
  'src/config/mastering-presets.js',
  'src/config/genre-presets.js',
  'src/config/reference-targets.js',
  'src/state/app-state.js',
  'src/app.js'
];
const listeners = [];
const document = {
  baseURI: 'http://localhost/index.html',
  addEventListener(type, handler) { listeners.push({ type, handlerType: typeof handler }); },
  head: { textContent: '', append() {} },
  body: { textContent: '', className: '' },
  createElement(tag) { return { tagName: tag, setAttribute(){}, append(){}, className:'', textContent:'', style:{}, rel:'', href:'', name:'', content:'' }; }
};
const window = {
  location: { protocol: 'http:', hostname: 'localhost', origin: 'http://localhost' },
  trustedTypes: null,
  addEventListener() {},
  screen: { width: 1920, height: 1080 },
  FoxBearFirebase: null
};
const context = vm.createContext({ console, window, document, URL, Set, Map, Math, Number, String, Boolean, Array, Object, Date, Promise, clearTimeout, setTimeout, Blob: function(){}, Worker: function(){}, location: window.location });
for (const file of files) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}
if (!listeners.some(item => item.type === 'DOMContentLoaded' && item.handlerType === 'function')) {
  throw new Error('DOMContentLoaded listener was not registered');
}
console.log('PASS runtime smoke: config/state/app script order initializes');
