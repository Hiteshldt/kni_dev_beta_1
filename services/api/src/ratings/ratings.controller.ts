import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './ratings.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/roles';

@Controller('ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  // Only buyers submit ratings (buyer → seller / buyer → driver).
  @Post()
  @Roles('buyer')
  rate(@CurrentUser() user: AuthUser, @Body() dto: CreateRatingDto) {
    return this.ratings.rate(user.sub, dto);
  }

  // Public-ish reputation lookup (any authenticated role can view).
  @Get('user/:id')
  reputation(@Param('id', ParseUUIDPipe) id: string) {
    return this.ratings.reputation(id);
  }

  @Get('me')
  myReputation(@CurrentUser() user: AuthUser) {
    return this.ratings.reputation(user.sub);
  }
}
