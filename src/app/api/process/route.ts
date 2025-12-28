import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

import { ColumnConfig } from '@/components/ColumnMapper';

// Helper to get API Key robustly
function getApiKey() {
    let key = process.env.GOOGLE_GENAI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!key && process.env.FIREBASE_WEBAPP_CONFIG) {
        try {
            const config = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
            key = config.apiKey;
        } catch (e) {
            console.error("Failed to parse FIREBASE_WEBAPP_CONFIG in API route", e);
        }
    }
    return key;
}

async function fetchFileAsBase64(url: string): Promise<{ data: string, mimeType: string } | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const contentType = response.headers.get('content-type') || '';
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');

        return {
            data: base64,
            mimeType: contentType
        };
    } catch (e) {
        console.error("Fetch Error", e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    const apiKey = getApiKey();
    if (!apiKey) {
        return NextResponse.json({ status: 'Error', reasoning: 'No API Key configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const { row, instruction, columnConfigs } = await req.json() as { row: any, instruction: string, columnConfigs: ColumnConfig[] };

        // Identify and fetch files from link columns
        const fileParts: any[] = [];
        const linkConfigs = columnConfigs.filter(c => c.type === 'link');

        for (const config of linkConfigs) {
            const url = row[config.targetHeader];
            if (typeof url === 'string' && url.startsWith('http')) {
                const fileData = await fetchFileAsBase64(url);
                if (fileData && (fileData.mimeType.includes('image') || fileData.mimeType.includes('pdf'))) {
                    fileParts.push({
                        inlineData: {
                            data: fileData.data,
                            mimeType: fileData.mimeType
                        }
                    });
                }
            }
        }

        // Construct Prompt
        const rowString = JSON.stringify(row);
        const prompt = `
        You are an intelligent data processor.
        
        Task: ${instruction}
        
        Data Row: ${rowString}
        
        If there are any attached documents (images or PDFs), they correspond to the "link" columns in the data row. 
        Compare the data row with the visual/textual information in the attached files.
        
        Respond ONLY with a valid JSON object strictly following this schema:
        {
            "status": "Short status string (e.g. Approved, Rejected, Review)",
            "reasoning": "Brief explanation of the decision based on both data and provided documents"
        }
        Do not include markdown formatting or backticks. Just the JSON.
        `;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Combine prompt text with file parts
        const input = fileParts.length > 0 ? [prompt, ...fileParts] : prompt;
        const result = await model.generateContent(input);
        const responseText = result.response.text();

        try {
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(cleanJson);
            return NextResponse.json(json);
        } catch (e) {
            console.error("JSON Parse Error", responseText);
            return NextResponse.json({
                status: 'Error',
                reasoning: 'AI returned invalid format: ' + responseText.substring(0, 50)
            });
        }

    } catch (error) {
        console.error("AI Error", error);
        return NextResponse.json({ status: 'Error', reasoning: 'Processing failed' }, { status: 500 });
    }
}
