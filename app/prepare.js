// Собирает папку app/www из файлов сайта и прописывает адрес API для приложения.
// Запуск: API_BASE_URL=https://ваш-сайт.example node app/prepare.js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(__dirname, 'www');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

for (const file of ['index.html', 'manifest.webmanifest']) {
  fs.copyFileSync(path.join(root, file), path.join(www, file));
}
fs.cpSync(path.join(root, 'icons'), path.join(www, 'icons'), { recursive: true });

const base = (process.env.API_BASE_URL || '').trim().replace(/\/+$/, '');
if (!base) {
  console.warn('⚠ API_BASE_URL не задан: расписание будет работать, но замены и уведомления в приложении не загрузятся.');
} else if (!/^https:\/\//.test(base)) {
  console.error('API_BASE_URL должен начинаться с https://');
  process.exit(1);
}
fs.writeFileSync(path.join(www, 'app-config.js'), 'window.APP_API_BASE = ' + JSON.stringify(base) + ';\n');

console.log('Папка www готова: ' + fs.readdirSync(www).join(', '));
