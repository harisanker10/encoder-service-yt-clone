// import { SQS } from "./queue";
//
// const sqs = new SQS();
//
// (async () => {
//   sqs.receiveMessage();
// })();

import { encodeAndSaveToS3 } from "./ffmpeg";
import { S3 } from "./s3Client";

(async () => {
  const s3 = new S3("bucket.hari.practice");
  const videoUrl = await s3.getSignedUrl("067 Adding Markers.mp4");
  console.log({ videoUrl });
  console.time("transcodingTime");
  encodeAndSaveToS3(videoUrl, "production/", "lmao.mp4");
  console.timeEnd("transcodingTime");
})();
