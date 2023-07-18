import { Injectable, HttpStatus, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/Models/UserAccount";
import { Currency } from "src/Models/UserAccount";

@Injectable()
export class AccountsService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Currency)
        private currencyRepository: Repository<Currency>,
    ) { }

    async topUpAccount(topUpData: { currency: string; amount: number; user_id: number }) {
        const { currency, amount, user_id } = topUpData;

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

            return response;
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
