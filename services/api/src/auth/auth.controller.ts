import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestOtpDto, VerifyOtpDto, SetRoleDto } from './auth.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/roles';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }

  @Post('role')
  @UseGuards(JwtAuthGuard)
  setRole(@CurrentUser() user: AuthUser, @Body() dto: SetRoleDto) {
    return this.auth.setRole(user.sub, dto.role);
  }
}
