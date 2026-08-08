export const roleKeys = [
    'anon',
    'user',
    'advisor',
    'admin',
] as const;

export type RoleKeys = typeof roleKeys[number];