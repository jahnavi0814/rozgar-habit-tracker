import { Router, type IRouter } from "express";
import healthRouter from "./health";
import habitsRouter from "./habits";
import meRouter from "./me";
import progressRouter from "./progress";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(habitsRouter);
router.use(progressRouter);

export default router;
