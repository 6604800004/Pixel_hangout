// รวมไฟล์ใน src/ เป็นหน้าเว็บไฟล์เดียว
//  - public/index.html          : สำหรับเซิร์ฟเวอร์ Node (มี PWA + เสียง/กล้อง)
//  - dist/pixel-hangout.html     : สำหรับเผยแพร่เป็นลิงก์ Claude (ไฟล์เดียวจบ)
const fs = require('fs');
const path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');

const js = ['sprites.js', 'world.js', 'net.js', 'voice.js', 'main.js', 'extras.js', 'speaker.js'].map(src).join('\n\n');
const page = src('index.html')
  .replace('/*CSS*/', () => src('style.css'))
  .replace('/*JS*/', () => `(() => {\n'use strict';\n${js}\n})();`);

const pwa = [
  '<link rel="manifest" href="/manifest.webmanifest" />',
  '<link rel="icon" href="/icon.svg" type="image/svg+xml" />',
  '<link rel="apple-touch-icon" href="/icon-192.png" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  "<script>if('serviceWorker' in navigator&&isSecureContext)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))</script>",
].join('\n');

fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), page.replace('<!--PWA-->', pwa));
fs.writeFileSync(path.join(__dirname, 'dist', 'pixel-hangout.html'), page.replace('<!--PWA-->', ''));
console.log('built public/index.html + dist/pixel-hangout.html', (page.length / 1024).toFixed(1) + ' KB');
