import { config } from "dotenv";
import { Request, Response } from "express";
import { sign, verify } from "jsonwebtoken";
import { USER_PERMISSIONS } from "../constant";
import { Role } from "./auth";
import { TPermission } from "./permissions";
import { _FilterQuery } from "mongoose";

config();

const accessTokenSecret = process.env.ACCESS_TOKEN || "";
const refreshTokenSecret = process.env.REFRESH_TOKEN || "";
export const createToken = (
  user: any,
  expiresIn = "1d",
  refreshToken = true
) => {
  user.permissions =
    user.role === Role.user ? USER_PERMISSIONS : user.permissions;
  const secret = refreshToken ? refreshTokenSecret : accessTokenSecret;

  return sign(
    {
      id: user._id,
      role: user.role,
      permissions: user.permissions || [],
      group: user.group,
      sellerId: user.seller?._id || user.seller,
      numericalSellerId: user.seller?.id || null,
    },
    secret,
    { expiresIn }
  );
};
interface Payload {
  id: string;
  role: Role;
  permissions: TPermission[];
  group: string;
  sellerId?: string;
  numericalSellerId?: number;
}

export const verifyToken = (token: string, refreshToken = true) => {
  const secret = refreshToken ? refreshTokenSecret : accessTokenSecret;
  const payload: any = verify(token, secret);

  return payload as Payload;
};

export const constructRouteErrorWrapper = (
  fn: (req: Request, res: Response) => Promise<any>
) => {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error(fn.name, req.url, req.body, error);
      return res.sendStatus(500);
    }
  };
};
export async function paginator(req: Request, searchKeys: string[] = []) {
  const search = req.query.search as string;
  let filter = {} as _FilterQuery<any>; 

  if (search) {
    const condition = searchKeys.map((key) => ({
      $regexMatch: {
        input: { $toString: `$${key}` },
        regex: `.*${search}*.`,
        options:"i",
      }
    }))
    filter.$expr = {$or:condition}
    
  }
  const perPage = isNaN(Number(req.query.perPage)) ? 10 : Number(req.query.perPage);

  const page=Math.max(0,Number(req.query.page)-1);
  
  return {
    perPage,
    page,
    filter
  }
 };
