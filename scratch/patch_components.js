const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '..', 'clinic-frontend', 'src', 'components');

const filesToPatch = [
    'AspectBarsBW.tsx',
    'HeatmapCard.tsx',
    'LeaderboardTableBW.tsx',
    'SideDrawer.tsx'
];

filesToPatch.forEach(file => {
    const targetFile = path.join(componentsDir, file);
    if (!fs.existsSync(targetFile)) return;
    
    let content = fs.readFileSync(targetFile, 'utf8');

    // Remove imports
    content = content.replace(/import\s*{[^}]*}\s*from\s*'@\/lib\/mockData';\n?/g, '');
    
    // Specifically patch AspectBarsBW.tsx
    if (file === 'AspectBarsBW.tsx') {
        content = content.replace(/aspectSentiment/g, '[]');
    }
    
    // Specifically patch HeatmapCard.tsx
    if (file === 'HeatmapCard.tsx') {
        content = content.replace(/demandHeatmap/g, '[]');
    }

    // Specifically patch LeaderboardTableBW.tsx
    if (file === 'LeaderboardTableBW.tsx') {
        content = content.replace(/siteLeaderboard/g, '[]');
    }

    fs.writeFileSync(targetFile, content);
    console.log(`Successfully patched ${file}`);
});
