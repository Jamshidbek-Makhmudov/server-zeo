import { compare, hash } from "bcrypt";
import { Request, Response } from "express";
import * as _ from "lodash";
import { User } from "../db/models/User";
import { Role } from "../utils/auth";
import { createToken, paginator, verifyToken } from "../utils/shortcuts";
import { getUserById } from "./marketplace";
import { deleteObectInS3, getPathInS3 } from "../utils/aws";
import { getPath } from "./countryManagement";
import { getAllJobs } from "../utils/cron";
import { Marketplace } from "../db/models/Marketplace";
import { DateTime } from "luxon";
import { UserHistory } from "../db/models/UserHistory";

export const refreshTokens = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.sendStatus(400)
  }
  const payload = verifyToken(refreshToken, true)

  const user = (await User.findOne({ _id: payload.id }).populate("group seller")) as any;

  if (!user) {
    res.sendStatus(404);
  }
  
  if (user.role !== Role.admin && !user.isActive) {
    return res.sendStatus(401)
   }
  
  //todo

  
  return "ok"
 }

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
export async function updateProfileImage(req: Request, res: Response) {
  const user = await User.findOne({ _id: req.userId }).select("profileImage");
  if (user?.profileImage) {
    await deleteObectInS3(user.profileImage);
  }
   const profileImage = getPathInS3(await getPath(req.file));
   await User.updateOne({ _id: req.userId }, { profileImage });
   return res.send(profileImage);
  }
export async function removeProfileImage(req: Request, res: Response) {
  const user = await User.findOne({ _id: req.userId }).select("profileImage");
  
  if (user?.profileImage) {
    await deleteObectInS3(user.profileImage);
  }

  const data = await User.updateOne({ _id: req.userId }, {profileImage:""});
   await User.findOneAndUpdate({_id: req.userId}, {profileImage:""});
   return res.statusCode(200);
}
 
export async function deleteUser(req: Request, res: Response) {
  const config = req.userRole === Role.admin ? {} : { group: req.userGroup };
  await User.deleteOne({ username: req.params.username, ...config });
  return res.sendStatus(200);

}

export async function getPaginatedUsers(req: Request, res: Response) {

  return res.json(await getUsersWithConfig(req))
}

export async function getJobs(_: Request, res: Response) {
  const jobs = await getAllJobs();

  const hydratedJobs = await Promise.all(jobs.map(async (x) => await Marketplace.findOne({ _id: x.id })))
  return res.json({
    success: true,
    message: "Jobs fetched successfully",
    data: {
      jobs: hydratedJobs
    }
  })
  
}
export async function getUserHistoryWithConfig(req: Request) {
  const { filter, perPage, page } = await paginator(req, [
    "text"
  ]);

  let filterConfig = { ...filter };
  const { user, type, created } = req.query;
  if (typeof user === "string" && user !== "All users") {
    filterConfig = {
      user,
      ...filterConfig,
    };
  }
  if (typeof type === "string" && type !== "All types") {
    filterConfig = {
      type,
      ...filterConfig,
    };
  }
  if (typeof created === "string") {
    filterConfig = {
      created: { $gte: DateTime.fromMillis(Number(created)).toISODate() },
      ...filterConfig,
    };
  }
  
  const total = await UserHistory.countDocuments(filterConfig as any);

  const data = await UserHistory.find(filterConfig as any)
    .limit(perPage)
    .skip(perPage * page)
    .populate("user", "_id username profileImage", User)
    .sort({ created: -1 });
  return {
    data,
    perPage,
    page,
    total,
    lastPage: Math.ceil(total / Number(perPage))
  }
}

export async function getPaginatedUserHistory(req: Request, res: Response) {
  return res.json(await getUserHistoryWithConfig(req));
}


const DEFAULT_BASE_URL = "https://portal.vinuus.com";
const ZEOOS_BASE_URL = "https://admin.zeoos.com";

export async function forgotPassoword(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Provide email",
    });
  }

  const user: any = (await User.findOne({ email })) as any;

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const token = createToken(user, "2h", false);

  // excplicitly strict way instead of directly setting it from the request
  const baseUrl = req.body.src === "zeoos" ? ZEOOS_BASE_URL : DEFAULT_BASE_URL;

  try {
    await sendMail(
      user.email,
      `Redefinição de senha!`,
      `
			<p>Olá, <strong>${user.username}</strong>.
			Este e-mail refere-se à solicitação de redefinição de senha realizada
			em nosso site em ${new Date().toLocaleString()}.
			Para trocar sua senha, clique no link abaixo:</p>

			<h3><a href="${baseUrl}/login/resetpass/${token}">redefinir senha</a></h3>

			<p>Caso não tenha feito essa solicitação, basta ignorar esta mensagem.</p>
		`
    );
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.response,
    });
  }

  return res.json({
    success: true,
    message:
      "Em breve, receberás um link no email informado para redefinir sua senha",
    data: {},
  });
}
export async function resetPassoword(req: Request, res: Response) {
  const { token, newPass, newPass2 } = req.body;

  if (!token || !newPass !== !newPass2) {
    return res.status(400).json({
      success: false,
      message: "Provide all required fields",
      data: {},
    });
  }
  try {
    var payload = verifyToken(token, false);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Invalid or expired link",
      data: {},
    });
  }
  const user = (await User.findOne({ _id: payload.id })) as any;

  user.password = await hash(newPass, 12);

  await user.save();

  return res.json({
    success: true,
    message: "Your password has been reset",
    data: {},
  });

}
export function generatePassword(len: number) {
  let password = "";
  const symbols =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!№;%:?*()_+=";
  for (let i = 0; i < len; i++) {
    passwoed += symbols.chartAt(Math.floor(Math.random() * symbols.length));
   }


 };
export async function generateMFACode(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Provide email.",
    });
  }
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }
  const password = await generatePassword(10);
  await new VerifyCode({
    code: password,
    userId:user._id
  }).save();
  try { 
    await sendMail(
      user.email,
      `Confirmation code!`,
      `
      <p>Hello, <strong>${user.username}</strong>.
      This email refers to a login confirmation request made on our website at ${new Date().toLocaleString()}.
      To access, copy the code below:</p>
      
      <h3>${password}</h3>
      
      <p>If you have not made this request, simply ignore this message.</p>.
      `
    )  
  } catch (error:any) {

    return res.status(500).json({
      success: false,
      message: error.response,
    })
  }
  
  return res.json({
    success: true,
    message: "You will soon receive a specified email code to log into your account.",
    data: {},
  })

}
 
export async function loginMFA(req: Request, res: Response) {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: "The code is not defined.",
    });
  }

  const verifyCode = await VerifyCode.findOne({ code });

  if (!verifyCode) {
    return res.status(404).json({
      success: false,
      message: "Check if the code was not found, try again",
    });
  }
  const now = DateTime.now();
  const momentsLater = DateTime.fromJSDate(verifyCode.created as any);
  const diff = now.diff(monestsLLater, "minutes");
  if (diff > 10) {
    return res.status(404).json({
      success: false,
      message: "Timeout, request code again",
    });
  }
  const user = (await User.findOne({ _id: verifyCode.userId }).populate("group")) as any;
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "received",
    data: {
      user: {
        ...user._doc,
        accessToken: createToken(user, "1d", false)
      },
      refreshToken: createToken(user, "7d")
    }
  });

}