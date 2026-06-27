import { IsIn, IsString, Matches, Length, IsEmail, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RequestOtpDto {
  // E.164-ish; keep permissive for dev.
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'phone must be 10–15 digits' })
  phone!: string;
}

export class VerifyOtpDto {
  @Matches(/^\+?[0-9]{10,15}$/)
  phone!: string;

  @IsString()
  @Length(6, 6, { message: 'code must be 6 digits' })
  code!: string;
}

export class SetRoleDto {
  @IsIn(['seller', 'buyer', 'driver'], { message: 'role must be seller | buyer | driver' })
  role!: 'seller' | 'buyer' | 'driver';
}
