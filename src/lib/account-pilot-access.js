import { createServerFn } from '@tanstack/react-start';
import { secrets } from 'base44:runtime';
import { requireUser } from './auth-middleware';

export const canOpenAccountPilot = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const email = context.user.email?.trim().toLowerCase();
    if (context.user.role !== 'admin' || !email) return false;
    const owner = await secrets.get('NEXO_PILOT_ACCOUNT_EMAIL');
    return Boolean(owner && email === owner.trim().toLowerCase());
  });
