import { SQSClient, ReceiveMessageCommand } from "@aws-sdk/client-sqs";

export class SQS {
  private client: SQSClient;
  private queueURL: string;

  constructor() {
    this.queueURL =
      "https://sqs.ap-south-1.amazonaws.com/929505448367/video-uploads";
    this.client = new SQSClient({
      credentials: {
        accessKeyId: process.env.accessKeyId as string,
        secretAccessKey: process.env.secretAccessKey as string,
      },
      region: process.env.region as string,
    });
  }

  async receiveMessage() {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueURL,
      VisibilityTimeout: 180,
      MaxNumberOfMessages: 1,
    });

    const res = await this.client.send(command);
    console.log({ res, messages: res.Messages });
    return res;
  }
}
