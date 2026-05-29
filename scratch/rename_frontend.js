const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '..', 'clinic-frontend', 'src');

const replacements = [
  { regex: /Restaurant/g, replacement: 'Clinic' },
  { regex: /restaurant/g, replacement: 'clinic' },
  { regex: /Table Reservation/g, replacement: 'Appointment' },
  { regex: /table reservation/gi, replacement: 'appointment' },
  { regex: /Reservation/g, replacement: 'Appointment' },
  { regex: /reservation/g, replacement: 'appointment' },
  { regex: /Table/g, replacement: 'Appointment' }, // Risky, but usually referring to table reservations
  { regex: /table/g, replacement: 'appointment' }, // Risky
  { regex: /Housekeeping/g, replacement: 'Staff Tasks' },
  { regex: /Fredricks/g, replacement: 'City Health Clinic' },
  { regex: /Machynys Resort/g, replacement: '' }
];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            // Skip node_modules or build dirs if somehow inside src
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(directoryPath);
let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Don't replace literal "Table" if it's imported from lucide-react or tanstack table
    // But for UI labels, it's fine. It's safer to do manual replacements or exact string replacements.
    // Let's stick to the safer ones:
    content = content.replace(/Restaurant/g, 'Clinic');
    content = content.replace(/restaurant/g, 'clinic');
    content = content.replace(/Table Reservation/gi, 'Appointment');
    content = content.replace(/Table Booking/gi, 'Appointment');
    content = content.replace(/Room Reservation/gi, 'In-patient Booking');
    content = content.replace(/Covers/g, 'Duration (Mins)');
    content = content.replace(/covers/g, 'duration');
    content = content.replace(/Fredricks/g, 'City Health Clinic');
    content = content.replace(/Housekeeping/g, 'Staff Tasks');

    // Remove feedback and housekeeping from sidebar!
    // If it's a sidebar file, we can strip out the housekeeping links.
    if (file.includes('sidebar.tsx') || file.includes('navigation.ts')) {
        content = content.replace(/\{[^}]*Feedback[^}]*\}/g, '/* Feedback hidden */');
        content = content.replace(/\{[^}]*Housekeeping[^}]*\}/g, '/* Housekeeping hidden */');
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        modifiedCount++;
    }
});

console.log(`Modified ${modifiedCount} files.`);
