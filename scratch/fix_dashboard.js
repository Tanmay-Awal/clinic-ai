const fs = require('fs');
const path = require('path');

const filesToClean = [
  'D:\\Clinic Development Sales\\clinic-backend\\src\\dashboard\\dashboard.service.ts',
  'D:\\Clinic Development Sales\\clinic-backend\\src\\dashboard\\dashboard.module.ts',
  'D:\\Clinic Development Sales\\clinic-backend\\src\\dashboard\\dashboard.controller.ts',
  'D:\\Clinic Development Sales\\clinic-backend\\src\\ai\\ai.service.ts',
  'D:\\Clinic Development Sales\\clinic-backend\\src\\ai\\ai.module.ts',
  'D:\\Clinic Development Sales\\clinic-backend\\src\\ai\\ai.controller.ts',
  'D:\\Clinic Development Sales\\clinic-backend\\src\\call\\call.module.ts'
];

for (const file of filesToClean) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Remove imports
    content = content.replace(/import .* from '.*(housekeeping|room-reservation|table-reservation|fredricks|reservation).*';\n/g, '');

    // Remove module array entries
    content = content.replace(/TableReservation,/g, '');
    content = content.replace(/RoomReservation,/g, '');
    content = content.replace(/Housekeeping,/g, '');
    content = content.replace(/Reservation,/g, '');
    content = content.replace(/FredricksEmailNotification,/g, '');
    content = content.replace(/FredricksReservation,/g, '');

    // Replace DTOs
    content = content.replace(/import .* from '.*(housekeeping-dashboard.dto|reservation-dashboard.dto).*';\n/g, '');

    // Remove specific functions that use these repos from dashboard.service.ts
    if (file.includes('dashboard.service.ts')) {
        // Strip out entire functions if they mention fredricksEmailRepo or housekeepingRepository
        content = content.replace(/\n  async \w+\([\s\S]*?\{[\s\S]*?this\.fredricksEmailRepo[\s\S]*?^\s*\}/gm, '');
        content = content.replace(/\n  async \w+\([\s\S]*?\{[\s\S]*?this\.housekeepingRepository[\s\S]*?^\s*\}/gm, '');
        
        // Let's just remove the constructor injections we didn't remove properly
        content = content.replace(/@InjectRepository\(FeedbackDetails\)[\s\S]*?feedbackDetailsRepository: Repository<FeedbackDetails>,/g, '');
        content = content.replace(/@InjectRepository\(WeeklyInsight\)[\s\S]*?weeklyInsightRepository: Repository<WeeklyInsight>,/g, '');
        
        // Remove methods
        content = content.replace(/async getAnalyticsInsights[\s\S]*?\n  \}/g, '');
        content = content.replace(/async getCallCategoryBreakdown[\s\S]*?\n  \}/g, '');
        content = content.replace(/async getReservationDashboard[\s\S]*?\n  \}/g, '');
        
        // Fix user agent issue
        content = content.replace(/this\.userAgentRepository/g, 'this.userRepository');
    }

    if (file.includes('ai.service.ts')) {
        content = content.replace(/import OpenAI from 'openai';\n/g, '');
        content = content.replace(/import .*ExtractCallDataDto.*/g, '');
    }

    fs.writeFileSync(file, content);
  }
}

console.log('Cleaned up imports and unused functions.');
