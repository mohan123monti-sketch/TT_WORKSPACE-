const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

fs.readdirSync(publicDir).forEach(file => {
  if (file.endsWith('.html')) {
    const filePath = path.join(publicDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the DOMContentLoaded listener
    // Usually it looks like: document.addEventListener('DOMContentLoaded', async () => {
    // Or: document.addEventListener('DOMContentLoaded', () => {
    
    // We want to turn it into: window.initPage = async () => {
    let modified = false;
    
    if (content.includes("document.addEventListener('DOMContentLoaded', async () => {")) {
      content = content.replace("document.addEventListener('DOMContentLoaded', async () => {", "window.initPage = async () => {");
      modified = true;
    } else if (content.includes("document.addEventListener('DOMContentLoaded', () => {")) {
      content = content.replace("document.addEventListener('DOMContentLoaded', () => {", "window.initPage = () => {");
      modified = true;
    }
    
    // Also we need to replace the closing `});` of that event listener.
    // In these files, it's usually at the end of the script before `function initModuleUI()` or `</script>`
    // The safest regex to replace the last `});` before `function` or `</script>`
    if (modified) {
       // Find the last `});` in the file. Since the script is at the bottom, it's typically the last `});`.
       // Let's use a clever regex to find the matching `});` that ends the block.
       // Actually, we can just replace all `});` that are on their own line with `};` but that's risky.
       // Let's find `    });` and replace it with `    };` ONLY if it's the one closing the DOMContentLoaded.
       // Since the files are consistently formatted:
       content = content.replace(/\n(\s*)\}\);(\s*(?:\n\s*function initModuleUI|<\/script>))/g, '\n$1};$2');
       
       fs.writeFileSync(filePath, content);
       console.log(`Converted ${file}`);
    }
  }
});
