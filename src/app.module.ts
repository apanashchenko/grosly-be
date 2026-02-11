import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RecipesModule } from './recipes/recipes.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { CategoriesModule } from './categories/categories.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UserPreferencesModule } from './user-preferences/user-preferences.module';
import { JwtAuthGuard } from './auth/guards';
import { createPinoConfig } from './config/pino.config';

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
    DatabaseModule,
    AuthModule,
    UsersModule,
    RecipesModule,
    ShoppingListModule,
    CategoriesModule,
    UserPreferencesModule,
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
  ],
})
export class AppModule {}
