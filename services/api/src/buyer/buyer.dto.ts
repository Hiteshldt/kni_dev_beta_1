import {
  IsArray, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString,
  IsUUID, Min, MaxLength, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertBuyerProfileDto {
  @IsString() @MaxLength(160)
  businessName!: string;

  @IsOptional() @IsString() @MaxLength(20)
  gst?: string;

  @IsOptional() @IsLatitude()
  deliveryLat?: number;

  @IsOptional() @IsLongitude()
  deliveryLng?: number;
}

export class OrderItemDto {
  @IsUUID()
  listingId!: string;

  @IsNumber() @Min(0.01)
  qty!: number;
}

export class CreateOrderDto {
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsOptional() @IsLatitude()
  deliveryLat?: number;

  @IsOptional() @IsLongitude()
  deliveryLng?: number;
}
