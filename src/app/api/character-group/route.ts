/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, prompt: details, model: reqModel } = body;

    // Validate inputs
    if (!images || !Array.isArray(images) || images.length < 2) {
      return NextResponse.json(
        { error: "Please upload at least 2 character images." },
        { status: 400 }
      );
    }

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

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    const aiOptions: any = {
      vertexai: true,
      project: projectId,
      location: location,
    };

    if (clientEmail && privateKey) {
      const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
      aiOptions.googleAuthOptions = {
        credentials: {
          client_email: clientEmail,
          private_key: formattedPrivateKey,
        },
      };
    }

    const ai = new GoogleGenAI(aiOptions);

    const systemPrompt = `
      CRITICAL TASK: MULTI-CHARACTER GROUP GENERATION
      
      I have attached ${images.length} images of characters. 
      Your task is to generate a SINGLE cohesive illustration featuring ALL of these characters together in one scene.
      
      SCENE DETAILS:
      "${details || "Sitting together in a beautiful setting"}"
      
      STRICT CHARACTER CONSISTENCY REQUIREMENTS:
      1. FACE & HAIR: The facial features, hair style, and hair color of EACH character MUST MATCH the reference images EXACTLY.
      2. CLOTHING & ACCESSORIES: Maintain the clothing and specific accessories (headwear, jewelry, etc.) from the reference images for each character.
      3. ART STYLE: Use the EXACT artistic style (line work, coloring, shading) from the reference images. The output must look like it was drawn by the same artist.
      4. INDIVIDUALITY: Each character must be distinct and recognizable as the person from their respective reference image.
      
      COMPOSITION:
      - Arrange the characters naturally within the scene according to the details provided.
      - Ensure they are interacting or positioned as described (e.g., "sitting together in a house").
      - The background should be detailed and consistent with the scene description.
      
      QUALITY: Masterpiece, high resolution, professional digital art, perfect character likeness.
      NO borders, NO frames, NO text.
    `;

    const getMimeTypeAndBase64 = (dataUrl: string) => {
      const match = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], base64Data: match[2] };
      }
      return { mimeType: "image/png", base64Data: dataUrl.split(",")[1] || dataUrl };
    };

    const contents: any[] = [];
    
    // Add reference images
    for (const imgUrl of images) {
      if (imgUrl) {
        const { mimeType, base64Data } = getMimeTypeAndBase64(imgUrl);
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          }
        });
      }
    }

    // Append the prompt
    contents.push(systemPrompt);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    let imageUrl = "";
    let textResponse = "";
    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const parts = candidate?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        const mimeType = part.inlineData.mimeType || "image/png";
        imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textResponse += part.text + " ";
      }
    }

    if (!imageUrl) {
      console.warn("Gemini raw response:", JSON.stringify(response));
      let errorMsg = "Model failed to generate a group image.";
      
      const cleanText = textResponse.trim();
      if (cleanText) {
        errorMsg = cleanText;
      } else if (finishReason === "SAFETY") {
        errorMsg = "The generation was blocked by Google's Safety Filters. Please try modifying your scene description or using different/less sensitive reference images.";
      } else if (finishReason === "RECITATION") {
        errorMsg = "The generation was blocked due to potential copyright or recitation detection. Please adjust your prompt description.";
      } else if (finishReason) {
        errorMsg = `Generation stopped due to finish reason: ${finishReason}.`;
      } else if (response.promptFeedback?.blockReason) {
        errorMsg = `Request blocked: ${response.promptFeedback.blockReason}.`;
      }
      
      throw new Error(errorMsg);
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl
    });

  } catch (error: any) {
    console.error("Character Group Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate character group." },
      { status: 500 }
    );
  }
}
