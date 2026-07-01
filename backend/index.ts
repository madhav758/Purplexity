import express from "express";
import { tavily } from "@tavily/core";
import { SYSTEM_PROMPT, PROMPT_TEMPLATE } from "./prompt";
import { streamText } from 'ai';
import { generateText } from 'ai';
import 'dotenv/config';
import { middleware } from "./middleware";
import cors from "cors";
import { supabase } from "./client";
import { prisma } from "./db";
import { log } from "node:console";
import { PROMPT_TEMPLATE_FOLLOWUP, SYSTEM_PROMPT_FOLLOWUP } from "./prompt_followup";
// import { z } from "zod";
// import { prisma } from "./db";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY })
const app = express()

app.use(express.json());
app.use(cors());
app.post("/webhook/user_created", async (req, res) => {
    const payload = req.body;
    console.log(payload)
    if (payload.type == "INSERT") {
        try {
            await prisma.user.create(
                {
                    data: {
                        id: payload.record.id,
                        supabaseId: payload.record.id,
                        email: payload.record.email,
                        provider: payload.record.raw_app_meta_data.provider == "google" ? "Google" : "Github",
                        name: payload.record.raw_user_meta_data.name
                    }
                }
            );
        } catch (error) {
            console.log(error);

        }

    }
    res.json({ ok: true })
})
// Past conversations get 
app.get('/conversations', middleware, async (req, res) => {
    const conversations = await prisma.conversation.findMany({
        where: { userId: req.userId },
        select: {
            id: true,
            title: true,
            slug: true,
        },
        orderBy: { id: "asc" },
    })
    res.json({ conversations })
})
//past convcersation get
app.get('/conversation/:conversationId', middleware, async (req, res) => {
    const conversation = await prisma.conversation.findFirst({
        where: {
            userId: req.userId,
            id: req.params.conversationId as string
        },
        include: {
            messages: { orderBy: { createdAt: 'asc' } }
        }
    })
    if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
    }
    res.json({ conversation });
})
app.post("/purplexity_ask", middleware, async (req, res) => {
    //STEP 1 :get the query 
    const query = req.body.query; //Give me the best rust resources
    console.log("this isa the req.body for /purplexity_ask  ", req.body)
    const { conversationId } = req.body;

    //STEP 2 :make sire the user has access/ credits to hit the endpoint 

    //STEP 3 :check id we have web search indexed for a similar query 

    //STEP 4 :web search to gather resources
    const webSearchResponse = await client.search(query, {
        searchDepth: "advanced"
    })

    const webSearchResult = webSearchResponse.results;
    //STEP 5 :do sone context engineering on the prompt+ web search response 

    //STEP 6 :hit the LLM and stream back the response 
    // hit the llm? -> llm api/openrouter/ vercel ai gateway
    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query);
    const result = streamText({
        model: 'openai/gpt-5.5',
        prompt: prompt,
        system: SYSTEM_PROMPT,
    });
    res.header('Cache-Control', 'no-cache');
    res.header('Content-Type', 'text/event-stream');

    let AssistantResponse = ""
    for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
        res.write(textPart);
        AssistantResponse += textPart;
    }
    res.write("\n-------------SOURCES-------------\n");


    // STEP 7 :also stream back the sources and the follow up questions (which we can get from another parallel LLM call)
    res.write("\n<SOURCES>\n")
    res.write(JSON.stringify(webSearchResult.map(result => ({ url: result.url }))))
    res.write("\n</SOURCES>\n")

    //STEP: 8 Close the event stream 
    res.end();

    //create the coversation in the Database 
    const title = query.length > 60 ? query.slice(0, 60) + "..." : query;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const existingConversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
    });
    if (!existingConversation) {
        await prisma.conversation.create({
            data: {
                id: conversationId,      // client-generated UUID from req.body
                title,
                slug,
                userId: req.userId       // from middleware
            }
        });
        await prisma.message.create({
            data: { content: query, role: "User", conversationId }
        });
        await prisma.message.create({
            data: { content: AssistantResponse, role: "Assistant", conversationId }
        });
    }



});

app.post('/purplexity_ask/follow_up', middleware, async (req, res) => {
    // STEP 1 : get the existing chat from the user 
    const { conversationId, query } = req.body;
    const convo = await prisma.conversation.findFirst({
        where: {
            userId: req.userId,
            id: conversationId
        },
        include: {
            messages: { orderBy: { createdAt: 'asc' } }
        }
    })
    // STEP 2  - Forward the full history to the LLM to make a new prompt 
    const messageHistory = convo?.messages.map((message) =>
        `${message.role}: ${message.content}`
    ).join("\n")
    const promptFollowUp = PROMPT_TEMPLATE_FOLLOWUP
        .replace('{{PREVIOUS_CONVERSATION}}', messageHistory ?? "")
        .replace('{{USER_QUERY}}', query)
    const { text: generatedPrompt } = await generateText({
        model: 'openai/gpt-5.5',
        prompt: promptFollowUp,
        system: SYSTEM_PROMPT_FOLLOWUP,
    })
    //TSEP 2.5 - todo : do some context engoneering 

    const webSearchResponseFollowUp = await client.search(generatedPrompt, {
        searchDepth: "advanced"
    })
    const webSearchResultFollowUp = webSearchResponseFollowUp.results;
    console.log(webSearchResultFollowUp);

    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResultFollowUp))
        .replace("{{USER_QUERY}}", query);

    // this edits the message history with roles to pass to the LLM so that it cna do a bette job than just inserting everything in the prompt
    const formattedMessageHistory = convo?.messages.map(msg => ({
        role: msg.role == "User" ? 'user' as const : 'assistant' as const,
        content: msg.content
    })) ?? []

    // STEP 3  - Stream the response
    const result = streamText({
        model: 'openai/gpt-5.5',
        system: SYSTEM_PROMPT,
        messages: [...formattedMessageHistory,
        { role: 'user', content: prompt }
        ]
    })


    res.header('Cache-Control', 'no-cache');
    res.header('Content-Type', 'text/event-stream');

    let fullAssistantResponse = ""
    for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
        res.write(textPart);
        fullAssistantResponse += textPart;
    }
    res.write("\n-------------SOURCES-------------\n");


    // STEP 7 :also stream back the sources and the follow up questions (which we can get from another parallel LLM call)
    res.write("\n<SOURCES>\n")
    res.write(JSON.stringify(webSearchResultFollowUp.map(result => ({ url: result.url }))))
    res.write("\n</SOURCES>\n")

    //STEP: 8 Close the event stream 
    res.end();
    await prisma.message.create({
        data: {
            content: query,
            role: "User",
            conversationId: conversationId
        }
    });
    await prisma.message.create({
        data: {
            content: fullAssistantResponse,
            role: "Assistant",
            conversationId: conversationId
        }
    })


})

app.listen(3001, () => {
    console.log("Server is running on port 3001");
});