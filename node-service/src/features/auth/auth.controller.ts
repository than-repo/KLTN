import { ConfigService } from '@nestjs/config';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type {
  Request as ExpressRequest,
  Response,
  CookieOptions,
} from 'express';
import { Throttle } from '@nestjs/throttler';
import { UnauthorizedException } from '@nestjs/common';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { AuthService } from './services/auth.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthResponseDto } from './dtos/login-response.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { RequestWithCookies } from './interfaces/request-with-cookies';
import type { RequestWithUser } from '../../common/interfaces/request-with-user';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { AccountRecoveryService } from './services/account-recovery.service';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { MessageResponseDto } from './dtos/message-response.dto';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly accountRecoveryService: AccountRecoveryService,
  ) {}

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const maxAge = this.configService.getOrThrow<number>(
      'REFRESH_TOKEN_MAX_AGE_MS',
    );

    res.cookie('refreshToken', refreshToken, {
      maxAge,
      ...this.getRefreshTokenCookieOptions(),
    });
  }
  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refreshToken', {
      ...this.getRefreshTokenCookieOptions(),
    });
  }
  private getRefreshTokenCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    };
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or email already taken',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);

    const { refreshToken, ...response } = result;
    this.setRefreshTokenCookie(res, refreshToken);
    return response;
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiOkResponse({
    description: 'User logged in successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    const { refreshToken, ...response } = result;
    this.setRefreshTokenCookie(res, refreshToken);
    return response;
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 30000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  @ApiOkResponse({
    description: 'New access token returned',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshToken(
      req.cookies?.refreshToken,
    );

    const { refreshToken: newRefreshToken, ...response } = result;
    this.setRefreshTokenCookie(res, newRefreshToken);
    return response;
  }

  // GOOGLE OAUTH
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Start Google OAuth2 login flow' })
  async googleAuth() {
    // Passport will automatically redirect to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  async googleAuthCallback(@Req() req: RequestWithUser, @Res() res: Response) {
    // req.user contains the JwtPayload from GoogleStrategy
    const result = await this.authService.googleLogin(req.user);

    const { refreshToken } = result;
    this.setRefreshTokenCookie(res, refreshToken);

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    return res.redirect(`${frontendUrl}/auth/google/success`);
  }

  @Post('logout')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user - revokes refresh token and clears httpOnly cookie',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  async logout(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Revoke token if it exists

    await this.authService.logout(req.cookies?.refreshToken);

    // Clear the httpOnly cookie securely
    this.clearRefreshTokenCookie(res);

    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiOkResponse({ type: MessageResponseDto })
  async logoutAll(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(userId);
    // Clear the httpOnly cookie securely
    this.clearRefreshTokenCookie(res);

    return { message: 'Logged out from all devices successfully' };
  }

  @ApiOperation({ summary: 'Forgot password' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse()
  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.accountRecoveryService.forgotPassword(dto.email);

    return {
      message: 'If this email exists, a password reset link has been sent',
    };
  }

  @ApiOperation({ summary: 'Reset password' })
  @ApiBadRequestResponse()
  @ApiOkResponse({ type: MessageResponseDto })
  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.accountRecoveryService.resetPassword(dto.token, dto.newPassword);

    return {
      message: 'Password has been reset successfully',
    };
  }

  @ApiOperation({ summary: 'Change password' })
  @ApiOkResponse({
    description: 'New access token after password change',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
      },
      required: ['accessToken'],
    },
  })
  @ApiBadRequestResponse()
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiBearerAuth()
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.accountRecoveryService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
      req.headers['user-agent'],
    );

    const { refreshToken, ...response } = tokens;
    this.setRefreshTokenCookie(res, refreshToken);
    return response;
  }
}
