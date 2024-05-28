import { config } from "dotenv";
import { verify } from "jsonwebtoken";
import { Role } from "./auth";
import { TPermission } from "./permissions";

config();

const accessTokenSecret = process.env.ACCESS_TOKEN || "";
const refreshTokenSecret = process.env.REFRESH_TOKEN || "";
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