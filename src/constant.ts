import { PermissionScope, PermissionType } from "./utils/permissions";


export const imageMimetypes = ["image/jpeg", "image/png"];
export const USER_PERMISSIONS = [
  {
    scope: PermissionScope.dashboard,
    type: PermissionType.read,
  },
  {
    scope: PermissionScope.platforms,
    type: PermissionType.read,
  },
  {
    scope: PermissionScope.inventory,
    type: PermissionType.read,
  },
  {
    scope: PermissionScope.orders,
    type: PermissionType.read,
  },
  {
    scope: PermissionScope.billings,
    type: PermissionType.read,
  },
  {
    scope: PermissionScope.pim,
    type: PermissionType.read,
  },
];
