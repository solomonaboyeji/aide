import { OpenAIEdgeStream } from "openai-edge-stream";

// EDGE FUNCTIONS do not run in the NodeJS runtime. It runs in the V8 runtime which is light-weight.
// The reason will chose this function to be edge is to make it serverless and run very close to the user

export const config = {
    runtime: "edge",
}

export default async function handler(req) {
    try {
        const { chatId: chatIdFromParam, message } = await req.json();
        let chatId = chatIdFromParam
        const initialChatMessage = {
            role: "system",
            content: 'Your name is Chatty Pete. An incredibly intelligent and quick-thinking AI, that always replies with an enthusiastic and positive energy. You were created by REGNIFY. Your response must be formatted as markdown.'
        }

        let newChatId;
        let chatMessages = [];
        if (chatId) {
            // add message to chat
            const response = await fetch(`${req.headers.get("origin")}/api/chat/addMessageToChat`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    cookie: req.headers.get('cookie'),
                },
                body: JSON.stringify({
                    chatId, role: 'user', content: message
                })

            })
            const json = await response.json();
            chatMessages = json.chat.messages || [];

        } else {
            // Store a new chat into the database
            const response = await fetch(`${req.headers.get("origin")}/api/chat/createNewChat`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    cookie: req.headers.get('cookie'),
                },
                body: JSON.stringify({
                    message: message
                })
            })
            const json = await response.json();
            chatId = json._id;
            newChatId = json._id;
            chatMessages = json.messages || [];
        }

        const messagesToInclude = [];
        chatMessages.reverse();
        let usedTokens = 0;
        for (let chatMessage of chatMessages) {
            const messageTokens = chatMessage.content.length / 4;
            usedTokens = usedTokens + messageTokens
            if (usedTokens < 2000) {
                messagesToInclude.push(chatMessage)
            } else break
        }
        messagesToInclude.reverse()

        const stream = await OpenAIEdgeStream("https://api.openai.com/v1/chat/completions", {
            headers: {
                "content-type": 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            method: 'POST',
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    initialChatMessage, ...messagesToInclude
                ],
                stream: true

            })
        }, {
            onBeforeStream: (({ emit }) => {
                // The very first object that will be stream to the user
                if (newChatId) emit(chatId, "newChatId");
            }),
            onAfterStream: async ({ fullContent }) => {
                const response = await fetch(`${req.headers.get("origin")}/api/chat/addMessageToChat`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        cookie: req.headers.get('cookie')
                    },
                    body: JSON.stringify({
                        chatId, role: 'assistant', content: fullContent
                    })
                })
            }
        });

        return new Response(stream)
    } catch (error) {
        console.log("AN ERROR OCCURRED IN sendMessage", error)

    }
}