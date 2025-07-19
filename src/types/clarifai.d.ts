declare module "clarifai" {
  interface ClarifaiResponse {
    outputs: Array<{
      data: {
        concepts: Array<{
          name: string;
          value: number;
        }>;
      };
    }>;
  }

  export class App {
    constructor(options: { apiKey: string });
    models: {
      predict: (
        modelId: string,
        data: { base64: string }
      ) => Promise<ClarifaiResponse>;
    };
  }
}
