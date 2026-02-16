import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RedisCacheModule } from './cache/cache.module';
import { RecipesModule } from './recipes/recipes.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { CategoriesModule } from './categories/categories.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UserPreferencesModule } from './user-preferences/user-preferences.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { SpacesModule } from './spaces/spaces.module';
import { MealPlansModule } from './meal-plans/meal-plans.module';
import { StoreProductsModule } from './store-products/store-products.module';
import { JwtAuthGuard } from './auth/guards';
import { SpaceMemberGuard } from './spaces/guards';
import { FeatureGuard, UsageLimitGuard } from './subscription/guards';
import { createPinoConfig } from './config/pino.config';
import { LoggerContextInterceptor } from './common/interceptors/logger-context.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Pino structured logging with request IDs
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createPinoConfig,
    }),
    // Rate limiting: 60 requests per 60 seconds (per IP)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 60, // 60 requests
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisCacheModule,
    AuthModule,
    UsersModule,
    RecipesModule,
    ShoppingListModule,
    CategoriesModule,
    UserPreferencesModule,
    SubscriptionModule,
    SpacesModule,
    MealPlansModule,
    StoreProductsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Apply JWT authentication globally (use @Public() to skip)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Validate space membership when X-Space-Id header is present
    {
      provide: APP_GUARD,
      useClass: SpaceMemberGuard,
    },
    // Apply subscription feature checks globally (use @RequireFeature() to gate)
    {
      provide: APP_GUARD,
      useClass: FeatureGuard,
    },
    // Apply subscription usage limits globally (use @RequireUsageLimit() to gate)
    {
      provide: APP_GUARD,
      useClass: UsageLimitGuard,
    },
    // Add userId to pino log context for every authenticated request
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerContextInterceptor,
    },
  ],
})
export class AppModule {}
