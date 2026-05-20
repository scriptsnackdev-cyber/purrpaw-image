/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { characterImage, outfitImage, additionalRequests, model: reqModel } = body;

    // Validate inputs
    if (!characterImage || !outfitImage) {
      return NextResponse.json(
        { error: "Both characterImage and outfitImage are required." },
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

    const prompt = `
      CRITICAL TASK: DYNAMIC OUTFIT ADAPTATION (PHYSICS-BASED VIRTUAL TRY-ON)
      
      I have attached two images:
      1. BASE IMAGE (Character + Background + Pose): The person, their pose, and the background environment.
      2. OUTFIT REFERENCE: The clothing style, textures, colors, and logos to be transferred.
      
      STRICT REQUIREMENTS FOR CHARACTER & ENVIRONMENT:
      - 100% SAME POSE: Keep the character's body position, limb angles, and posture IDENTICAL to the BASE IMAGE.
      - 100% SAME FACE: Keep the character's face, hair, and expression IDENTICAL to the BASE IMAGE.
      - 100% SAME BACKGROUND: Keep the exact background and lighting from the BASE IMAGE.
      
      OUTFIT ADAPTATION RULES (IMPORTANT):
      - DO NOT force the rigid shape or silhouette from the OUTFIT REFERENCE onto the character.
      - DYNAMIC DRAPING: The clothing must drape, fold, and wrinkle NATURALLY according to the character's specific pose and body shape in the BASE IMAGE.
      - LOGOS & DETAILS: Faithfully transfer all logos, text, patterns, and specific accessories visible in the OUTFIT REFERENCE, ensuring they follow the curves and folds of the fabric as it sits on the character's body.
      - TEXTURE & FABRIC: Match the material (e.g., cotton, silk, denim, etc.) and lighting of the outfit to the environment of the BASE IMAGE.
      
      ADDITIONAL REQUESTS: ${additionalRequests || "None."}
      
      The result should look like the person in the BASE IMAGE just happened to be wearing the clothes from the OUTFIT REFERENCE, with realistic fabric physics and natural integration.
    `;

    const getMimeTypeAndBase64 = (dataUrl: string) => {
      const match = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], base64Data: match[2] };
      }
      return { mimeType: "image/png", base64Data: dataUrl.split(",")[1] || dataUrl };
    };

    const charImgInfo = getMimeTypeAndBase64(characterImage);
    const outfitImgInfo = getMimeTypeAndBase64(outfitImage);

    const contents: any[] = [
      {
        inlineData: {
          data: charImgInfo.base64Data,
          mimeType: charImgInfo.mimeType,
        }
      },
      {
        inlineData: {
          data: outfitImgInfo.base64Data,
          mimeType: outfitImgInfo.mimeType,
        }
      },
      prompt
    ];

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
      let errorMsg = "Model failed to generate a try-on image.";
      
      const cleanText = textResponse.trim();
      if (cleanText) {
        errorMsg = cleanText;
      } else if (finishReason === "SAFETY") {
        errorMsg = "The generation was blocked by Google's Safety Filters. Please revise your description or use a less sensitive base/outfit image.";
      } else if (finishReason === "RECITATION") {
        errorMsg = "The generation was blocked due to potential copyright or recitation detection. Please adjust your prompt/images.";
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
    console.error("PureWare Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate pureware image." },
      { status: 500 }
    );
  }
}
