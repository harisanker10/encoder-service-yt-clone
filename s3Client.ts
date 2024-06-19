import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ReadStream } from "fs";
import { Readable } from "stream";
import fs from "fs";

export class S3 {
  private readonly client: S3Client;
  constructor(private readonly bucket: string) {
    this.client = new S3Client({
      credentials: {
        accessKeyId: process.env.accessKeyId as string,
        secretAccessKey: process.env.secretAccessKey as string,
      },
      region: process.env.region as string,
    });
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Key: key,
      Bucket: this.bucket,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async streamUpload(key: string, body: ReadStream | Readable, length: number) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentLength: length,
    });
    return this.client.send(command);
  }
  async getStream(key: string) {
    const command = new GetObjectCommand({
      Key: key,
      Bucket: this.bucket,
    });
    return this.client.send(command).then((data) => {
      return data.Body;
    });
  }

  async upload(key: string, body: Readable) {
    const upload = new Upload({
      client: this.client,
      queueSize: 1,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: body,
      },
    });
    upload
      .done()
      .then(async (data) => {
        console.log("Upload complete:", data);
        const url = await this.getSignedUrl(key);
        console.log({ url });
        return url;
      })
      .catch((err) => {
        console.error("Error uploading file:", err);
      });
  }

  async getObjectReadStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Key: key,
      Bucket: this.bucket,
    });

    const item = await this.client.send(command);
    console.log({ item });
    return item.Body as Readable;
  }
}
