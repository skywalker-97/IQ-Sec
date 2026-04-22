export const config = {
    maxDuration: 60,
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    try {
        const { text, image } = req.body; // 'image' field support add kiya
        const API_KEY = process.env.GEMINI_KEY;

        if (!API_KEY) throw new Error("API Key Missing in Vercel Dashboard");

        // Use 3-flash-preview for Vision support and stability
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${API_KEY}`;

        let requestBody;

            if (image) {
                requestBody = {
                    contents: [{
                        parts: [
                            { 
                            text: `TASK: Carefully analyze the provided image and answer EXACTLY based on the question shown.
                            1. CHECK FOR MCQ: Look for options (radio buttons, choices, lists). If you see options, figure out the correct one and output ONLY its NUMBER (1, 2, 3, or 4) based on top-to-bottom order. DO NOT write code.
                            2. IF CODING / DSA: Write highly optimized, completely functional, and 100% accurate code. 
                                - If it's a standard testpad format, include necessary libraries/imports (e.g., #include <bits/stdc++.h> or import java.util.*;). 
                                - If it's a LeetCode style question (only asking for a class/method), provide just that. 
                                - Output ONLY raw code. NO markdown formatting, NO conversational text, NO explanations.
                            3. STRICTEST RULE: NEVER talk to the user. NEVER say "Please provide options" or "This is not an MCQ".
                            4. IF AWS / CLOUD LAB (e.g., Task 1, Task 2): You MUST act as an expert and write detailed, step-by-step instructions to solve the lab. 
                                - Write the exact AWS Console navigation steps (e.g., EC2 > Launch Instance > AMI selection).
                                - Write the exact CLI/Terminal commands required (e.g., ssh -i key.pem ec2-user@ip). 
                                - Format the answer clearly with "Task 1:" and "Task 2:" headings and numbered bullet points so the user can directly paste it into their exam text box.
                                - Use simple Basic English and easy words and be concise, but do not skip any step.
                            5. IF THEORY: Provide a direct, exact, and accurate text answer.
                            6. IF AWS/VPC/CLOUD LAB: Provide a detailed numbered list covering every requirement mentioned in the question (VPC, Subnets, IGW, Route Tables, EC2, etc.).

                            7. CRITICAL YOU ARE A MATHEMATICAL EXPERT. FAILURE IS NOT AN OPTION.
                                1. IF APTITUDE/MATH/LOGIC:
                                - You MUST extract every number and symbol with 100% precision.
                                - Use 'Chain of Thought': Write down the formula, plug in values, and solve it mentally step-by-step.
                                - Double-check the final calculation before picking an option.
                                - Output ONLY the option number (1, 2, 3, or 4).
                                
                            
                             `

                               
                            },
                            { inlineData: { mimeType: "image/jpeg", data: image } }
                        ]
                    }]
                };
            }
         else {
            // 📝 TEXT REQUEST (Normal Ctrl+C wala)
            // 📝 TEXT REQUEST (Updated for Smart MCQ Matching)
            // 📝 TEXT REQUEST (Updated for MCQ Detection)
            requestBody = {
                    contents: [{
                        parts: [{
                            text: `TASK: Analyze the text carefully and follow this exact logic:
                            1. CHECK FOR MCQ: Look for options/choices at the bottom. If yes, output ONLY the NUMBER (1, 2, 3, or 4) of the correct option. DO NOT write code.
                            2. IF CODING / DSA: Write highly optimized, completely functional, and 100% accurate code. 
                                - If it's a standard testpad format, include necessary libraries/imports (e.g., #include <bits/stdc++.h> or import java.util.*;). 
                                - If it's a LeetCode style question (only asking for a class/method), provide just that. 
                                - Output ONLY raw code. NO markdown formatting, NO conversational text, NO explanations.
                            3. STRICTEST RULE: NEVER complain. NEVER say "Please provide options". 
                            4. IF AWS / CLOUD LAB (e.g., Task 1, Task 2): You MUST act as an expert and write detailed, step-by-step instructions to solve the lab. 
                                - Write the exact AWS Console navigation steps (e.g., EC2 > Launch Instance > AMI selection).
                                - Write the exact CLI/Terminal commands required (e.g., ssh -i key.pem ec2-user@ip). 
                                - Format the answer clearly with "Task 1:" and "Task 2:" headings and numbered bullet points so the user can directly paste it into their exam text box.
                            5. IF THEORY: Provide a direct, exact, and accurate text answer.
                                
                            6. IF AWS/VPC/CLOUD LAB: Provide a detailed numbered list covering every requirement mentioned in the question (VPC, Subnets, IGW, Route Tables, EC2, etc.).

                            Question Text:
                            ${text}`
                        }]
                    }]
                };
        }

        // Common Configs (Wahi jo aapne di thi)
        requestBody.safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ];
        requestBody.generationConfig = {
            temperature: 0.1,
            maxOutputTokens: 8192,
        };

        const googleResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await googleResponse.json();

        if (data.error) {
            return res.status(data.error.code || 500).json({ error: data.error.message });
        }

        if (!data.candidates || !data.candidates[0].content) {
            return res.status(500).json({ error: "Safety filter blocked the response." });
        }

        //  FIX FOR DSA: Sirf markdown hatao, code ka syntax mat todo
        let answer = data.candidates[0].content.parts[0].text
            .replace(/```[a-zA-Z]*\n?/g, '') // 1. Shuru ka markdown hatane ke liye (jaise ```java ya ```cpp)
            .replace(/```/g, '')             // 2. End ka markdown hatane ke liye (```)
            .trim();

        res.status(200).json({ answer: answer });

    } catch (error) {
        console.error("Server Crash:", error.message);
        res.status(500).json({ error: error.message });
    }
}