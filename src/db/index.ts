require("dotenv").config();
import { promises as asyncFs } from "fs";
import mongoose from "mongoose";
import path from "path";

mongoose.Promise = global.Promise;

export const createConnection = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    } as mongoose.ConnectOptions;
    const tlsCertificate = process.env.MONGO_TLS_CERTIFICATE;

    if (tlsCertificate) {
      const pathToCertificate = path.join(process.cwd(), "cert.pem");
      await asyncFs.writeFile(pathToCertificate, tlsCertificate);

      options.tlsInsecure = true;
      options.tls = true;
      options.tlsCAFile = pathToCertificate;
		}
		console.log(`successfully connected to db`);
    return await mongoose.connect(process.env.MONGO_URL || "", options);
  } catch (error) {
    console.error(error);
    throw "Connection to db failed!";
  }
};
