const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function must(c,m){ if(!c){ console.error('FAIL ' + m); process.exit(1);} }
const app=read('src/app.js'); const html=read('index.html'); const pkg=JSON.parse(read('package.json'));
must(app.includes("const APP_VERSION = 'Pro v1.6.99'"),'version');
must(html.includes('data-build="1.6.99"'),'build');
must(app.includes('function runInitStep'),'init helper');
must(app.indexOf("runInitStep('파일 불러오기'") < app.indexOf("runInitStep('슬라이더 UI'"),'upload before ui');
must(html.includes('브라우저 확인 코덱만 표시'),'codec label');
must(html.includes('bottom-preview-action-left') && html.includes('bottom-preview-action-center') && html.includes('bottom-preview-action-right'),'three action groups');
must(html.includes('하이라이트') && html.includes('마스터링') && html.includes('원곡') && html.includes('마스터'),'dock labels');
must(JSON.stringify(pkg.qaChecks||[]).includes('dock_import_init_cleanup_smoke.js'),'runner includes this smoke');
console.log('PASS dock/import init cleanup smoke');
