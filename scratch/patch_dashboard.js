const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'clinic-frontend', 'src', 'app', 'dashboard', 'page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Remove import { ... } from '@/lib/mockData';
content = content.replace(/import\s*{[^}]*}\s*from\s*'@\/lib\/mockData';/, '');

// Replace specific fallbacks
content = content.replace(/\|\|\s*volumeTrend/g, '|| []');
content = content.replace(/\|\|\s*channelMix/g, '|| []');
content = content.replace(/\|\|\s*reservationFunnel/g, '|| []');
content = content.replace(/\|\|\s*cancellationReasons/g, '|| []');
content = content.replace(/\|\|\s*salesPipeline/g, '|| []');
content = content.replace(/\|\|\s*leadSources/g, '|| []');
content = content.replace(/\|\|\s*intentScoreDistribution/g, '|| []');
content = content.replace(/\|\|\s*complaintTopics/g, '|| []');
content = content.replace(/\|\|\s*feedbackWords/g, '|| []');
content = content.replace(/\|\|\s*issueCategories/g, '|| []');
content = content.replace(/\|\|\s*resolutionTimeDistribution/g, '|| []');
content = content.replace(/\|\|\s*unresolvedCases/g, '|| []');
content = content.replace(/\|\|\s*enquiryTopics/g, '|| []');
content = content.replace(/\|\|\s*repeatQueries/g, '|| []');
content = content.replace(/\|\|\s*dashboardKPIs/g, '|| {}');

// Rename terminology
content = content.replace(/Total Reservation Calls/g, 'Total Appointment Calls');
content = content.replace(/Total Reservations/g, 'Total Appointments');
content = content.replace(/Total Bookings Captured/g, 'Total Appointments Booked');
content = content.replace(/Total Covers/g, 'Total Patients');
content = content.replace(/Large Party Bookings Count/g, 'Multiple Patient Bookings Count');
content = content.replace(/Large Party Bookings Covers/g, 'Multiple Patient Bookings Patients');
content = content.replace(/Reservations %/g, 'Appointments %');
content = content.replace(/Avg Party Size/g, 'Avg Group Size');
content = content.replace(/Reservation Dashboard/g, 'Appointment Dashboard');
content = content.replace(/Reservation Data/g, 'Appointment Data');

fs.writeFileSync(targetFile, content);
console.log('Successfully patched dashboard/page.tsx');
