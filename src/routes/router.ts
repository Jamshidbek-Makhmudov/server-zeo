import express, { Router } from "express";
import { Role } from "../utils/auth";
import { checkAdmin, checkRole, checkToken, fileUpload } from "../utils/middleware";
import { constructRouteErrorWrapper } from "../utils/shortcuts";
import { createUser, deleteUser, getJobs, getPaginatedUserHistory, getPaginatedUsers, loginUser, refreshTokens, removeProfileImage, updatePassword, updateProfileImage  } from "./user";

const router: Router = express.Router();
// router.post("/admin/register", constructRouteErrorWrapper(registerAdmin));
router.post("/user/login", constructRouteErrorWrapper(loginUser));
router.post(
  "/user/changePassword",
  checkAdmin,
  constructRouteErrorWrapper(updatePassword)
);
//todo
router.post(
  "/user/image",
  [checkToken, fileUpload.single("file")],
  constructRouteErrorWrapper(updateProfileImage)
);
//todo
router.delete(
  "/user/image",
  checkToken,
  constructRouteErrorWrapper(removeProfileImage)
);
router.delete("user/:username", checkRole(Role.admin,Role.sellerUser), constructRouteErrorWrapper(deleteUser));
router.post(
  "/user",
  checkRole(Role.admin, Role.sellerAdmin),
   constructRouteErrorWrapper(createUser)
   
);

router.get(
  "/user",
  checkRole(Role.admin, Role.sellerAdmin),
  constructRouteErrorWrapper(getPaginatedUsers)
);
router.post("/user/refreshTokens", constructRouteErrorWrapper(refreshTokens));

router.post("/getJobs", checkAdmin, constructRouteErrorWrapper(getJobs));
router.get(
  "/user/history",
  checkRole(Role.admin, Role.sellerAdmin),
  constructRouteErrorWrapper(getPaginatedUserHistory)
);


// reviews
router.post("/addReview", constructRouteErrorWrapper(addReview));

export default router;


