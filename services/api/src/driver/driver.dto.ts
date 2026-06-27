import { IsIn, IsNumber, IsOptional, IsString, Min, Length, MaxLength, IsArray, ArrayMinSize, IsDateString } from 'class-validator';

export class UpsertDriverProfileDto {
  @IsOptional() @IsString()
  licenseUrl?: string;

  @IsOptional() @IsString()
  rcUrl?: string;

  @IsIn(['tempo', 'mini_truck', 'truck'])
  vehicleType!: 'tempo' | 'mini_truck' | 'truck';

  @IsNumber() @Min(1)
  capacityKg!: number;

  @IsOptional() @IsString() @MaxLength(64)
  bankAccount?: string;
}

export class PickupDto {
  @IsString() @Length(4, 4)
  code!: string; // seller's pickup code
}

export class DeliverDto {
  @IsString() @Length(4, 4)
  otp!: string; // buyer's drop OTP

  @IsOptional() @IsString()
  proofUrl?: string;
}

export class CreateBatchDto {
  @IsArray() @ArrayMinSize(2) // batch requires ≥2 shipments
  shipmentIds!: string[];

  @IsOptional() @IsDateString()
  scheduledFor?: string; // date to execute batch
}

export class BatchPickupDto {
  @IsString() @Length(4, 4)
  code!: string;
}

export class BatchDeliverDto {
  @IsString() @Length(4, 4)
  otp!: string;

  @IsOptional() @IsString()
  proofUrl?: string;
}
