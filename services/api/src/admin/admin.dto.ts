import { IsIn, IsNumber, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';

export class ReviewListingDto {
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  // Required-ish for approve; validated in service.
  @IsOptional() @IsIn(['A', 'B', 'C'])
  grade?: 'A' | 'B' | 'C';

  @IsOptional() @IsNumber() @Min(0) @Max(100)
  marginPct?: number;

  @IsOptional() @IsNumber() @Min(0)
  flatFee?: number;

  @IsOptional() @IsString() @MaxLength(280)
  rejectReason?: string;
}
