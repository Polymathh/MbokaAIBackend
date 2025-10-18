// mboka_ai_backend/api/generate-poster.js
const { GoogleGenAI } = require('@google/genai');

// NOTE: This will be loaded from Vercel's Environment Variables (set later)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

const TEMPLATES = {
    'Elegant Studio': {
        prompt: (desc) => `Generate a professional, high-end studio product advertisement poster. Use a clean, minimalist white or gray background, subtle lighting, and elegant, modern Poppins-style typography. The product is: ${desc}. Include a short, punchy marketing caption on the image. Output only the image.`,
    },
    'Warm Bakery': {
        prompt: (desc) => `Design a cozy, rustic, and warm bakery advertisement poster. Use soft, golden lighting, wood textures, and a handwritten-style font. The product is: ${desc}. Include a caption like 'Freshly Baked' or 'Taste the Warmth'. Output only the image.`,
    },
    'Vibrant Market': {
        prompt: (desc) => `Create an energetic and colorful open-air market poster. Use bright, contrasting colors (like Sky Blue/Yellow) and a bold, African-inspired geometric pattern border. The product is: ${desc}. The image should convey freshness and local hustle. Output only the image.`,
    },
};

// Vercel Serverless Function handler
module.exports = async (req, res) => {
    // 1. Pre-flight check (CORS configuration)
    res.setHeader('Access-Control-Allow-Origin', '*'); // WARNING: Set this to your Flutter App's origin for security in production
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'failure', message: 'Method Not Allowed' });
    }

    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY not set!");
        return res.status(500).json({ status: 'failure', message: 'Server configuration error.' });
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    try {
        const { base64Image, description, templateName } = req.body;

        if (!base64Image || !description || !templateName || !TEMPLATES[templateName]) {
            return res.status(400).json({ status: 'failure', message: 'Missing or invalid input parameters.' });
        }

        const template = TEMPLATES[templateName];
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: 'image/jpeg' 
            }
        };

        const finalPrompt = template.prompt(description);
        
        // 2. Call the Gemini Model
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: [
                imagePart,
                { text: finalPrompt }
            ],
            config: {
                responseMimeType: 'image/jpeg', 
            }
        });

        // 3. Extract the Generated Base64 Image
        const responseImagePart = result.candidates[0].content.parts.find(p => p.inlineData);

        if (!responseImagePart) {
             return res.status(500).json({ status: 'failure', message: 'AI did not return a valid image.' });
        }

        // 4. Send response back to Flutter app
        res.status(200).json({ 
            status: 'success',
            base64Poster: responseImagePart.inlineData.data 
        });

    } catch (error) {
        console.error("Vercel Function Error:", error);
        res.status(503).json({ 
            status: 'failure', 
            message: 'AI Service Temporarily Unavailable or Rate Limited.' 
        });
    }
};