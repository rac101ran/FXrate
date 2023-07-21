import { Module } from '@nestjs/common';

import { BalanceController } from './modules/balance/balance.controller';
import { BalanceService } from './modules/balance/balance.service';

import { FxConversionController } from './modules/fxconversions/fxconversion.controller';
import { FxConversionService } from './modules/fxconversions/fxconversion.service';

import { TopUpController} from './modules/topups/topup.controller';
import { TopUpService} from './modules/topups/topup.service';

import { CacheModule } from '@nestjs/cache-manager';

import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './datastore/UserAccount';
import { Currency } from './datastore/UserAccount';

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
  controllers: [TopUpController, FxConversionController, BalanceController],
  providers: [TopUpService , FxConversionService ,  BalanceService],
})
export class AppModule { }
