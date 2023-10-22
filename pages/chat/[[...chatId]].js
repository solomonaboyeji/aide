import Head from "next/head";
import { ChatSidebar } from "../../components/ChatSidebar";
import { useEffect, useRef, useState } from "react";
import { streamReader } from "openai-edge-stream";
import { v4 as uuid } from 'uuid'
import { Message } from "../../components/Message";
import { useRouter } from "next/router";
import { getSession } from "@auth0/nextjs-auth0";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

export default function ChatPage({ chatId, title, messages: existingMessages = [] }) {

    const [newChatId, setNewChatId] = useState(null);
    const [messageText, setMessageText] = useState("");
    const [incomingMessage, setIncomingMessage] = useState("");
    const [newChatMessages, setNewChatMessages] = useState([]);
    const [generatingResponse, setGeneratingResponse] = useState(false);
    const [fullMessage, setFullMessage] = useState("");

    const scrollableDivRef = useRef();

    useEffect(() => {
        scrollableDivRef.current.scrollTop = scrollableDivRef.current.scrollHeight;
    }, []);

    const router = useRouter();

    // When route changes, 
    useEffect(() => {
        setNewChatMessages([])
        setNewChatId(null)
    }, [chatId])


    // save the newly string message to new chat messages
    useEffect(() => {
        if (!generatingResponse && fullMessage) {
            setNewChatMessages(prev => [...prev, {
                _id: uuid(), role: 'assistant', 'content': fullMessage
            }])
            setFullMessage("")
        }

    }, [generatingResponse, fullMessage])

    // If we have created a new chat
    useEffect(() => {
        if (!generatingResponse && newChatId) {
            setNewChatId(null)
            router.push(`/chat/${newChatId}`);
        }
    }, [newChatId, generatingResponse, router]) // anytime each of this change, effect will run



    const handleSubmit = async (e) => {
        e.preventDefault();
        setGeneratingResponse(true);
        setNewChatMessages(prev => {
            return [...prev, {
                _id: uuid(),
                role: 'user',
                content: messageText
            }];
        })
        setMessageText("");
        const response = await fetch(`/api/chat/sendMessage`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                message: messageText,
                chatId: chatId
            })
        });

        const data = response.body;
        if (!data) return;

        const reader = data.getReader();
        let content = ""
        await streamReader(reader, (openAIMessage) => {
            if (openAIMessage.event === 'newChatId') {
                setNewChatId(openAIMessage.content)
            } else {
                setIncomingMessage(s => `${s}${openAIMessage.content}`)
                content = content + openAIMessage.content
            }
        });

        setFullMessage(content)
        setIncomingMessage("")
        setGeneratingResponse(false);
    };

    const allMessages = [...existingMessages, ...newChatMessages]

    return (
        <div>
            <Head>
                <title>New Chat</title>
            </Head>

            <div className="grid h-screen grid-cols-[260px_1fr]">
                <ChatSidebar chatId={chatId} />
                <div className="flex overflow-hidden bg-gray-700 flex-col" >
                    <div className="flex-1 text-white overflow-scroll" ref={scrollableDivRef} >
                        {allMessages.map(message => (<Message key={message._id} role={message.role} content={message.content} />))}
                        {!!incomingMessage && <Message role={'assistant'} content={incomingMessage} />}
                    </div>
                    <footer className="bg-gray-800 p-10" >
                        <form id="ChatGPT-ID" onSubmit={handleSubmit} >
                            <fieldset className="flex gap-2" disabled={generatingResponse} >
                                <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                                    placeholder={generatingResponse ? "" : "Send a message..."}
                                    className="w-full resize-none rounded-md bg-gray-700 p-2 text-white focus:border-emerald-500 focus:bg-gray-600 focus:outline focus:outline-emerald-500  " />
                                <button className="btn" type="submit">Send</button>
                            </fieldset>
                        </form>
                    </footer>
                </div>
            </div>

        </div>
    );
}


export const getServerSideProps = async (context) => {

    // grab the chat id
    const chatId = context.params?.chatId?.[0] || null;

    if (chatId) {
        const { user } = await getSession(context.req, context.res)
        const client = await clientPromise;
        const db = client.db("ChattyPete")
        const chat = await db.collection('chats').findOne({
            userId: user.sub,
            _id: new ObjectId(chatId)
        });
        return {
            props: {
                chatId,
                title: chat.title,
                messages: chat.messages.map((message) => ({
                    ...message, _id: uuid()
                })
                )
            }
        }
    }

    return {
        props: {
        }
    }
}