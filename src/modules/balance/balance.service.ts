import { Injectable, HttpStatus, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/datastore/UserAccount";
import { Currency } from "src/datastore/UserAccount";

@Injectable()
export class BalanceService {
    private retries = new Map<number, { nextRetryTimestamp: number; retryCount: number }>();

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Currency)
        private currencyRepository: Repository<Currency>) { }

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
