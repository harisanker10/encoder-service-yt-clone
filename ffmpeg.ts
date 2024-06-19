import Fffmpeg from "fluent-ffmpeg";
import { S3 } from "./s3Client";
import stream from "stream";
import fs from "fs";

const s3 = new S3("bucket.hari.practice");

enum Resolution {
  "1080p" = "1920x1080",
  "720p" = "1080x720",
  "480p" = "854x480",
  "360p" = "640x360",
  "144p" = "192x144",
}

function getVideoResolution(
  videoURL: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Fffmpeg.ffprobe(videoURL, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === "video",
        );
        if (videoStream && videoStream.width && videoStream.height) {
          resolve({ width: videoStream.width, height: videoStream.height });
        } else {
          reject(
            new Error("No video stream found or resolution not available."),
          );
        }
      }
    });
  });
}

export async function encodeAndSaveToS3(
  videoURL: string,
  path: string,
  filename: string,
) {
  const resolutions: Resolution[] = [Resolution["144p"]];
  const { width, height } = await getVideoResolution(videoURL);
  if (width >= 640) resolutions.push(Resolution["360p"]);
  if (width >= 854) resolutions.push(Resolution["480p"]);
  if (width >= 1280) resolutions.push(Resolution["720p"]);
  if (width >= 1920) resolutions.push(Resolution["1080p"]);

  const progressInfo: any = {};

  let runningConversions = 0;
  let loggerStarted = false;

  resolutions.forEach(async (size) => {
    const bucketKey = createBucketKey(path, filename, size);
    const passThrough = new stream.PassThrough();
    const bucketUpstream = await s3.upload(bucketKey, passThrough);

    runningConversions += 1;

    Fffmpeg(videoURL)
      .videoCodec("libx264")
      .audioCodec("aac")
      .size(size)
      .outputFormat("mp4")
      .outputOptions([
        "-movflags faststart", // Enable fast start for web streaming
        // "-preset veryfast", // Preset for encoding speed and compression ratio
        // "-crf 23", // Constant Rate Factor (lower means better quality)
      ])
      .outputFps(24)
      .outputOptions("-movflags frag_keyframe+empty_moov")
      .on("progress", function (progress) {
        progressInfo[size] = progress?.percent;
      })
      .on("error", (err, stdout, stderr) => {
        console.error(`Error during conversion: ${err.message}`);
        console.error(`ffmpeg stdout: ${stdout}`);
        console.error(`ffmpeg stderr: ${stderr}`);
        runningConversions -= 1;
      })
      .on("end", () => {
        console.log(`Done converting ${size}`);
        runningConversions -= 1;
      })
      .pipe(passThrough);
    if (!loggerStarted) {
      const interval = setInterval(() => {
        if (runningConversions < 1) {
          clearInterval(interval);
        }
        console.log(progressInfo);
      }, 1000);
      loggerStarted = true;
    }
  });
}

function createBucketKey(
  path: string,
  filename: string,
  encodingSize: number | string,
): string {
  let key: string;
  if (path[path.length - 1] === "/") {
    key = `${path}${encodingSize.toString()}/${filename}`;
  } else {
    key = `${path}/${encodingSize}/${filename}`;
  }
  return key;
}
