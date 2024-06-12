import { Schema, model } from "mongoose";
import { Notification, Type } from "../../package/types";
import {
  PermissionScope,
  PermissionType,
  TPermission,
} from "../../utils/permissions";
import { Role } from "../../utils/auth";
import { sendMail } from "../../utils/mail";

interface IVendorPermission {
  id: number;
  name: string;
}

export enum MFA {
  email = "EMAIL",
  none = "NONE",
}

type TNotificationPermission = {
  platform: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
};

export interface IUserSchema extends Document {
  created: Date;
  username: string;
  fullName?: string;
  email: string;
  password: string;
  role: string;
  vendorPermissions: IVendorPermission[];
  permissions: TPermission[];
  isActive: boolean;
  isBot: boolean;
  profileImage: string;
  mfa: MFA;
  group: string | IUserGroup;
  isOnboardingFinished: boolean;
  isPasswordCreated: boolean;
  stripeId?: string;

  // TODO: add types
  seller: any;

  isWortenWhiteLabel: boolean;

  notificationSettings: {
    ORDERS: TNotificationPermission;
    PRICE_AND_STOCK_UPDATES: TNotificationPermission;
    INTEGRATED_PRODUCT: TNotificationPermission;
    IMPORTED_PRODUCT: TNotificationPermission;
    BUYBOX: TNotificationPermission;
    RANKING_ZEOOS: TNotificationPermission;
    DEFAULT_NOTIFICATION: TNotificationPermission;
  };

  notificationEmail: string;
  notificationPhone: string;
}

const NotificationPermission = {
  platform: { type: "Boolean", default: true },
  email: { type: "Boolean", default: true },
  push: { type: "Boolean", default: true },
  sms: { type: "Boolean", default: true },
};

export const userSchema = new Schema<IUserSchema>(
  {
    created: { type: "Date", required: true, default: Date.now },
    username: { type: "String", required: true, unique: true },
    fullName: { type: "String" },
    email: { type: "String", required: true, unique: true },
    password: { type: "String", required: true },
    role: { type: "String", required: true, default: "USER", enum: Role },
    vendorPermissions: [
      {
        id: { type: "Number" },
        name: { type: "String" },
      },
    ],
    permissions: [
      {
        scope: { type: "String", enum: PermissionScope },
        type: { type: "String", enum: PermissionType },
      },
    ],
    mfa: { type: "String", enum: MFA, default: MFA.none },
    isActive: { type: "Boolean", required: true, default: true },
    isBot: { type: "Boolean", default: false },
    profileImage: { type: "String", required: false },
    group: { type: Schema.Types.ObjectId, ref: "UserGroup" },
    seller: { type: Schema.Types.ObjectId, ref: "Vendor" },
    isOnboardingFinished: { type: "Boolean", default: true },
    isPasswordCreated: { type: "Boolean", default: true },
    stripeId: { type: "String" },

    isWortenWhiteLabel: { type: "Boolean", default: false },

    notificationSettings: {
      ORDERS: NotificationPermission,
      PRICE_AND_STOCK_UPDATES: NotificationPermission,
      INTEGRATED_PRODUCT: NotificationPermission,
      IMPORTED_PRODUCT: NotificationPermission,
      BUYBOX: NotificationPermission,
      RANKING_ZEOOS: NotificationPermission,
      DEFAULT_NOTIFICATION: NotificationPermission,
    },

    notificationEmail: { type: "String" },
    notificationPhone: { type: "String" },
  },
  { collection: "users" }
);

export const User = model<IUserSchema>("User", userSchema);

export type INotificationSchema = Notification & Document;

export const notificationSchema = new Schema<INotificationSchema>(
  {
    created: { type: "Date", required: true, default: Date.now },
    user: { type: "String", required: true },
    fromUser: {
      userId: { type: "String" },
      username: { type: "String" },
      email: { type: "String" },
    },

    alertType: {
      platform: { type: "Boolean", default: true },
      email: { type: "Boolean", default: false },
      topbar: { type: "Boolean", default: false },
      push: { type: "Boolean", default: false },
      sms: { type: "Boolean", default: false },
      popup: { type: "Boolean", default: false },
    },
    isClosable: { type: "Boolean", default: false },
    isClosed: { type: "Boolean", default: false },

    type: {
      type: "String",
      enum: Type,
      default: Type.DEFAULT_NOTIFICATION,
    },

    title: { type: "String", required: true },
    lineText: { type: "String" },
    data: { type: "String" },
    url: { type: "String" },

    wasRead: { type: "Boolean", required: true, default: false },
    path: { type: "String" },

    relevantUntil: { type: "Date", default: Date.now },
  },
  { collection: "notifications" }
);

notificationSchema.post("save", async (doc: INotificationSchema) => {
  const user = (await User.findOne({ _id: doc.user }).select(
    "notificationSettings email notificationEmail notificationPhone"
  )) as any as IUserSchema;

  if (doc.alertType.email && user.notificationSettings[doc.type].email) {
    await sendMail(
      user.notificationEmail || user.email,
      doc.lineText,
      doc.data
    );
  }

  if (doc.alertType.sms && user.notificationSettings[doc.type].sms) {
    // TODO: send sms
  }

  if (doc.alertType.push && user.notificationSettings[doc.type].push) {
    // TODO: send push
  }
});

export const UserNotification = model<INotificationSchema>(
  "Notification",
  notificationSchema
);

export enum RequestStatus {
  accepted = "Accepted",
  inProcess = "In Process",
  rejected = "Rejected",
}

export interface IUserRequestsSchema extends Document {
  created: Date;
  updated: Date;
  user: IUserSchema;
  title: string;
  content: any;
  type: string;
  status: string;
}

export const userRequests = new Schema<IUserRequestsSchema>(
  {
    created: { type: "Date", required: true, default: Date.now },
    updated: {
      type: Date,
      default: Date.now,
    },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    title: { type: "String", required: true },
    content: { type: Schema.Types.Mixed },
    type: { type: "String", required: true },
    status: {
      type: "String",
      enum: RequestStatus,
      required: true,
      default: RequestStatus.inProcess,
    },
  },
  { collection: "userRequests" }
);

userRequests.pre("save", function (next: any) {
  (this as any).updated = Date.now();
  return next();
});

export const UserRequest = model<IUserRequestsSchema>(
  "UserRequest",
  userRequests
);

// UserRequest.collection.drop()

export async function getAdmin() {
  return await User.findOne({
    email: "gv@vinuus.com",
    role: Role.admin,
  });
}

interface IVerifyCode {
  code: string;
  userId: string;
  created: Date | string;
}

export const verifyCode = new Schema<IVerifyCode>(
  {
    code: { type: Schema.Types.String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "verifyCode" }
);

export const VerifyCode = model<IVerifyCode>("VerifyCode", verifyCode);

export interface IUserGroup extends Document {
  name: string;
  vendorPermissions: IVendorPermission[];
  image: string;
  created: Date;
}

export const userGroupSchema = new Schema<IUserGroup>(
  {
    name: { type: "String", required: true, unique: true },
    vendorPermissions: [
      {
        id: { type: "Number" },
        name: { type: "String" },
      },
    ],
    image: { type: "String" },
    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "userGroups" }
);

export const UserGroup = model<IUserGroup>("UserGroup", userGroupSchema);
