// THIS IS NOT AN EDGE FUNCTION, it will run in the node environment.

import { getSession } from "@auth0/nextjs-auth0"
import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
    try {
        // Currently login user (from auth0)
        const { user } = await getSession(req, res);
        const { message } = req.body; // slightly different from edge function as we do not need to wait to get the data here

        const newUserMessage = {
            role: 'user',
            'content': message
        }
        const client = await clientPromise;
        const db = client.db("ChattyPete")
        const chat = await db.collection("chats").insertOne({
            userId: user.sub,
            messages: [newUserMessage],
            title: message
        });
        res.status(200).json({
            _id: chat.insertedId.toString(),
            messages: [newUserMessage],
            title: message
        })
    } catch (error) {
        res.status(500).json({
            message: 'An error occurred when creating a new chat.'
        })
        console.log("ERROR OCCURRED IN CREATE NEW CHAT", error)
    }
}