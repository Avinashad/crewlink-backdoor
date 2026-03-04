import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  sub?: string; // Alias for id (JWT standard uses 'sub')
  email: string;
  userType: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | 'sub' | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;

    if (data) {
      // Map 'sub' to 'id' for JWT compatibility
      if (data === 'sub') {
        return user?.id;
      }
      return user?.[data];
    }

    return user;
  },
);
