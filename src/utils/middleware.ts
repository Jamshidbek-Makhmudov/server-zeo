import { NextFunction, Request, Response } from "express";
import { User } from "../db/models/User";
import { Role } from "./auth";
import { TPermission } from "./permissions";
import { verifyToken } from "./shortcuts";
declare global {
  namespace Express {
    interface Request {
      token: string;
      userId: string;
      userRole: Role;
      sellerId?: string;
      numericalSellerId?: number;
      userPermissions: TPermission[];
      userGroup: string;
      vendorPermissions?: number[];
    }
  }
}
function readToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["authorization"];

  if (typeof token === "string") {
    req.token = token.replace("Bearer ", "");
  } else {
    console.log("4");
    return res.sendStatus(401);
  }

  next();
}
export const checkToken = (req: Request, res: Response, next: NextFunction) => {
  return readToken(req, res, () => {
    try {
      const { id, role, permissions, group, sellerId, numericalSellerId } =
        verifyToken(req.token, false);
      req.userId = id;
      req.sellerId = sellerId;
      req.numericalSellerId = numericalSellerId;
      req.userRole = role;
      req.userPermissions = permissions;
      req.userGroup = group;
    } catch (error) {
      console.log("3");
      console.error(error);
      return res.sendStatus(403);
    }

    next();
  });
};
export const checkRole =(...givenRoles: Role[])=> (req: Request, res: Response, next: NextFunction) => {
	   checkToken(req, res, async () => {
      // REDO
      if (req.userRole === Role.user) {
        const user = await User.findOne({ _id: req.userId });

        if (!user?.seller) {
          console.log("1");
          
          return res.sendStatus(403);
        }
      } else if (!givenRoles.includes(req.userRole)) {
        console.log("2");
        return res.sendStatus(403);
      }

      next();
    });
 };
export const checkUser = checkRole(Role.user, Role.admin);

