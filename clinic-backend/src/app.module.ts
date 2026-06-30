import { Module, MiddlewareConsumer, NestModule, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { SecurityMiddleware } from './common/middleware/security.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { CsrfTokenInterceptor } from './common/interceptors/csrf-token.interceptor';
import { JwtValidationInterceptor } from './common/interceptors/jwt-validation.interceptor';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { CsrfGuard } from './common/guards/csrf.guard';

import { UserModule } from './user/user.module';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Doctor } from './entities/doctor.entity';
import { Appointment } from './entities/appointment.entity';
import { Call } from './entities/call.entity';
import { Action } from './entities/action.entity';
import { MonthlyInsight } from './entities/monthly-insight.entity';
import { ClinicConfig } from './entities/clinic-config.entity';
import { CallAnalysis } from './entities/call-analysis.entity';
import { CallTranscript } from './entities/call-transcript.entity';
import { FeedbackDetails } from './entities/feedback-details.entity';
import { OrganisationSettings } from './entities/organisation-settings.entity';
import { UserInteraction } from './entities/user-interaction.entity';
import { WeeklyInsight } from './entities/weekly-insight.entity';
import { GeneralIssue } from './entities/general-issue.entity';
import { GlobalConfig } from './entities/global-config.entity';
import { InteractionType } from './entities/interaction-type.entity';
import { Location } from './entities/location.entity';
import { UserLocation } from './entities/user-location.entity';
import { UserAgent } from './entities/user-agent.entity';
import { Agent } from './entities/agent.entity';
import { AppointmentsModule } from './appointments/appointments.module';
import { CallModule } from './call/call.module';
import { AiModule } from './ai/ai.module';
import { ActionsModule } from './actions/actions.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
import { UserInteractionModule } from './user-interaction/user-interaction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/public',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('RATE_LIMIT_DURATION', 60000), // 1 minute
          limit: config.get<number>('RATE_LIMIT_MAX_REQUESTS', 50), // 50 requests per minute
        },
      ],
    }),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = (configService.get<string>('JWT_EXPIRES_IN') || '7d') as StringValue;
        return {
          secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
          signOptions: { expiresIn },
        };
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'clinic_db',
      entities: [
        User,
        Role,
        Doctor,
        Appointment,
        Call,
        Action,
        MonthlyInsight,
        ClinicConfig,
        CallAnalysis,
        CallTranscript,
        FeedbackDetails,
        OrganisationSettings,
        UserInteraction,
        WeeklyInsight,
        GeneralIssue,
        GlobalConfig,
        InteractionType,
        Location,
        UserLocation,
        UserAgent,
        Agent,
      ],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      extra: {
        max: parseInt(process.env.DB_POOL_MAX || '2'),
        min: parseInt(process.env.DB_POOL_MIN || '0'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
        options: '-c timezone=UTC',
      },
    }),
    ...(process.env.DISABLE_CRONS === 'false' ? [ScheduleModule.forRoot()] : []),
    TypeOrmModule.forFeature([User, Role]),
    UserModule,
    AppointmentsModule,
    CallModule,
    AiModule,
    ActionsModule,
    DashboardModule,
    AdminModule,
    UserInteractionModule,
    ReportsModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: CsrfTokenInterceptor },
    { provide: APP_INTERCEPTOR, useClass: JwtValidationInterceptor },
    { provide: APP_PIPE, useClass: ValidationPipe },
  ],
})
export class AppModule implements NestModule {
  private readonly logger = new Logger(AppModule.name);

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware).forRoutes('*');
  }
}
