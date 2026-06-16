/**
 * 帽子云 / Cloudflare Pages 等静态托管平台的构建脚本
 * 将 HTML、CSS、图片复制到 build/ 目录
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'build');

const files = ['index.html', 'styles.css', 'demo-changelog.html'];
const dirs = ['images'];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
    const src = path.join(root, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(outDir, file));
    }
}

for (const dir of dirs) {
    const src = path.join(root, dir);
    if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(outDir, dir), { recursive: true });
    }
}

console.log('✅ 静态资源已输出到 build/');
