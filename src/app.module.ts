import { Module } from '@nestjs/common';
import { AccountsController, FxConversionController, FxRatesController } from './app.controller';
import { AppService } from './Services/app.service';
import { CacheModule } from '@nestjs/cache-manager';
import { ConversionCache } from './ConversionCacheService.service';
import { AccountsService } from './Services/accounts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Models/UserAccount';
import { Currency } from './Models/UserAccount';

// import { RedisCacheModule } from './redis-cache/redis-cache.module';
// import { RedisCacheModule } from './redis-cache/redis-cache.module';

@Module({
  imports: [CacheModule.register({ isGlobal: true }), TypeOrmModule.forRoot({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'new_user',
    password: 'password',
    database: 'db',
    entities: [User, Currency],
    synchronize: true,
  }), TypeOrmModule.forFeature([User, Currency])],
  controllers: [AccountsController, FxConversionController, FxRatesController],
  providers: [AppService, ConversionCache, AccountsService],
})
export class AppModule { }
