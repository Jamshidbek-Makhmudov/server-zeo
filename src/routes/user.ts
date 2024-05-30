import { hash } from "bcrypt";
import { Request, Response } from "express";
import { User } from "../db/models/User";
import { Role } from "../utils/auth";
import { createToken } from "../utils/shortcuts";

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