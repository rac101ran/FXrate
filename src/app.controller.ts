import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, Post, Body, UseInterceptors } from '@nestjs/common';
import { AppService } from './Services/app.service';
import { Request } from '@nestjs/common';
import { AccountsService } from './Services/accounts.service';
import { ConversionCache } from './ConversionCacheService.service';

// user table func.
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) { }

  @Post('topup')
  topUpAccount(@Body() topUpData: { currency: string; amount: number; user_id: number }) {
    return this.accountsService.topUpAccount(topUpData);
  }

  @Get('balance')
  getAccountBalance(@Body() user: { user_id: number }) {
    return this.accountsService.checkBalance(user);
  }

}



@Controller('fx-conversion')
export class FxConversionController {
  constructor(private readonly fxConversionService: ConversionCache) { }

  @Post()
  performFxConversion(@Body() conversionData: { quoteId: string; fromCurrency: string; toCurrency: string; amount: number; user_id: number }) {
    return this.fxConversionService.getExchangeRate(conversionData);
  }


  @Get('init')
  getMostProfitablePairs() {
    return this.fxConversionService.getMostProfitablePairs();
  }

}



// cache + user
@UseInterceptors(CacheInterceptor)
@Controller('fx-rates')
export class FxRatesController {
  constructor(private readonly fxRatesService: AppService) { }

  @Get()
  getFxRates(@Body() user: { user_id: number }) {
    return this.fxRatesService.getFxRates(user);
  }

}

