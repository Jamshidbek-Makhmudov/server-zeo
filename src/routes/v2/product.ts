import { Router } from "express";
import { checkUser } from "../../utils/middleware";
import { constructRouteErrorWrapper } from "../../utils/shortcuts";

export default function ProductRoute(router: Router) {
	router.get("/my/product-count", checkUser, constructRouteErrorWrapper(getProductCounts));

}
 async function getProductCounts()  {
	
 }