import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateRatingDto {
  @IsUUID()
  orderId!: string;

  // Who is being rated for this order.
  @IsIn(['seller', 'driver'])
  target!: 'seller' | 'driver';

  @IsInt() @Min(1) @Max(5)
  score!: number;

  @IsOptional() @IsString() @MaxLength(280)
  comment?: string;

  // Disambiguates when an order spans multiple sellers (rate a specific one).
  @IsOptional() @IsUUID()
  toUserId?: string;
}
