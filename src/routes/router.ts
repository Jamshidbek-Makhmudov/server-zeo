import express, { Router } from "express";
import { Role } from "../utils/auth";
import { checkRole } from "../utils/middleware";
import { constructRouteErrorWrapper } from "../utils/shortcuts";
import { createUser, registerAdmin } from "./user";

const router: Router = express.Router();
router.post("/admin/register", constructRouteErrorWrapper(registerAdmin));
// router.post("/user/login", constructRouteErrorWrapper(loginUser));
router.post(
  "/user",
  checkRole(Role.admin, Role.sellerAdmin),
   constructRouteErrorWrapper(createUser)
   
);
export default router;


