import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppointmentsService } from './appointments/appointments.service';
import { UserService } from './user/user.service';
import { DataSource } from 'typeorm';
import { Call } from './entities/call.entity';
import { CallAnalysis } from './entities/call-analysis.entity';
import { CallTranscript } from './entities/call-transcript.entity';
import { FeedbackDetails } from './entities/feedback-details.entity';
import { Action } from './entities/action.entity';
import { WeeklyInsight } from './entities/weekly-insight.entity';
import { MonthlyInsight } from './entities/monthly-insight.entity';

import { OrganisationSettings } from './entities/organisation-settings.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const appointmentsService = app.get(AppointmentsService);
  const userService = app.get(UserService);

  console.log('🚀 Starting Full Relational Master Database Seeding...');

  // 1. Seed Doctors
  console.log('👨‍⚕️ Seeding Doctors...');
  const doctorsData = [
    { name: 'Dr. Sarah Davis', specialization: 'Pediatrics', working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], working_hours_start: '08:00', working_hours_end: '16:00' },
    { name: 'Dr. Robert Jones', specialization: 'Cardiology', working_days: ['Monday', 'Wednesday', 'Friday'], working_hours_start: '10:00', working_hours_end: '18:00' },
    { name: 'Dr. Emily Chen', specialization: 'General Practice', working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], working_hours_start: '09:00', working_hours_end: '17:00' },
    { name: 'Dr. Marcus Vance', specialization: 'Dermatology', working_days: ['Tuesday', 'Thursday', 'Friday'], working_hours_start: '10:00', working_hours_end: '16:00' },
    { name: 'Dr. Anita Patel', specialization: 'Orthopedics', working_days: ['Monday', 'Tuesday', 'Thursday'], working_hours_start: '08:30', working_hours_end: '16:30' }
  ];

  const doctors: any[] = [];
  for (const doc of doctorsData) {
    const d = await appointmentsService.createDoctor({ ...doc, is_active: true });
    doctors.push(d);
  }

  // 2. Seed Admin User & Default Organisation
  console.log('🔐 Seeding Admin User & Default Organisation...');
  const userRepo = dataSource.getRepository('User');
  let adminUser: any = await userRepo.findOne({ where: { email: 'admin@clinic.ai' } });
  if (!adminUser) {
    const res = await userService.register({
      email: 'admin@clinic.ai',
      password: 'adminpassword123',
      first_name: 'Admin',
      last_name: 'User',
    });
    adminUser = res.user;
    console.log('   Admin user created: admin@clinic.ai / adminpassword123');
  } else {
    console.log('   Admin user already exists.');
  }

  const orgSettingsRepo = dataSource.getRepository(OrganisationSettings);
  let defaultOrg = await orgSettingsRepo.findOne({ where: {} });
  if (!defaultOrg) {
    defaultOrg = orgSettingsRepo.create({
      organisation_name: 'CliniCall Healthcare',
      business_type: 'Clinic',
      default_timezone: 'Asia/Kolkata',
      updated_by: 'admin@clinic.ai',
    });
    defaultOrg = await orgSettingsRepo.save(defaultOrg);
    console.log('   Default organisation created: CliniCall Healthcare');
  }

  if (adminUser && !adminUser.organisation_id) {
    adminUser.organisation_id = defaultOrg.id;
    await userRepo.save(adminUser);
  }

  const callRepo = dataSource.getRepository(Call);
  const callAnalysisRepo = dataSource.getRepository(CallAnalysis);
  const transcriptRepo = dataSource.getRepository(CallTranscript);
  const feedbackRepo = dataSource.getRepository(FeedbackDetails);
  const actionRepo = dataSource.getRepository(Action);
  const weeklyRepo = dataSource.getRepository(WeeklyInsight);
  const monthlyRepo = dataSource.getRepository(MonthlyInsight);

  // Clear existing mock entries to prevent duplication errors
  await dataSource.query('TRUNCATE TABLE feedback_details, call_transcripts, call_analyses, actions, calls, weekly_insights, monthly_insights CASCADE;');

  const samplePatients = [
    { name: 'Alice Smith', phone: '+14155552671', location: 'San Francisco, CA' },
    { name: 'Bob Johnson', phone: '+12125559812', location: 'New York, NY' },
    { name: 'Carol Danvers', phone: '+13105553489', location: 'Los Angeles, CA' },
    { name: 'David Miller', phone: '+13125557821', location: 'Chicago, IL' },
    { name: 'Emma Wilson', phone: '+14045551290', location: 'Atlanta, GA' },
    { name: 'Frank Wright', phone: '+12065554312', location: 'Seattle, WA' },
    { name: 'Grace Taylor', phone: '+13055558901', location: 'Miami, FL' },
    { name: 'Henry Ford', phone: '+12145556743', location: 'Dallas, TX' },
    { name: 'Isabella Martinez', phone: '+16025553210', location: 'Phoenix, AZ' },
    { name: 'Jack Brown', phone: '+17025559087', location: 'Las Vegas, NV' }
  ];

  const categories = ['Booking Inquiry', 'Appointment Cancellation', 'Reschedule Request', 'General Medical Question', 'Urgent Symptom Triage'];
  const sentiments = ['Positive', 'Neutral', 'Negative'];

  // Build explicit list of 80 call specifications so outcome categories add up cleanly:
  // 28 Appointment Booked, 22 General Assistance, 12 Enquiry Handled, 6 Reschedule Requested, 5 Action Required, 4 Booking Cancelled, 3 Urgent Case = 80 Total Calls
  const callSpecs: { category: string; appointmentCreated: boolean; transferToHuman: boolean; createOpenAction: boolean }[] = [];
  
  for (let i = 0; i < 28; i++) callSpecs.push({ category: 'Booking Inquiry', appointmentCreated: true, transferToHuman: false, createOpenAction: false });
  for (let i = 0; i < 22; i++) callSpecs.push({ category: 'General Medical Question', appointmentCreated: false, transferToHuman: false, createOpenAction: false });
  for (let i = 0; i < 12; i++) callSpecs.push({ category: 'Inquiry', appointmentCreated: false, transferToHuman: false, createOpenAction: false });
  for (let i = 0; i < 6; i++) callSpecs.push({ category: 'Reschedule Request', appointmentCreated: false, transferToHuman: false, createOpenAction: false });
  for (let i = 0; i < 5; i++) callSpecs.push({ category: 'Callback Request', appointmentCreated: false, transferToHuman: false, createOpenAction: true });
  for (let i = 0; i < 4; i++) callSpecs.push({ category: 'Appointment Cancellation', appointmentCreated: false, transferToHuman: false, createOpenAction: false });
  for (let i = 0; i < 3; i++) callSpecs.push({ category: 'Urgent Symptom Triage', appointmentCreated: false, transferToHuman: true, createOpenAction: false });

  console.log('📞 Seeding 80 Relational Calls, Transcripts, Feedback & Analyses...');
  const now = new Date();

  for (let i = 0; i < callSpecs.length; i++) {
    const spec = callSpecs[i];
    const patient = samplePatients[i % samplePatients.length];
    const category = spec.category;
    const sentiment = spec.transferToHuman ? 'Negative' : (i % 3 === 0 ? 'Neutral' : 'Positive');
    const isSuccessful = !spec.transferToHuman;
    const assignedDoc = doctors[i % doctors.length];

    // Spread calls smoothly across the last 25 days, varying hours of the day (8 AM to 5 PM)
    const daySpread = (i * 11) % 25;
    const hourSpread = 8 + ((i * 3) % 10);
    const minuteSpread = (i * 17) % 60;
    const pastTime = new Date(now.getTime() - (daySpread * 24 * 60 * 60 * 1000) - (hourSpread * 60 * 60 * 1000) - (minuteSpread * 60 * 1000));

    const visitOffsetDays = ((i % 4) + 1);
    const visitDateObj = new Date(pastTime.getTime() + (visitOffsetDays * 24 * 60 * 60 * 1000));
    const apptDateStr = visitDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const apptTimeStr = `${(9 + (i % 8)).toString().padStart(2, '0')}:00 AM`;

    // Generate rich realistic transcript and detailed bullet summary based on scenario
    let summaryText = '';
    let dialogue: { role: string; text: string }[] = [];

    if (category === 'Booking Inquiry') {
      summaryText = `• Patient ${patient.name} called CliniCall Healthcare to schedule a consultation with ${assignedDoc.name} (${assignedDoc.specialization}).\n• AI Receptionist verified doctor availability and successfully booked a 30-minute slot for ${apptDateStr} at ${apptTimeStr}.\n• Instant SMS confirmation dispatched to ${patient.phone}. Patient sentiment was positive and cooperative.`;
      dialogue = [
        { role: 'assistant', text: `Hello! Thank you for calling CliniCall Healthcare. I am your AI receptionist. How can I help you today?` },
        { role: 'user', text: `Hi, I'd like to schedule an appointment with ${assignedDoc.name} for a routine checkup.` },
        { role: 'assistant', text: `I can certainly help you with that, ${patient.name}. Let me check ${assignedDoc.name}'s schedule for available slots.` },
        { role: 'user', text: `Great, thank you! Do you have any openings available on ${apptDateStr}?` },
        { role: 'assistant', text: `Yes, we have an open slot on ${apptDateStr} at ${apptTimeStr}. Would that time work well for you?` },
        { role: 'user', text: `Yes, ${apptTimeStr} on ${apptDateStr} works perfectly for me.` },
        { role: 'assistant', text: `Wonderful! I have booked your appointment with ${assignedDoc.name} on ${apptDateStr} at ${apptTimeStr}. A text confirmation has been sent to ${patient.phone}.` },
        { role: 'user', text: `Thank you so much, you've been very helpful!` },
        { role: 'assistant', text: `You're very welcome, ${patient.name}! Have a fantastic day ahead.` }
      ];
    } else if (category === 'General Medical Question') {
      summaryText = `• Patient ${patient.name} inquired regarding clinic opening hours, prescription refill policies, and consultation requirements.\n• AI Receptionist explained standard operating hours (8:00 AM - 5:00 PM) and 24-48 hour prescription authorization timelines.\n• Patient query fully resolved without requiring staff escalation.`;
      dialogue = [
        { role: 'assistant', text: `Hello! Thank you for contacting CliniCall Healthcare. I am your AI receptionist. How can I help you?` },
        { role: 'user', text: `Hi, I wanted to ask about your clinic opening hours and how prescription refills are handled.` },
        { role: 'assistant', text: `Happy to help, ${patient.name}! Our clinic is open Monday through Saturday from 8:00 AM to 5:00 PM. Refills usually take 24 to 48 hours to process.` },
        { role: 'user', text: `Do I need a new appointment for routine prescription renewals?` },
        { role: 'assistant', text: `If your last checkup was within the past six months, your physician can usually reauthorize your refill without requiring a new visit.` },
        { role: 'user', text: `That is very clear and helpful. Thank you!` },
        { role: 'assistant', text: `My pleasure, ${patient.name}! Feel free to reach out anytime if you need anything else.` }
      ];
    } else if (category === 'Inquiry') {
      summaryText = `• Patient ${patient.name} called following up on recent laboratory blood test reports.\n• AI Receptionist informed the caller that lab results are processed and uploaded to the secure patient portal within 24-48 hours.\n• Provided instructions for portal access and physical report pickup at the front desk.`;
      dialogue = [
        { role: 'assistant', text: `Good day! Thank you for calling CliniCall Healthcare. I am your AI receptionist, how may I assist you today?` },
        { role: 'user', text: `Hi, I had lab tests done earlier this week and wanted to check if my results are ready.` },
        { role: 'assistant', text: `Thank you for checking, ${patient.name}. Routine blood work results are uploaded to your online portal within 24 to 48 hours.` },
        { role: 'user', text: `Can I also pick up a physical copy if needed?` },
        { role: 'assistant', text: `Yes! You can download the PDF from your portal or pick up a printed report at the front desk with photo ID.` },
        { role: 'user', text: `Great, I will check the portal this afternoon. Thanks!` },
        { role: 'assistant', text: `You're welcome, ${patient.name}! Wishing you good health.` }
      ];
    } else if (category === 'Reschedule Request') {
      summaryText = `• Patient ${patient.name} requested to reschedule an upcoming consultation due to a work conflict.\n• AI Receptionist located the existing booking and moved the visit slot to ${apptDateStr} at ${apptTimeStr}.\n• Revised SMS notification and updated calendar invite dispatched.`;
      dialogue = [
        { role: 'assistant', text: `Hello! Thank you for calling CliniCall Healthcare. I am your AI receptionist. How can I assist you?` },
        { role: 'user', text: `Hi, I need to reschedule my consultation because of a work conflict.` },
        { role: 'assistant', text: `I can certainly help with that, ${patient.name}. Let me pull up your current booking.` },
        { role: 'user', text: `Do you have availability on ${apptDateStr}?` },
        { role: 'assistant', text: `Yes, we have an open slot on ${apptDateStr} at ${apptTimeStr}. Would that suit your schedule?` },
        { role: 'user', text: `Yes, ${apptDateStr} at ${apptTimeStr} works much better.` },
        { role: 'assistant', text: `Perfect! Your appointment has been updated to ${apptDateStr} at ${apptTimeStr}. A confirmation was sent to your mobile.` },
        { role: 'user', text: `Thanks a lot for making that quick and easy!` },
        { role: 'assistant', text: `Glad I could help, ${patient.name}! See you then.` }
      ];
    } else if (category === 'Callback Request') {
      summaryText = `• Patient ${patient.name} called requesting to speak with a billing specialist regarding an insurance claim statement.\n• AI Receptionist verified contact details (${patient.phone}) and logged an open high-priority action item for staff.\n• Callback scheduled for billing team within 2 hours.`;
      dialogue = [
        { role: 'assistant', text: `Hello, thank you for calling CliniCall Healthcare. I am your AI receptionist. How can I help you today?` },
        { role: 'user', text: `Hi, I have a detailed question about an insurance claim statement and need to speak with billing.` },
        { role: 'assistant', text: `I understand, ${patient.name}. Our billing specialists are currently assisting other patients, but I can log a priority callback for you.` },
        { role: 'user', text: `Yes please, I would like a representative to call me back as soon as possible.` },
        { role: 'assistant', text: `I have created a callback ticket for our billing team to reach you at ${patient.phone} within the next two hours.` },
        { role: 'user', text: `Thank you very much.` },
        { role: 'assistant', text: `You're welcome, ${patient.name}! Have a pleasant day.` }
      ];
    } else if (category === 'Appointment Cancellation') {
      summaryText = `• Patient ${patient.name} called to cancel an upcoming clinic booking.\n• AI Receptionist processed the cancellation, released the appointment slot back to schedule, and dispatched confirmation text.\n• Encouraged patient to rebook online whenever convenient.`;
      dialogue = [
        { role: 'assistant', text: `Hello! Thank you for calling CliniCall Healthcare. I am your AI receptionist, how can I assist you today?` },
        { role: 'user', text: `Hi, unfortunately I need to cancel my upcoming appointment.` },
        { role: 'assistant', text: `I'm sorry to hear that, ${patient.name}. Let me locate your booking and process the cancellation.` },
        { role: 'user', text: `Thank you. Will I be able to rebook online later?` },
        { role: 'assistant', text: `Yes! Your appointment is now cancelled. You can rebook anytime via our website or by calling us back.` },
        { role: 'user', text: `Great, thank you for processing that.` },
        { role: 'assistant', text: `You're welcome, ${patient.name}! Take care.` }
      ];
    } else {
      summaryText = `• Patient ${patient.name} called reporting acute severe symptoms requiring emergency medical evaluation.\n• AI Receptionist initiated emergency triage protocols, flagged high priority, and executed a live transfer to duty physician ${assignedDoc.name}.\n• Warm handoff executed successfully in under 45 seconds.`;
      dialogue = [
        { role: 'assistant', text: `Thank you for calling CliniCall Healthcare. I am your AI receptionist. How can I help you?` },
        { role: 'user', text: `Hi, I am experiencing sudden severe symptoms and need to talk to a doctor right away!` },
        { role: 'assistant', text: `I understand your concern, ${patient.name}. Because you are reporting acute symptoms, I am immediately prioritizing your call.` },
        { role: 'user', text: `Thank you, please connect me to a doctor as soon as possible.` },
        { role: 'assistant', text: `I am transferring your call directly to duty physician ${assignedDoc.name} right now. Please stay on the line.` },
        { role: 'user', text: `Thank you, holding.` },
        { role: 'assistant', text: `Connecting you now to ${assignedDoc.name}...` }
      ];
    }

    // A. Insert Call Record
    const call = callRepo.create({
      call_id: `call_rec_${Date.now()}_${i}`,
      agent_id: 'agent_ai_01',
      agent_name: 'AI Receptionist',
      call_source: 'pipecat',
      call_direction: i % 4 === 0 ? 'outbound' : 'inbound',
      from_number: patient.phone,
      to_number: '+18005550199',
      display_mobile_number: patient.phone,
      disconnection_reason: spec.transferToHuman ? 'transfer_to_agent' : 'user_hangup',
      call_status: 'ended',
      call_duration_ms: Math.floor(Math.random() * 120000) + 75000,
      call_start_time: pastTime,
      call_end_time: new Date(pastTime.getTime() + 120000),
      category: category,
      sub_category: category === 'Booking Inquiry' ? 'New Patient' : 'Follow-up',
      needs_ai_processing: false,
      is_visible: true,
      appointment_created: spec.appointmentCreated,
      transfer_to_human: spec.transferToHuman,
      transcript: JSON.stringify(dialogue),
      created_at: pastTime
    });

    const savedCall = await callRepo.save(call);
    const callIdNum = Number(savedCall.id);

    // B. Insert Separate Call Transcripts per line
    for (let idx = 0; idx < dialogue.length; idx++) {
      const line = dialogue[idx];
      const lineTime = new Date(pastTime.getTime() + (idx * 12000));
      const tRecord = transcriptRepo.create({
        call_id: callIdNum,
        role: line.role,
        transcript: line.text,
        created_at: lineTime
      });
      await transcriptRepo.save(tRecord);
    }

    // C. Insert Call Analysis
    const analysis = callAnalysisRepo.create({
      call_id: callIdNum,
      call_summary: summaryText,
      user_sentiment: sentiment,
      sentiment_percentage: sentiment === 'Positive' ? 94.0 : (sentiment === 'Neutral' ? 62.0 : 22.5),
      call_successful: isSuccessful,
      name: patient.name,
      location: patient.location,
      contact_number: patient.phone,
      created_at: pastTime
    });
    await callAnalysisRepo.save(analysis);

    // D. Insert Detailed Feedback
    const feedback = feedbackRepo.create({
      call_id: callIdNum,
      guest_name: patient.name,
      feedback_type: isSuccessful ? 'Compliment' : 'Complaint',
      feedback_topic: 'Service Experience',
      rating: isSuccessful ? 5 : 2,
      positives: isSuccessful ? ['Polite Voice Agent', 'Fast Booking', 'Clear Instructions'] : ['Calls answered quickly'],
      negatives: isSuccessful ? [] : ['Long hold time', 'Transferred to receptionist'],
      summary: [`Overall call experience was ${sentiment.toLowerCase()}`],
      sentiment_meter: isSuccessful ? 0.92 : 0.25,
      call_outcome: isSuccessful ? 'positive_with_booking' : 'negative_escalated',
      recommended: isSuccessful
    });
    await feedbackRepo.save(feedback);

    // E. Insert Action Items
    if (spec.createOpenAction) {
      const action = actionRepo.create({
        call_id: callIdNum,
        type: 'callback',
        priority: 'medium',
        status: 'open',
        caller_phone: patient.phone,
        description: `Follow-up required for ${patient.name} regarding ${category}.`,
        notes: `Automated action linked to Call ID #${callIdNum}`,
        repeat_count: 1,
        created_at: pastTime
      });
      await actionRepo.save(action);
    }

    // F. Seed Appointment (For 28 Appointment Booked calls)
    if (spec.appointmentCreated) {
      const assignedDoc = doctors[i % doctors.length];
      const visitOffsetDays = ((i % 4) + 1);
      const visitDateObj = new Date(pastTime.getTime() + (visitOffsetDays * 24 * 60 * 60 * 1000));
      const apptDate = visitDateObj.toISOString().split('T')[0];

      const createdApt = await appointmentsService.createAppointment({
        doctor_id: assignedDoc.id,
        patient_name: patient.name,
        patient_phone: patient.phone,
        date: apptDate,
        time: `${(9 + (i % 8)).toString().padStart(2, '0')}:00:00`,
        status: 'booked',
        duration_minutes: 30,
        created_from_call_id: callIdNum,
        created_at: pastTime
      });

      // Explicitly update created_at so TypeORM default timestamp column doesn't overwrite it
      await dataSource.query('UPDATE appointments SET created_at = $1 WHERE id = $2', [pastTime, createdApt.id]);
    }
  }

  // 5. Seed Weekly & Monthly Insights
  console.log('📊 Seeding Weekly & Monthly Analytics Insights...');
  if (adminUser?.id) {
    const weeklyRes = weeklyRepo.create({
      user_id: Number(adminUser.id),
      category: 'Reservation',
      insights: [
        'Total appointment conversion rate increased by +14.2% this week.',
        'Dr. Sarah Davis experienced peak booking load between 09:00 - 11:00 AM.',
        'Inbound call volume surged on Mondays by 35% compared to mid-week.',
        'Average call duration per booking stabilized at 1 min 45 secs.',
        'AI Receptionist successfully completed 91% of appointments without human transfer.'
      ]
    });
    await weeklyRepo.save(weeklyRes);

    const weeklyFeed = weeklyRepo.create({
      user_id: Number(adminUser.id),
      category: 'Feedback',
      insights: [
        '92% of patients rated AI voice receptionist clarity as Excellent.',
        'Negative sentiment dropped by 8% following automated SMS appointment confirmations.',
        'Main area of patient complaint was morning phone queue before 8:30 AM.',
        'Patients expressed high satisfaction with instant slot availability lookup.',
        'Recommendation rate remains steady at 4.8 out of 5 stars.'
      ]
    });
    await weeklyRepo.save(weeklyFeed);
  }

  const monthly = monthlyRepo.create({
    month: 9,
    year: 2026,
    executive_summary: 'Overall clinic operations demonstrated outstanding growth in September 2026 with 95% AI voice coverage.',
    critical_findings: { top_issue: 'Peak Monday Morning Volume', escalation_rate: '4.2%' },
    recommendations: ['Extend Dr. Davis pediatric slots on Tuesday afternoons.', 'Enable automated pre-call prep SMS.'],
    call_patterns: { peak_hours: '09:00 AM - 12:00 PM', busiest_day: 'Monday' },
    revenue_impact: 'Estimated +$14,500 in retained appointment revenue from zero missed calls.'
  });
  await monthlyRepo.save(monthly);

  console.log('🎉 MASTER DATABASE FULLY POPULATED ACROSS ALL RELATIONAL TABLES!');
  await app.close();
}

bootstrap().catch(err => {
  console.error('❌ Master Seeding failed:', err);
  process.exit(1);
});
