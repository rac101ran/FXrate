import { Injectable, HttpStatus, NotFoundException, Scope } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/Models/UserAccount";
import { Currency } from "src/Models/UserAccount";

@Injectable()
export class AccountsService {
    private retries = new Map<number, { nextRetryTimestamp: number; retryCount: number }>();

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Currency)
        private currencyRepository: Repository<Currency>) { }

    async topUpAccount(topUpData: { currency: string; amount: number; user_id: number }) {

        const { currency, amount, user_id } = topUpData;

        try {


            if (this.retries.get(user_id) && this.retries.get(user_id).nextRetryTimestamp > Math.round(Date.now() / 1000)) {
                const nextRetryTimeSeconds = this.retries.get(user_id).nextRetryTimestamp
                console.log("time", nextRetryTimeSeconds)
                return {
                    status: HttpStatus.REQUEST_TIMEOUT,
                    message: `Try after ${nextRetryTimeSeconds - Math.round(Date.now() / 1000)} seconds.`
                };
            }

            const user = await this.userRepository.findOne({ where: { id: user_id } });

            if (!user) {
                const response = {
                    status: HttpStatus.NOT_FOUND,
                    message: "user not registered",
                };
                return response;
            }

            // Check if the currency exists for the user
            const currencyEntry = await this.currencyRepository.findOne({
                where: { user, name: currency },
            });

            if (currencyEntry) {
                // Currency entry exists, update the balance
                currencyEntry.balance += amount;
                await this.currencyRepository.save(currencyEntry);

                const response = {
                    status: HttpStatus.OK,
                    message: "Currency balance updated successfully",
                    data: {
                        user: {
                            id: user.id,
                            name: user.name,
                        },
                        currency: {
                            id: currencyEntry.id,
                            name: currencyEntry.name,
                            balance: currencyEntry.balance,
                        },
                    },
                };

                this.retries.delete(user_id)

                return response;
            } else {

                const newCurrency = new Currency();
                newCurrency.name = currency;
                newCurrency.balance = amount;
                newCurrency.user = user;
                const savedCurrency = await this.currencyRepository.save(newCurrency);

                // Construct the response object
                const response = {
                    status: HttpStatus.CREATED,
                    message: "New currency created and balance updated successfully",
                    data: {
                        user: {
                            id: user.id,
                            name: user.name,
                        },
                        currency: {
                            id: savedCurrency.id,
                            name: savedCurrency.name,
                            balance: savedCurrency.balance,
                        },
                    },
                };

                this.retries.delete(user_id)

                return response;
            }
        } catch (err) {
            // console.log("error:", err);
            if (!this.retries.get(user_id)) {
                this.retries.set(user_id, { retryCount: 0, nextRetryTimestamp: Math.round((Date.now() / 1000) + 1) })
            } else {
                const nextRetry = this.retries.get(user_id).nextRetryTimestamp + 1;
                this.retries.set(user_id, { retryCount: nextRetry, nextRetryTimestamp: Math.round((Date.now() / 1000) + (1 << nextRetry)) })
            }
            return {
                status: HttpStatus.REQUEST_TIMEOUT,
                message: `Try after ${this.retries.get(user_id).nextRetryTimestamp - Math.round(Date.now() / 1000)} seconds.`
            };
        }
    }

    async checkBalance(user: { user_id: number }) {
        const { user_id } = user;

        // Check if the user exists
        const userEntity = await this.userRepository.findOne({ where: { id: user_id } });
        if (!userEntity) {
            throw new NotFoundException('User not found');
        }

        // Retrieve all the currencies for the user
        const currencies = await this.currencyRepository.find({ where: { user: userEntity } });

        // Create a response object containing the currencies and their balances
        const response = {
            status: HttpStatus.OK,
            userId: userEntity.id,
            currencies: currencies.map(currency => ({
                currency: currency.name,
                balance: currency.balance,
            })),
        };

        return response;
    }


}
