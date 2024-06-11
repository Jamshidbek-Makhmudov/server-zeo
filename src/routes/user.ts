import { compare, hash } from "bcrypt";
import { Request, Response } from "express";
import * as _ from "lodash";
import { User } from "../db/models/User";
import { Role } from "../utils/auth";
import { createToken, paginator } from "../utils/shortcuts";
import { getUserById } from "./marketplace";
import { deleteObectInS3, getPathInS3 } from "../utils/aws";
import { getPath } from "./countryManagement";

export const registerAdmin = async (req: Request, res: Response) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({
      success: false,
      message: "Provide email, username and password",
    });
  }

  const alreadyExists: any = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (alreadyExists) {
    return res.status(404).json({
      success: false,
      message: "User with this email or username already exists",
    });
  }

  const user = new User({
    email,
    username,
    password: await hash(password, 12),
    role: "ADMIN",
  }) as any;

  await user.save();

  return res.json({
    success: true,
    message: "Register success",
    data: {
      user: {
        ...user._doc,
        accessToken: createToken(user._id, "1d", false),
      },
      refreshToken: createToken(user._id, "7d"),
    },
  });
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Provide both email and password",
    });
  }

  const user: any = (await User.findOne({ email }).populate("group")) as any;

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const match = await compare(password, user.password);

  if (!match) {
    return res.status(403).json({
      success: false,
      message: "Invalid password",
    });
  }

  if (Role.admin !== user.role && !user.isActive) {
    return res.sendStatus(500);
  }

  return res.json({
    success: true,
    message: "Login success",
    data: {
      user: {
        ...(await getUserById(user._id, false)),
        accessToken: createToken(user, "1d", false),
      },
      refreshToken: createToken(user, "7d"),
    },
  });
};
export async function createUser(req: Request, res: Response) {	
	console.log(req.body);
	
const { user } = req.body;

  if (!user.group) {
    delete user.group;
  }

  const config = req.userRole === Role.admin ? {} : { group: req.userGroup };

  const newUser = new User({
    ...user,
    ...config,
    password: await hash(user.password, 12),
  }) as any;

  await newUser.save();
  return res.sendStatus(200);
}

export async function updatePassword(req: Request, res: Response) {
  const config = req.userRole === Role.admin ? {} : { group: req.userGroup };
  const user = (await User.findOne({ _id: req.userId, ...config }).select(
    "password"
  ))!;

  const match = await compare(req.body.currentPassword, user.password);

  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Invalid current password",
    });
  }

  user.password = await hash(req.body.password, 12);
  await user.save();
  return res.sendStatus(200);
}
export const defaultUserDtoProperties = [
  "_id",
  "email",
  "mfa",
  "role",
  "vendorPermissions",
  "username",
  "isActive",
  "permissions",
  "fullName",
  "group",
  "seller",
  "isWortenWhiteLabel",
  "notificationSettings",
  "notificationEmail",
  "notificationPhone",
];

export function getUserDto(
  user: any,
  userDtoProperties = defaultUserDtoProperties
) {
  return _.pick(user, userDtoProperties);
}

export async function getUsersWithConfig(req: Request) {
  const { filter, perPage, page } = await paginator(req, [
    "email",
    "mfa",
    "role",
    "username",
  ]);

  let filterConfig = { ...filter };

  if (req.userRole !== Role.admin) {
    const user = await User.findOne({ _id: req.userId }).select("group");
    filterConfig.group = user!.group;
  }

  const { role, vendor, group, isWortenWhiteLabel } = req.query;

  if (typeof role === "string" && role) {
    filterConfig.role = role;
  }

  if (typeof vendor === "string" && vendor) {
    filterConfig.seller = vendor;
  }

  if (typeof group === "string" && group) {
    filterConfig.group = group;
  }

  if (["true", "false"].includes(isWortenWhiteLabel as string)) {
    filterConfig.isWortenWhiteLabel =
      isWortenWhiteLabel === "false" ? { $in: [null, false] } : true;
  }

  const total = await User.countDocuments(filterConfig as any);

  const data = await User.find(filterConfig as any)
    .select(
      [
        "email",
        "role",
        "vendorPermissions",
        "username",
        "isActive",
        "permissions",
        "fullName",
        "group",
        "history",
        "profileImage",
        "seller",
        "isWortenWhiteLabel",
      ].join(" ")
    )
    .populate("group seller")
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
//todo
export async function updateProfileImage(req: Request, res: Response) {
  const user = await User.findOne({ _id: req.userId }).select("profileImage");
  if (user?.profileImage) {
    await deleteObectInS3(user.profileImage);
  }
   const profileImage = getPathInS3(await getPath(req.file));
  //  await User.updateOne({ _id: req.userId }, { profileImage });
  //  return res.send(profileImage);
return "ok"
  }

export async function removeProfileImage(req: Request, res: Response) {
  const user = await User.findOne({ _id: req.userId }).select("profileImage");
  
  if (user?.profileImage) {
    await deleteObectInS3(user.profileImage);
  }

  // const data = await User.updateOne({ _id: req.userId }, {profileImage:""});
  //  await User.findOneAndUpdate({_id: req.userId}, {profileImage:""});
  //  return res.statusCode(200);
  return "ok";
}
 
export async function deleteUser(req: Request, res: Response) {
  const config = req.userRole === Role.admin ? {} : { group: req.userGroup };
  await User.deleteOne({ username: req.params.username, ...config });
  return res.sendStatus(200);

}

export async function getPaginatedUsers(req: Request, res: Response) {

  return res.json(await getUsersWithConfig(req))
 }