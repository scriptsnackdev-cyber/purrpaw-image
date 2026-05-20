/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, image, images: bodyImages, aspectRatio = "1:1", sampleCount = 1, model: reqModel } = body;

    // Retrieve reference images (either single string or array of strings)
    const refImages: string[] = [];
    if (bodyImages && Array.isArray(bodyImages)) {
      refImages.push(...bodyImages);
    } else if (image && typeof image === "string") {
      refImages.push(image);
    }

    // Validate prompt
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json(
        { error: "Prompt is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    // Validate sample count (1-4)
    const count = Math.min(Math.max(parseInt(sampleCount) || 1, 1), 4);

    // Retrieve the model name
    const modelName = reqModel || process.env.VERTEX_AI_MODEL || "gemini-2.5-flash-image";
    if (!modelName) {
      return NextResponse.json(
        {
          error: "Model configuration missing.",
          isConfigError: true,
          details: "VERTEX_AI_MODEL is not declared in the environment variables (.env file).",
        },
        { status: 500 }
      );
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    let location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
    if (modelName.includes("gemini-3")) {
      location = "global";
    }

    if (!projectId || projectId === "your-gcp-project-id") {
      return NextResponse.json(
        {
          error: "Google Cloud Project configuration missing.",
          isConfigError: true,
          details: "GOOGLE_CLOUD_PROJECT is not configured or still set to the default placeholder. Please update it in your .env file.",
        },
        { status: 500 }
      );
    }

    // Support direct service account credentials from environment variables (.env)
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    const aiOptions: any = {
      vertexai: true,
      project: projectId,
      location: location,
    };

    if (clientEmail && privateKey) {
      // Clean and format private key if it contains escaped \n sequences
      const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
      aiOptions.googleAuthOptions = {
        credentials: {
          client_email: clientEmail,
          private_key: formattedPrivateKey,
        },
      };
    }

    // Initialize the Google Gen AI client with Vertex AI enabled
    const ai = new GoogleGenAI(aiOptions);

    let images: string[] = [];

    // Check if the configured model is a Gemini model or an Imagen model
    if (modelName.toLowerCase().includes("gemini")) {
      // Assemble multimodal contents if an image is provided
      const contents: any[] = [];
      
      for (const imgUrl of refImages) {
        const match = imgUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
        if (match) {
          const [_, mimeType, base64Data] = match;
          contents.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            }
          });
        } else {
          return NextResponse.json(
            { error: "Invalid image format. Must be a base64 encoded data URL." },
            { status: 400 }
          );
        }
      }
      
      // Append the text prompt
      contents.push(prompt);

      // Call the Gemini Content Generation API with IMAGE response modality
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      });

      let textResponse = "";
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          images.push(`data:${mimeType};base64,${part.inlineData.data}`);
        } else if (part.text) {
          textResponse += part.text + " ";
        }
      }

      if (images.length === 0) {
        console.warn("Gemini raw response:", JSON.stringify(response));
        let errorMsg = "Gemini executed successfully but no image data was returned. Make sure you are using a Gemini model that supports image generation like gemini-2.5-flash-image.";
        const cleanText = textResponse.trim();
        if (cleanText) {
          errorMsg = cleanText;
        } else if (finishReason === "SAFETY") {
          errorMsg = "The generation was blocked by Google's Safety Filters. Please revise your description or use a less sensitive base image.";
        } else if (finishReason === "RECITATION") {
          errorMsg = "The generation was blocked due to potential copyright or recitation detection. Please adjust your prompt description.";
        } else if (finishReason) {
          errorMsg = `Generation stopped due to finish reason: ${finishReason}.`;
        } else if (response.promptFeedback?.blockReason) {
          errorMsg = `Request blocked: ${response.promptFeedback.blockReason}.`;
        }
        return NextResponse.json(
          { error: errorMsg },
          { status: 500 }
        );
      }
    } else {
      // If an image is provided but we are using an Imagen model, return an error
      if (refImages.length > 0) {
        return NextResponse.json(
          {
            error: "Image upload is not supported for Imagen models.",
            details: "Reference images (multimodal prompts) are only supported when using Gemini models (e.g. gemini-2.5-flash-image). Please check your .env configuration."
          },
          { status: 400 }
        );
      }
      // Call the standard Vertex AI Image Generation (Imagen 3.0) model
      const response = await ai.models.generateImages({
        model: modelName,
        prompt: prompt,
        config: {
          numberOfImages: count,
          aspectRatio: aspectRatio, // Supported: "1:1", "3:4", "4:3", "16:9"
          outputMimeType: "image/png",
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        return NextResponse.json(
          { error: "No images were generated by the model. Please check the prompt content safety rules." },
          { status: 500 }
        );
      }

      // Format the generated images as base64 data URLs
      images = response.generatedImages.map((generatedImage) => {
        const base64Bytes = generatedImage.image?.imageBytes || "";
        return `data:image/png;base64,${base64Bytes}`;
      });
    }

    return NextResponse.json({
      success: true,
      images,
      modelUsed: modelName,
      aspectRatio,
      prompt,
    });
  } catch (error: any) {
    console.error("Vertex AI Image Generation Error:", error);

    // Format developer-friendly GCP credentials guides
    const errorMsg = error?.message || "";
    let isConfigError = false;
    let customDetails = errorMsg;

    if (
      errorMsg.includes("Could not load the default credentials") ||
      errorMsg.includes("credentials") ||
      errorMsg.includes("ENOENT") ||
      errorMsg.includes("Service Account")
    ) {
      isConfigError = true;
      customDetails =
        "Google Application Default Credentials (ADC) could not be loaded. Please ensure you have set up a GCP Service Account key and pointed GOOGLE_APPLICATION_CREDENTIALS to its path in your .env file, or run 'gcloud auth application-default login' if developing locally.";
    } else if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API key")) {
      isConfigError = true;
      customDetails =
        "Invalid Google API key or project authorization. Ensure your service account has the 'Vertex AI User' role.";
    }

    return NextResponse.json(
      {
        error: "Failed to generate image via Vertex AI.",
        isConfigError,
        details: customDetails,
        originalError: errorMsg,
      },
      { status: 500 }
    );
  }
}
