import { applyDecorators } from '@nestjs/common';
import { ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

export function ApiAuthErrors() {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: 'Access token is missing or invalid.',
    }),
    ApiForbiddenResponse({
      description: 'Authenticated user is not allowed to access this resource.',
    }),
  );
}
