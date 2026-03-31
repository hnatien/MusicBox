import fs from 'fs';

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

const patch = `
// Real stats API
async function updateStats() {
  try {
    const res = await fetch("/api/stats");
    const data = await res.json();
    const srv = document.getElementById("stat-servers");
    const sng = document.getElementById("stat-songs");
    const upt = document.getElementById("stat-uptime");
    if (srv) srv.innerHTML = data.servers + "<span>+</span>";
    if (sng) sng.innerHTML = data.songsPlayed + "<span>+</span>";
    if (upt) upt.innerHTML = data.uptime;
  } catch(e) {}
}
updateStats();
setInterval(updateStats, 15000);
`;

if (content.indexOf('// Real stats API') === -1) {
    content = content.replace('</script>', patch + '</script>');
    fs.writeFileSync(htmlPath, content);
    console.log('Update successful');
} else {
    console.log('Already updated');
}
