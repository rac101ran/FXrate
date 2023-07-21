import { Controller, Get, Post, Body, UseInterceptors } from '@nestjs/common';
import { BalanceService } from './balance.service';

@Controller('accounts')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) { }

  // API 4
  @Get('balance')
  getAccountBalance(@Body() user: { user_id: number }) {
    return this.balanceService.checkBalance(user);
  }

}
