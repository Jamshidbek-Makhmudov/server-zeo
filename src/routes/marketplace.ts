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
import { paginator } from "../utils/shortcuts";
import * as MarketplaceUtils from "../utils/marketplace";

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
export const readMarketplaces = async (req: Request, res: Response) => {
  const pageOptions = {
    page: Number(req.query.page) ||1,
    limit:Number(req.query.limit) ||10,
  };
  
  const marketplace:any = await Marketplace.find()
    .skip((pageOptions.page - 1) * pageOptions.limit)
    .limit(pageOptions.limit)
  const totalResults = await Marketplace.countDocuments();
  return res.json({
    success: true,
    message:'all marketplaces',
    data: {
      data: marketplace,
      currentPage: pageOptions.page,
      limit: pageOptions.limit,
      totalResults,
      lastPage: Math.ceil(totalResults / pageOptions.limit),
    }
  });
  
};
export async function getMarketplacesWithConfig(req: Request) {
  const { filter, perPage, page } = await paginator(req, [
    "marketplaceName",
    "type",
    "zeoosName",
    "country",
  ]);

  let filterConfig = { ...filter };

  const { platformName: zeoosName, type, country } = req.query;

  if (req.userRole !== Role.admin) {
    filterConfig.active = true;
  }

  if (typeof zeoosName === "string" && zeoosName !== "All platforms") {
    filterConfig.zeoosName = zeoosName;
  }

  if (typeof type === "string" && type !== "All types") {
    filterConfig.type = type;
  }

  if (typeof country === "string" && country !== "All countries") {
    filterConfig.country = country;
  }

  const total = await Marketplace.countDocuments(filterConfig as any);

  const toSelect =
    req.userRole === Role.admin
      ? defaultMarketplaceDtoProperties
      : without(defaultMarketplaceDtoProperties, "credentials");

  const data = await Marketplace.find(filterConfig as any)
    .select(toSelect.join(" "))
    .limit(perPage)
    .skip(perPage * page)
    .sort({ created: -1 });

  return {
    data,
    perPage,
    page,
    total,
    lastPage: Math.ceil(total / Number(perPage)),
  };
}

export const getMarketplacesAdmin = async (req: Request, res: Response) => {
  return res.json(await getMarketplacesWithConfig(req));
};
export const getSanitizedMarketplaces = async (req: Request, res: Response) => {
  const marketplaces: any = await Marketplace.find(
    // req.userRole === Role.admin ? {} :
    { active: true }
  );

  return res.json({
    success: true,
    message: `All the marketplaces`,
    data: {
      data: marketplaces.map((x: any) =>
        getMarketplaceDto(
          x,
          defaultMarketplaceDtoProperties.filter((z) => z !== "credentials")
        )
      ),
    },
  });
};
export async function getMarketplaceByZeoosName(
  zeoosName: string,
  sanitize = true
) {
  const marketplace = await Marketplace.findOne({ zeoosName });
  return sanitize ? getMarketplaceDto(marketplace) : marketplace;
}

export const readMarketplace = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    message: `Data on Marketplace:`,
    data: await getMarketplaceByZeoosName(
      req.params.zeoosName,
      Role.admin !== req.userRole
    ),
  });
};

export async function findById(req: Request, res: Response) {
  const select =
    Role.admin !== req.userRole
      ? defaultMarketplaceDtoProperties.join(",")
      : "";
 
  const marketplace = await Marketplace.findOne({ _id: req.params.id }).select(
    select
  );
  return res.json(marketplace);
}
export const replicatePrices = async (req: Request, res: Response) => {
  MarketplaceUtils.replicateMarketplacePrices(req.userId);
  return res.sendStatus(200);
};
export const updateMarketplace = async (req: Request, res: Response) => {
  const { zeoosName } = req.params;
  let data = req.body;

  if (typeof data.credentials === "string") {
    data.credentials = JSON.parse(data.credentials);
  }

  if (req.file) {
    data = {
      ...data,
      marketplaceImg: getPathInS3(
        await getPath(req.file, "assets", data.zeoosName)
      ),
    };
  }

  const marketplace: any = await Marketplace.findOne({ zeoosName });

  if (!marketplace) {
    return res.status(404).json({
      success: false,
      message: "Marketplace does not exist",
    });
  }

  const updatedMarketplace = getMarketplaceDto(data);

  Object.keys(updatedMarketplace).map((key: string) => {
    marketplace[key] = (updatedMarketplace as any)[key];
  });

  await marketplace.save();

  return res.json({
    success: true,
    message: `Marketplace is now updated`,
    data: marketplace,
  });
};

export const updateMarketplacesByMplcName = async (
  req: Request,
  res: Response
) => {
  const { marketplaceName } = req.params;

  await Marketplace.updateMany({ marketplaceName }, { rate: req.body });

  return res.sendStatus(200);
};
export const deleteMarketplace = async (req: Request, res: Response) => {
  const { zeoosName } = req.params;

  const marketplace: any = await Marketplace.findOne({ zeoosName });

  if (!marketplace) {
    return res.status(404).json({
      success: false,
      message: "Marketplace does not exist",
    });
  }

  await marketplace.remove();

  return res.json({
    success: true,
    message: `Marketplace is now deleted`,
  });
};