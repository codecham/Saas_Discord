// apps/frontend/src/app/guards/test.guard.ts
import { CanActivateFn } from '@angular/router';

export const testGuard: CanActivateFn = () => {
  console.log('Test guard called');
  return true;
};