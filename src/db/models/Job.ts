import { pick } from "lodash";
import { Schema, model, Document, ObjectId, Query } from "mongoose";

export interface IJobType extends Document {
    name: string;
    description?: string;
    inputRequired: boolean;
    created: Date;
}

const jobType = new Schema<IJobType>({
    name: { type: 'String', required: true, unique: true },
    description: { type: 'String' },
    inputRequired: { type: Boolean, required: true, default: false },
    created: { type: "Date", required: true, default: Date.now },
}, { collection: "jobTypes" });

export const JobType = model<IJobType>("JobType", jobType);

const creatableJobTypeProperties = ['name', 'description', 'inputRequired'];
const editableJobTypeProperties = creatableJobTypeProperties;

export async function createJobType(jobTypeData: Partial<IJobType>) {
    const jobType = new JobType(pick(jobTypeData, creatableJobTypeProperties));
    await jobType.save();
    return jobType;
}

export async function editJobType(_id: ObjectId, jobTypeData: Partial<IJobType>) {
    await JobType.updateOne({ _id }, pick(jobTypeData, editableJobTypeProperties));
}

export enum jobItemStatus {
    WAITING = 'WAITING',
    RUNNING = 'RUNNING',
    FINISHED = 'FINISHED',
    ERROR = 'ERROR',
};

export interface IJob extends Document {
    name: string;
    type: Schema.Types.ObjectId;
    description: string;

    // ┌────────────── second (optional)
    // │ ┌──────────── minute
    // │ │ ┌────────── hour
    // │ │ │ ┌──────── day of month
    // │ │ │ │ ┌────── month
    // │ │ │ │ │ ┌──── day of week
    // │ │ │ │ │ │
    // │ │ │ │ │ │
    // * * * * * *
    frequency: string;

    latestReport: string,
    latestStatus: jobItemStatus;
    input: any,
    user: Schema.Types.ObjectId;

    active: boolean;
    created: Date;
}

const job = new Schema<IJob>({
    name: { type: 'String', required: true },
    type: { type: Schema.Types.ObjectId, required: true, ref: 'JobType' },
    description: { type: 'String', required: true },
    active: { type: 'Boolean', required: true, default: true },
    frequency: { type: 'String', required: true },
    
    latestReport: { type: 'String' },
    latestStatus: { type: 'String', enum: jobItemStatus, required: true, default: jobItemStatus.RUNNING },
    input: { type: Schema.Types.Mixed },
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },

    created: { type: "Date", required: true, default: Date.now },
}, { collection: "jobs" });

job.pre('deleteOne', async function (next) {
    const job = await Job.findOne({ _id: (this as any)?._conditions?._id });
    
    if (job) {
        await JobItem.updateMany({ job: job._id }, { deletedJobSnapshot: { ...((job as any)._doc), _id: job._id } });
    }

    next();
});

export const Job = model<IJob>("Job", job);

const creatableJobProperties = ['name', 'type', 'description', 'frequency', 'active', 'latestReport', 'latestStatus', 'input', 'user'];
const editableJobProperties = creatableJobProperties;

export async function createJob(jobData: Partial<IJob>) {
    const job = new Job(pick(jobData, creatableJobProperties));
    await job.save();
    return job;
}

export async function editJob(_id: ObjectId, jobData: Partial<IJob>) {
    await Job.updateOne({ _id }, pick(jobData, editableJobProperties));
}

export interface IJobItem extends Document {
    job: Schema.Types.ObjectId;
    status: jobItemStatus;
    report?: string;
    created: Date;
    user?: Schema.Types.ObjectId;
    deletedJobSnapshot?: IJob;
    params?: any;
    finished?: Date;
}

const jobItem = new Schema<IJobItem>({
    job: { type: Schema.Types.ObjectId, required: true, ref: 'Job' },
    status: { type: 'String', enum: jobItemStatus, required: true, default: jobItemStatus.RUNNING },
    report: { type: 'String' },
    created: { type: "Date", required: true, default: Date.now },
    finished: { type: "Date" },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedJobSnapshot: { type: Schema.Types.Mixed },
    params: { type: Schema.Types.Mixed }
}, { collection: "jobItems" });

export const JobItem = model<IJobItem>("JobItem", jobItem);

const creatableJobItemProperties = ['job', 'status', 'report', 'user', 'finished', 'deletedJobSnapshot'];
const editableJobItemProperties = ['status', 'report', 'finished', 'deletedJobSnapshot', 'params'];

export async function createJobItem(jobItemData: Partial<IJobItem>) {
    const data = pick(jobItemData, creatableJobItemProperties);
    const jobItem = new JobItem(data);
    await jobItem.save();

    await Job.updateOne({ _id: jobItem.job }, { latestReport: jobItem.report, latestStatus: jobItem.status });

    return jobItem;
}

export async function editJobItem(_id: ObjectId, jobItemData: Partial<IJobItem>) {
    await JobItem.updateOne({ _id }, pick(jobItemData, editableJobItemProperties));
}
