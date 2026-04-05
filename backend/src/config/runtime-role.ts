export type AppRuntimeRole = 'api' | 'worker' | 'scheduler' | 'all';

const VALID_ROLES: AppRuntimeRole[] = ['api', 'worker', 'scheduler', 'all'];

export const resolveAppRole = (value: string | undefined): AppRuntimeRole => {
  const normalized = String(value || 'all').trim().toLowerCase() as AppRuntimeRole;
  return VALID_ROLES.includes(normalized) ? normalized : 'all';
};

export const isApiRole = (role: AppRuntimeRole): boolean => role === 'api' || role === 'all';

export const isWorkerRole = (role: AppRuntimeRole): boolean => role === 'worker' || role === 'all';

export const isSchedulerRole = (role: AppRuntimeRole): boolean => role === 'scheduler' || role === 'all';

export const defaultSchedulerEnabled = (role: AppRuntimeRole): boolean => isSchedulerRole(role);

export const defaultQueueMonitorEnabled = (role: AppRuntimeRole): boolean => isWorkerRole(role) || isSchedulerRole(role);