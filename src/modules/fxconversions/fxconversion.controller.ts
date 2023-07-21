import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, Post, Body, UseInterceptors } from '@nestjs/common';
import { Request } from '@nestjs/common';
import { FxConversionService } from './fxconversion.service';


@Controller('fx-conversion')
export class FxConversionController {
  constructor(private readonly fxConversionService: FxConversionService) { }

  // API 3
  @Post()
  performFxConversion(@Body() conversionData: { quoteId: string; fromCurrency: string; toCurrency: string; amount: number; user_id: number }) {
    return this.fxConversionService.getExchangeRate(conversionData);
  }

  // TASK 1
  @Get('init')
  getMostProfitablePairs() {
    return this.fxConversionService.getMostProfitablePairs();
  }

}
