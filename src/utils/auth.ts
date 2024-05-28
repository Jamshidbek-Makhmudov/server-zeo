export const Role = {
  readonly: "READONLY",
  user: "USER",
  admin: "ADMIN",
  permissionBased: "PERMISSION_BASED",
  sellerAdmin: "SELLER_ADMIN",
  sellerUser: "SELLER_USER",
} as const;

type RoleKey = keyof typeof Role;
export type Role = typeof Role[RoleKey];
