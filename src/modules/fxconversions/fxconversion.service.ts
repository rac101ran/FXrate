import { Inject, Injectable, HttpStatus, NotFoundException } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios from 'axios';
import { User } from '../../datastore/UserAccount';
import { Currency } from '../../datastore/UserAccount';
import { Repository } from "typeorm";

import * as fs from 'fs';


@Injectable()
export class FxConversionService {
    private readonly MAX_CACHE_SIZE = 50;
    private retries = new Map<number, { nextRetryTimestamp: number; retryCount: number }>();

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Currency) private currencyRepository: Repository<Currency>
    ) { }

    async getMostProfitablePairs() {
        const currencyCodes = await this.readCurrencyCodesFromCSV('physical_currencies.csv');

        for (let i = 0; i < currencyCodes.length; i++) {
            for (let j = i + 1; j < currencyCodes.length; j++) {
                const fromCurrency = currencyCodes[i];
                const toCurrency = currencyCodes[j];



                const cacheCurrencyPairKey = this.generateCacheKey(fromCurrency, toCurrency);

                const url = this.generateExchangeRateURL(fromCurrency, toCurrency);

                try {
                    const response = await axios.get(url);
                    console.log(response)

                    const exchangeRate = response.data['Realtime Currency Exchange Rate'];

                    console.log(exchangeRate)

                    let formattedExchangeRate = this.formatExchangeRate(exchangeRate);
                    let priceDifference = this.calculatePriceDifference(exchangeRate);

                    await this.cacheManager.set(cacheCurrencyPairKey, {
                        exchangeRate: formattedExchangeRate,
                        priceDifference: priceDifference,
                    }, { ttl: 30 });

                    await this.checkCacheSize(0);
                } catch (error) {
                    // console.error(`Failed to retrieve exchange rate for ${fromCurrency} to ${toCurrency}: ${error.message}`);
                    continue;
                }

            }
        }
    }

    async getExchangeRate(conversionData: {
        quoteId: string;
        fromCurrency: string;
        toCurrency: string;
        amount: number;
        user_id: number;
    }) {
        // Check if the user exists
        const user = await this.userRepository.findOne({ where: { id: conversionData.user_id }, relations: ['currencies'] });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        try {
            if (this.retries.get(conversionData.user_id) && this.retries.get(conversionData.user_id).nextRetryTimestamp > Math.round(Date.now() / 1000)) {
                const nextRetryTimeSeconds = this.retries.get(conversionData.user_id).nextRetryTimestamp
                return {
                    status: HttpStatus.REQUEST_TIMEOUT,
                    message: `Try after ${nextRetryTimeSeconds - Math.round(Date.now() / 1000)} seconds.`
                };
            }
            // Check if the user has enough balance in the fromCurrency
            const fromCurrency = user.currencies.find((currency) => currency.name === conversionData.fromCurrency);
            if (!fromCurrency || fromCurrency.balance < conversionData.amount) {
                throw new NotFoundException(`Insufficient balance in ${conversionData.fromCurrency}`);
            }

            const cacheKey = this.generateCacheKey(conversionData.fromCurrency, conversionData.toCurrency);
            const cachedMessage = await this.cacheManager.get(cacheKey);

            let formattedExchangeRate: any;
            let priceDifference: any;

            if (cachedMessage) {
                formattedExchangeRate = (cachedMessage as { exchangeRate: any }).exchangeRate;
                priceDifference = (cachedMessage as { priceDifference: any }).priceDifference;
            } else {
                const url = this.generateExchangeRateURL(conversionData.fromCurrency, conversionData.toCurrency);
                const response = await axios.get(url);
                const exchangeRate = response.data['Realtime Currency Exchange Rate'];

                formattedExchangeRate = this.formatExchangeRate(exchangeRate);
                priceDifference = this.calculatePriceDifference(exchangeRate);

                await this.cacheManager.set(cacheKey, {
                    exchangeRate: formattedExchangeRate,
                    priceDifference: priceDifference,
                }, { ttl: 30 });

                await this.checkCacheSize(1);
            }

            // Perform the currency conversion
            const convertedAmount = conversionData.amount * parseFloat(formattedExchangeRate['Exchange Rate']);

            // Update the balances
            fromCurrency.balance -= conversionData.amount;
            const toCurrency = user.currencies.find((currency) => currency.name === conversionData.toCurrency);
            if (toCurrency) {
                toCurrency.balance += convertedAmount;
                await this.currencyRepository.save([fromCurrency, toCurrency]);
                console.log("updated", toCurrency.balance)
            }

            this.retries.delete(conversionData.user_id)

            return { status: HttpStatus.OK, data: { "convertedAmount": parseFloat(convertedAmount.toFixed(2)), "currency": toCurrency.name } };

        } catch (err) {
            if (!this.retries.get(conversionData.user_id)) {
                this.retries.set(conversionData.user_id, { retryCount: 0, nextRetryTimestamp: Math.round((Date.now() / 1000) + 1) })
            } else {
                const nextRetry = this.retries.get(conversionData.user_id).nextRetryTimestamp + 1;
                this.retries.set(conversionData.user_id, { retryCount: nextRetry, nextRetryTimestamp: Math.round((Date.now() / 1000) + (1 << nextRetry)) })
            }
            return {
                status: HttpStatus.REQUEST_TIMEOUT,
                message: `Try after ${this.retries.get(conversionData.user_id).nextRetryTimestamp - Math.round(Date.now() / 1000)} seconds.`
            };
        }
    }


    private generateCacheKey(fromCurrency: string, toCurrency: string): string {
        return `currency_${fromCurrency}_${toCurrency}`;
    }

    private generateExchangeRateURL(fromCurrency: string, toCurrency: string): string {
        const apiKey = 'RB5SNRWHS6BWS4EU';
        return `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${apiKey}`;
    }

    private formatExchangeRate(exchangeRate: Record<string, string>): Record<string, string> {
        const formattedExchangeRate: Record<string, string> = {};

        for (const key in exchangeRate) {
            const formattedKey = key.replace(/\d+\.\s/g, ''); // Remove the leading numbers and dot from the keys
            formattedExchangeRate[formattedKey] = exchangeRate[key];
        }

        return formattedExchangeRate;
    }

    private calculatePriceDifference(exchangeRate: Record<string, string>): number {
        const askPrice = parseFloat(exchangeRate['9. Ask Price']);
        const bidPrice = parseFloat(exchangeRate['8. Bid Price']);
        return Math.abs(askPrice - bidPrice);
    }

    private async checkCacheSize(operation: number): Promise<void> {
        const cacheKeys = await this.cacheManager.store.keys();

        if (cacheKeys.length > this.MAX_CACHE_SIZE) {
            if (operation === 0) {
                await this.evictLeastProfitableItem();
            } else {
                await this.evictLRUItem();
            }
        }
    }

    private async evictLeastProfitableItem(): Promise<void> {
        const cacheKeys = await this.cacheManager.store.keys();

        let itemWithLowestPriceDiff: { key: string; priceDifference: number } | null = null;
        let lowestPriceDifference = Number.MAX_SAFE_INTEGER;

        for (const key of cacheKeys) {
            const item = await this.cacheManager.get(key) as { priceDifference: number };

            if (item && item.priceDifference < lowestPriceDifference) {
                lowestPriceDifference = item.priceDifference;
                itemWithLowestPriceDiff = { key, priceDifference: item.priceDifference };
            }
        }

        if (itemWithLowestPriceDiff) {
            await this.cacheManager.del(itemWithLowestPriceDiff.key);
        }
    }

    private async evictLRUItem(): Promise<void> {
        const cacheKeys = await this.cacheManager.store.keys();

        let itemWithEarliestRefresh: { key: string; lastRefreshed: Date } | null = null;
        let earliestRefresh: Date | null = null;

        for (const key of cacheKeys) {
            const item = await this.cacheManager.get(key) as { exchangeRate: any };
            const currentLastRefreshed = item.exchangeRate['Last Refreshed'];
            const currentByDate = new Date(currentLastRefreshed);

            if (!earliestRefresh || currentByDate < earliestRefresh) {
                earliestRefresh = currentByDate;
                itemWithEarliestRefresh = { key, lastRefreshed: currentByDate };
            }
        }

        if (itemWithEarliestRefresh) {
            await this.cacheManager.del(itemWithEarliestRefresh.key);
        }
    }


    async readCurrencyCodesFromCSV(filePath: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            const currencyCodes: string[] = [];

            const stream = fs.createReadStream(filePath, 'utf8');

            let header = true;

            stream.on('data', (data: string) => {
                const rows = data.split('\n');
                rows.forEach((row) => {

                    if (header) {
                        header = false;
                        return;
                    }

                    const columns = row.split(',');
                    const currencyCode = columns[0].trim(); // currency code is in the first column
                    if (currencyCode) {
                        currencyCodes.push(currencyCode);
                    }
                });
            });

            stream.on('end', () => {
                resolve(currencyCodes);
            });

            stream.on('error', (error: Error) => {
                reject(error);
            });
        });
    }


}
