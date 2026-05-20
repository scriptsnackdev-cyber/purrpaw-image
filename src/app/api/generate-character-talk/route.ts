/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function GET() {
  return NextResponse.json({ status: "API is active", method: "GET" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, images, characterName, talkText, theme, model: reqModel } = body;

    const imageList = images || (image ? [image] : []);

    if (imageList.length === 0) {
      return NextResponse.json(
        { error: "Please upload at least one character image." },
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
      This is a character illustration task. Please generate a high-quality illustration that features the EXACT character(s) from the attached ${imageList.length > 1 ? "images" : "image"}.
      
      Character & Scene Preservation:
      - Maintain the EXACT design, hair, outfit, facial features, and BACKGROUND of the character(s) provided in the ${imageList.length > 1 ? "photos" : "photo"}. 
      - Do NOT change the artistic style. The output should look like a professional recreation of the original but with the elements below.
      ${imageList.length > 1 ? "- If there are multiple images, arrange the characters together in a single cohesive scene while keeping their individual likenesses perfect." : ""}
      
      Design Concept:
      ${theme ? `- Theme/Atmosphere: ${theme}. Incorporate elements of this theme into the background and outfit while keeping the character identity.` : "- Atmosphere: Enhance the original atmosphere with professional lighting and details."}

      ${talkText ? `Sticker-Style Text (CRITICAL):
      - Render the following text directly on the image as part of the illustration: "${talkText}"
      - TEXT STYLE: The text MUST have a VERY thick, clean white outline (stroke) and a bright red inner fill color. 
      - FONT STYLE: Use a bold, cute, rounded "pop" anime-style font (similar to a YouTube thumbnail or a premium LINE sticker).
      - NO BOX: Do NOT use any speech bubble, dialogue box, or background container. The text must be rendered directly on top of the character/background.
      - POSITION: Position the text in a stylish, legible way at the bottom or near the main character.` : "- CRITICAL: Do NOT add any text, speech bubbles, labels, or dialogue boxes to the image."}
      
      Quality: Masterpiece, ultra-detailed, professional rendering.
      Layout: Maintain the original aspect ratio and layout style.
      
      Absolutely NO borders and NO frames.
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
    for (const imgUrl of imageList) {
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
    contents.push(prompt);

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
      let errorMsg = "Model failed to generate a character sticker.";
      
      const cleanText = textResponse.trim();
      if (cleanText) {
        errorMsg = cleanText;
      } else if (finishReason === "SAFETY") {
        errorMsg = "The generation was blocked by Google's Safety Filters. Please revise your speaker dialogue or use less sensitive reference images.";
      } else if (finishReason === "RECITATION") {
        errorMsg = "The generation was blocked due to potential copyright or recitation detection. Please adjust your sticker text.";
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
    console.error("Character Talk Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate character talk." },
      { status: 500 }
    );
  }
}
