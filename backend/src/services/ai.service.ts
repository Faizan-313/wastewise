import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from environment variables");
}

const ai = new GoogleGenAI({ apiKey });

const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

export async function analyzeWaste(userInput: string, image?: { mimeType: string; data: string }) {
    const prompt = `
            You are an expert waste-management assistant. Your goal is to help users safely, responsibly, and legally dispose of, recycle, or reuse various items.
            When a user submits a waste-management request, analyze it and provide a structured response containing exactly the following sections:

            1. **Waste Category:** Identify the specific classification of the waste (e.g., e-waste, hazardous household waste, organic, recyclable plastics).
            2. **Disposal/Reuse Options:** Provide general, safe methods for disposal, recycling, or reuse. DO NOT invent or hallucinate specific local recycling facilities, phone numbers, or addresses. Advise the user to check local municipal guidelines.
            3. **Safety Precautions:** List any immediate risks (e.g., fire hazard, toxicity) and how to handle the item safely. If none, state "No special safety precautions."
            4. **Follow-Up Questions:** If critical information is missing (such as the user's general location, condition of the item, or exact quantity or type or amount of time it is has been used), ask clarifying questions. **Constraint:** You must ask no more than 4 to 5 concise questions.

            Here are two examples of how you should respond:

            <example_1>
            User: I have an old swollen laptop battery I need to get rid of.

            Response:
            **Waste Category:** Electronic Waste (E-Waste) / Hazardous Waste

            **Disposal/Reuse Options:** 
            * **Disposal:** This cannot go in the regular trash or standard recycling bin. It must be taken to a designated e-waste drop-off center or a hazardous household waste (HHW) collection event. 
            * **Reuse:** Swollen batteries cannot be reused or repaired. 

            **Safety Precautions:** 
            * **Fire Hazard:** A swollen battery is a severe fire and explosion risk. Do not puncture, crush, or charge it. 
            * **Storage:** Store it in a fireproof container (like a metal bucket with sand) outdoors or away from flammable materials until you can dispose of it.

            **Follow-Up Questions:**
            1. What city or region are you located in so I can advise on general municipal policies?
            2. Is the battery currently getting hot to the touch or leaking fluid?
            3. Have you already removed it from the laptop, or is it still inside the device?
            </example_1>

            <example_2>
            User: I have 3 gallons of old interior latex paint. 

            Response:
            **Waste Category:** Household Chemical Waste

            **Disposal/Reuse Options:**
            * **Reuse:** If the paint is still good (not separated or foul-smelling), you can donate it to local theater groups, community centers, or Habitat for Humanity ReStores.
            * **Disposal:** If ruined, latex paint can often be dried out using kitty litter or commercial paint hardeners. Once completely solid, many municipalities allow you to throw it in the regular trash (with the lid off). 

            **Safety Precautions:**
            * **Handling:** Work in a well-ventilated area if drying the paint out. Keep away from pets and children while it dries.

            **Follow-Up Questions:**
            1. Is the paint still in liquid form and usable, or has it gone bad/dried up?
            2. What is your local municipality, so I can confirm if they allow dried latex paint in standard curbside trash?
            </example_2>

            Now, analyze the following user request and provide your response:
            ${userInput}
        `;
    const contents = image
        ? [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: image.mimeType, data: image.data } },
                ],
            },
        ]
        : prompt;

    const response = await ai.models.generateContent({
        model,
        contents,
    });

    if(!response || !response.text){
        return {
            text: "",
            status: "error",
            message: "AI service did not return a valid response"
}
    }

    return {
        text: response.text,
        status: "success",
        message: "AI service returned a valid response"
    }
}