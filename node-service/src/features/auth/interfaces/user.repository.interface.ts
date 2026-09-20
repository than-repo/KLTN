export interface CreatePasswordResetTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface ResetPasswordInput {
  tokenHash: string;
  passwordHash: string;
}

export interface UpdatePasswordAndResetTokenInput {
  userId: string;
  passwordHash: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
}
