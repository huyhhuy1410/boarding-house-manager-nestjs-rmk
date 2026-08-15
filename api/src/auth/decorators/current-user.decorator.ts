import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email?: string;
  };
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
