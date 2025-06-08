import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticationService } from '../../business/services/authentication.service';
import { AuthenticatedRequest, RefreshTokenRequest } from '@shared/types';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '../dto';
import { Public } from '@cross-cutting/security';
import { JwtAuthGuard } from '@cross-cutting/security';
import { AuthGuard } from '@nestjs/passport';
import { MESSAGES } from '@shared/constants';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthenticationService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ipAddress = req.ip;
    return await this.authService.register(dto, ipAddress);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return await this.authService.login(dto, ipAddress, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() req: AuthenticatedRequest) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await this.authService.logout(req.user.id, token || '');
    return { message: MESSAGES.AUTH.LOGOUT_SUCCESS };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(@Req() req: AuthenticatedRequest) {
    await this.authService.logoutAllDevices(req.user.id);
    return { message: 'Logged out from all devices successfully' };
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(@Req() req: RefreshTokenRequest) {
    const refreshToken = req.user.refreshToken;
    return await this.authService.refreshTokens(refreshToken);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: AuthenticatedRequest) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    
    await this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    
    return { message: 'Password changed successfully' };
  }

  @Post('password-reset/request')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { message: MESSAGES.AUTH.PASSWORD_RESET_EMAIL_SENT };
  }

  @Post('password-reset/confirm')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: MESSAGES.AUTH.PASSWORD_RESET_SUCCESS };
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  async getCurrentUser(@Req() req: Request) {
    return req.user;
  }
}