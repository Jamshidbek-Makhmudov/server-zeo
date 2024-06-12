import { CronJob } from "cron";
interface Job { 
	cronJob: CronJob;
	id: string;
}
let jobs = [] as Job[];

export const jobNotFoundError = new Error("Job not found");

export const getAllJobs = async () => jobs;