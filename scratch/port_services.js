const fs = require('fs');
const path = require('path');

const srcCallPath = 'D:\\HuemanAI Development Sales\\sales-suit-backend\\src\\call\\call.service.ts';
const destCallPath = 'D:\\Clinic Development Sales\\clinic-backend\\src\\call\\call.service.ts';

const srcDashPath = 'D:\\HuemanAI Development Sales\\sales-suit-backend\\src\\dashboard\\dashboard.service.ts';
const destDashPath = 'D:\\Clinic Development Sales\\clinic-backend\\src\\dashboard\\dashboard.service.ts';

function replaceKeywords(content) {
    let newContent = content;
    // Replace DB relationships
    newContent = newContent.replace(/TableReservation/g, 'Appointment');
    newContent = newContent.replace(/tableReservation/g, 'appointment');
    newContent = newContent.replace(/table_reservation/g, 'appointment');
    newContent = newContent.replace(/RoomReservation/g, 'Appointment');
    newContent = newContent.replace(/FredricksReservation/g, 'Appointment');
    
    // Replace domain specific fields
    newContent = newContent.replace(/covers/g, 'duration_minutes');
    newContent = newContent.replace(/dining_area/g, 'notes');
    
    // Strip out unavailable repositories from constructors
    newContent = newContent.replace(/@InjectRepository\(Housekeeping\)[\s\S]*?housekeepingRepository: Repository<Housekeeping>,/g, '');
    newContent = newContent.replace(/@InjectRepository\(FeedbackDetails\)[\s\S]*?feedbackDetailsRepository: Repository<FeedbackDetails>,/g, '');
    newContent = newContent.replace(/@InjectRepository\(UserAgent\)[\s\S]*?userAgentRepository: Repository<UserAgent>,/g, '');
    newContent = newContent.replace(/@InjectRepository\(WeeklyInsight\)[\s\S]*?weeklyInsightRepository: Repository<WeeklyInsight>,/g, '');
    newContent = newContent.replace(/@InjectRepository\(FredricksEmailNotification\)[\s\S]*?fredricksEmailRepo: Repository<FredricksEmailNotification>,/g, '');
    newContent = newContent.replace(/@InjectRepository\(FredricksReservation\)[\s\S]*?fredricksReservationRepo: Repository<FredricksReservation>,/g, '');
    newContent = newContent.replace(/@InjectRepository\(UserInteraction\)[\s\S]*?userInteractionRepository: Repository<UserInteraction>,/g, '');
    newContent = newContent.replace(/@InjectRepository\(InteractionType\)[\s\S]*?interactionTypeRepository: Repository<InteractionType>,/g, '');
    newContent = newContent.replace(/@InjectRepository\(OrganizationHours\)[\s\S]*?organizationHoursRepository: Repository<OrganizationHours>,/g, '');
    newContent = newContent.replace(/@InjectRepository\(Reservation\)[\s\S]*?reservationRepository: Repository<Reservation>,/g, '');
    newContent = newContent.replace(/@InjectRepository\(RoomReservation\)[\s\S]*?roomReservationRepository: Repository<Appointment>,/g, '');

    // Comment out agentIds map logic since clinic is single tenant
    newContent = newContent.replace(/this\.getAgentIds\(Number\(userId\)\);/g, "[] /* single tenant */");
    newContent = newContent.replace(/if \(agentIds\.length === 0\) \{[\s\S]*?return \{[\s\S]*?totalCalls: 0,[\s\S]*?\};[\s\S]*?\}/g, "/* agentIds check removed for single tenant */");
    
    // Replace getAgentClause
    newContent = newContent.replace(/const getAgentClause = \(alias: string\) => \{[\s\S]*?return '1=1'; \/\/ No-op[\s\S]*?\};/g, "const getAgentClause = (alias: string) => { return '1=1'; };");
    
    // Comment out Fredricks logic
    newContent = newContent.replace(/const isFredricksUser[\s\S]*?checkIsFredricksOrg\(user\);/g, "const isFredricksUser = false;");

    return newContent;
}

try {
    let callContent = fs.readFileSync(srcCallPath, 'utf8');
    callContent = replaceKeywords(callContent);
    fs.writeFileSync(destCallPath, callContent);
    console.log('Successfully ported call.service.ts');

    let dashContent = fs.readFileSync(srcDashPath, 'utf8');
    dashContent = replaceKeywords(dashContent);
    fs.writeFileSync(destDashPath, dashContent);
    console.log('Successfully ported dashboard.service.ts');
} catch (e) {
    console.error(e);
}
