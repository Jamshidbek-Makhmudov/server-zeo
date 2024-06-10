import { USER_PERMISSIONS } from "../constant";
import { IUserGroup, User } from "../db/models/User";
import { Role } from "../utils/auth";
import { getUserDto } from "./user";

export async function getUserById(id: string, sanitize = true): Promise<any> {
  // TODO: use .select for sanitize
  const user = (await User.findOne({ _id: id })
    .populate("group seller")
    .select("-password -history"))!;
  user.permissions =
    user.role === Role.user ? USER_PERMISSIONS : user.permissions;

  if (user.seller) {
    user.vendorPermissions = [{ id: user.seller.id, name: user.seller.name }];
  } else {
    user.vendorPermissions = [Role.sellerAdmin, Role.sellerUser].includes(
      user.role as any
    )
      ? (user.group as IUserGroup)?.vendorPermissions
      : user.vendorPermissions;
  }

  return sanitize ? getUserDto(user) : (user as any)._doc;
}