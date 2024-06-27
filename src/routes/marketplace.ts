import csv from "csvtojson";
import { Request, Response, Router } from "express";
import { promises as asyncFs, promises } from "fs";
import * as _ from "lodash";
import { without } from "lodash";
import { _FilterQuery } from "mongoose";
import path from "path";
import { v4 } from "uuid";
import { USER_PERMISSIONS } from "../constant";
import { IUserGroup, User } from "../db/models/User";
import { Role } from "../utils/auth";
import { getUserDto } from "./user";
import { getPathInS3 } from "../utils/aws";
import { getPath } from "./countryManagement";
import { Marketplace } from "../db/models/Marketplace";
import { UserHistory } from "../db/models/UserHistory";
import { PermissionScope } from "../utils/permissions";

export const defaultMarketplaceDtoProperties = [
  `_id`,
  `zeoosName`,
  `marketplaceName`,
  `type`,
  `country`,
  `wineVatRate`,
  `champagneVatRate`,
  `wineIecRate`,
  `champagneIecRate`,
  `baseUrl`,
  `credentials`,
  `imgUrl`,
  `additionalPricePerCountry`,
  `isManual`,
  "statusMap",
  `rate`,
  `isFeed`,
  `active`,
  `marketplaceImg`,
];

export function getMarketplaceDto(
  marketplace: any,
  marketplaceDtoProperties = defaultMarketplaceDtoProperties
) {
  return _.pick(marketplace, marketplaceDtoProperties);
}


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
export const createMartketplace = async (req: Request, res: Response) => {
  let data = req.body;

  if (req.file) {
    data = {
      ...data,
      marketplaceImg: getPathInS3(
        await getPath(req.file, "assets", data.zeoosName)
      ),
    };
  }

  const marketplace = new Marketplace({
    ...getMarketplaceDto(data),
    createdBy: req.userId,
  });
  await marketplace.save();

  const newUserHistory = new UserHistory({
    user: req.userId,
    type: PermissionScope.platforms,
    text: `The ${marketplace.zeoosName} platform was integrated`,
  });

  await newUserHistory.save();

  return res.json({
    success: true,
    message: `Marketplace is now created`,
    data: marketplace,
  });
};
