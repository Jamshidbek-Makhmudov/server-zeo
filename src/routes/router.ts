import express, { Router } from "express";
import { Role } from "../utils/auth";
import {
  checkAdmin, checkPermission, checkReadOnly, checkRole,
  checkSellerAdmin, checkToken, fileUpload, withVendorPermissions
} from "../utils/middleware";
import { constructRouteErrorWrapper } from "../utils/shortcuts";
import {
  cancelRequest, changeStatus, closeNotification, createNotification, createRequest, createUser, deleteUser, forgotPassoword, generateMFACode, getAdminNames, getJobs, getOfferCounts,
  getOfferImportReports, getPaginatedNotifications, getPaginatedRequests,
  getPaginatedUserHistory, getPaginatedUsers, getPreviewLink, getProductCounts, getProductImportReport, getProductImportReports, getTicketNotifications, getUnreadOfferImportReport, getUnreadProductImportReport, getUserNotifications, importNewProducts, isAdmin, loginMFA, loginUser, productManipulation, readAllTicketNotifications, readAllUserNotifications, readNotification, readOfferImportReport, readProductImportReport, refreshTokens, removeProfileImage, resetPassoword, updatePassword, updateProfileImage, updateUser
} from "./user";
import {
  addReview, BulkImport, deleteReview, getReviews,
  getReviewsBySky,
  updateReview
} from "./reviews";

const router: Router = express.Router();
router.post(
  "/user/changePassword",
  checkAdmin,
  constructRouteErrorWrapper(updatePassword)
);

router.post(
  "/user/image",
  [checkToken, fileUpload.single("file")],
  constructRouteErrorWrapper(updateProfileImage)
);

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


router.post("/getJobs", checkAdmin, constructRouteErrorWrapper(getJobs));
router.get(
  "/user/history",
  checkRole(Role.admin, Role.sellerAdmin),
  constructRouteErrorWrapper(getPaginatedUserHistory)
);


// reviews
router.post("/addReview", constructRouteErrorWrapper(addReview));
router.get("/reviews/:sku", constructRouteErrorWrapper(getReviewsBySky));
router.put(
  "/reviews/:id",
  checkReadOnly,
  constructRouteErrorWrapper(updateReview)
);
router.delete(
  "/reviews/:id",
  checkReadOnly,
  constructRouteErrorWrapper(deleteReview)
);
router.post(
  "/reviews/bulk-import",
  [checkReadOnly, fileUpload.single("file")],
  constructRouteErrorWrapper(BulkImport)
);
router.get("/reviews", checkReadOnly, constructRouteErrorWrapper(getReviews));

// authentication
router.post("/user/login", constructRouteErrorWrapper(loginUser));
// router.post('/admin/register', constructRouteErrorWrapper(registerAdmin));
router.post("/user/refreshTokens", constructRouteErrorWrapper(refreshTokens));
// forgot passwd
router.post("/user/forgot", constructRouteErrorWrapper(forgotPassoword));
// reset passwd
router.post("/user/reset", constructRouteErrorWrapper(resetPassoword));
// send mfa code
router.post("/user/mfa", constructRouteErrorWrapper(generateMFACode));
// mfa login
router.post("/user/login/mfa", constructRouteErrorWrapper(loginMFA));
// get store url by IP address
router.get(
  "/shopify/url",
  constructRouteErrorWrapper(async (req: Request, res: Response) => {
    const result = geoip.lookup(req.clientIp || req.ip.replace("::ffff:", ""));

    // if (!result) {
    // 	console.log("req.clientIp", req.clientIp);
    // 	console.log("req.ip", req.ip);
    // 	return res.sendStatus(400);
    // }

    const supportedCountries = ["pt", "es", "nl", "fr", "uk", "de", "it", "be"];
    const domainCode =
      supportedCountries.find((x) => x === result?.country.toLowerCase()) ||
      "com";

    return res.json({
      country: result?.country,
      target: `https://vinuus.${domainCode}`,
    });
  })
);
router.post(
  "/createMarketplace",
  [checkAdmin, fileUpload.single("file")],
  constructRouteErrorWrapper(createMartketplace)
);
router.get(
  "/getAllMarketplaces",
  checkAdmin,
  constructRouteErrorWrapper(readMarketplaces)
);
export default router;
