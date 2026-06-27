import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  IsArray,
  Min,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpsertSellerProfileDto {
  @IsString() @MaxLength(120)
  name!: string;

  @IsOptional() @IsString()
  photoUrl?: string;

  @IsOptional() @IsLatitude()
  farmLat?: number;

  @IsOptional() @IsLongitude()
  farmLng?: number;

  @IsOptional() @IsString() @MaxLength(64)
  upiId?: string;
}

export class CreateListingDto {
  @IsUUID()
  catalogId!: string;

  @IsNumber() @Min(0.01)
  qty!: number;

  @IsIn(['kg', 'quintal', 'crate', 'dozen'])
  unit!: 'kg' | 'quintal' | 'crate' | 'dozen';

  @IsNumber() @Min(0.01)
  payoutPrice!: number; // per unit, what the farmer receives

  @IsNumber() @Min(0.01)
  moq!: number;

  @IsOptional() @IsIn(['A', 'B', 'C'])
  grade?: 'A' | 'B' | 'C';

  @IsOptional() @IsArray()
  photos?: string[];

  @IsOptional() @IsLatitude()
  pickupLat?: number;

  @IsOptional() @IsLongitude()
  pickupLng?: number;

  @IsOptional() @IsDateString()
  availableFrom?: string;

  @IsOptional() @IsDateString()
  availableTo?: string;
}
