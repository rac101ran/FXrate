import { Entity, PrimaryGeneratedColumn, Column, OneToMany , ManyToOne } from 'typeorm';

@Entity({ name: 'user_account' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Currency, currency => currency.user)
  currencies: Currency[];
}

@Entity({ name: 'currencies' })
export class Currency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  balance: number;

  @ManyToOne(() => User, user => user.currencies)
  user: User;
}
