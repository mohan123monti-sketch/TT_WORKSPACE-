const fs = require('fs');
const path = require('path');

const files = [
  'announcements.html',
  'clients.html',
  'dashboard.html',
  'profile.html',
  'projects.html',
  'submissions.html',
  'tasks.html',
  'users.html',
  'drive.html'
];

const driveMenuItem = `
        <div class="menu-item" onclick="window.location.href='drive.html'">
          <i class="fas fa-hdd"></i>
          <span class="menu-text">Secure Drive</span>
        </div>`;

files.forEach(f => {
  const filePath = path.join(__dirname, '../public', f);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Only add if not there
  if (!content.includes('drive.html')) {
    // Add it after User Management if possible
    if (content.includes('users.html')) {
      content = content.replace(/(admin-only" onclick="window\.location\.href='users\.html'">[\s\S]*?<\/div>)/, `$1${driveMenuItem}`);
    } else {
      // Fallback: before hr or end of menu
      content = content.replace(/(<div class="menu-item" onclick="window\.location\.href='profile\.html'">)/, `${driveMenuItem}$1`);
    }
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated sidebar in ${f}`);
});
