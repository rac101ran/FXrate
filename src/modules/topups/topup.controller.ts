import { Controller, Get, Post, Body, UseInterceptors } from '@nestjs/common';
import { TopUpService } from './topup.service';


@Controller('accounts')
export class TopUpController {
  constructor(private readonly topUpService: TopUpService) { }

  // API 1
  @Post('topup')
  topUpAccount(@Body() topUpData: { currency: string; amount: number; user_id: number }) {
    return this.topUpService.topUpAccount(topUpData);
  }

}
