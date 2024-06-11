export enum PermissionScope {
    dashboard = 'DASHBOARD',
    intelligence = 'INTELLIGENCE',
    platforms = 'PLATFORMS',
    inventory = 'INVENTORY',
    orders = 'ORDERS',
    vendors = 'VENDORS',
    billings = 'BILLINGS',
    pim = 'PIM',
    digital_assets = 'DIGITAL_ASSETS',
    mappings = 'MAPPINGS',
    syncs = 'SYNCS',
    settings = 'SETTINGS',  
};

export enum PermissionType {
    read = 'READ',
    write = 'WRITE',
    all = '*',
};

export type TPermission = { scope: PermissionScope, type: PermissionType };

export function isValidPermission(permissionRequested: TPermission, permissionsToValidate: TPermission[]) {
    try {
        const permission = permissionsToValidate.find(permission => permission.scope === permissionRequested.scope);
        return permission?.type === permissionRequested.type || permission?.type === PermissionType.all;
    } catch (error) {
        console.error(error);
        return false;
    }
}
