const userDb = require("../schemas/registerSchema.js")
const resSend = require("../plugins/sendRes")
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken")
const {v4: uuidv4} = require('uuid');

module.exports = {

    registerUser: async (req, res) => {
        try {
            const {username, pass1: password} = req.body;

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            const newUser = new userDb({
                username,
                password: passwordHash,
                image: "https://www.shutterstock.com/image-vector/vector-flat-illustration-grayscale-avatar-600nw-2264922221.jpg"
            });

            await newUser.save();

            resSend(res, true, null, null);
        } catch (error) {
            console.error(error);
            resSend(res, false, "An error occurred during registration", null);
        }
    },
    loginUser: async (req, res) => {
        try {
            const {username, password} = req.body;

            const user = await userDb.findOne({username});

            if (!user) {
                return resSend(res, false, "Invalid username or password", null);
            }

            const passValid = await bcrypt.compare(password, user.password);

            if (passValid) {
                const data = {
                    id: user._id,
                    username: user.username,
                    image: user.image
                };

                const token = jwt.sign(data, process.env.JWT_SECRET)

                return resSend(res, true, null, {token, user: data});
            } else {
                return resSend(res, false, "Invalid username or password", null);
            }
        } catch (error) {
            console.error(error);
            resSend(res, false, "An error occurred during login", null);
        }
    },
    updateImage: async (req, res) => {
        try {
            const {userId, newImage} = req.body;

            if (!userId || !newImage) {
                return resSend(res, false, "User ID and image URL are required.", null);
            }

            const user = await userDb.findById(userId);

            if (!user) {
                return resSend(res, false, "User not found.", null);
            }

            const oldImage = user.image;

            user.image = newImage
            await user.save()

// Update the profile image in the messages array
            await userDb.updateMany(
                {'conversations.messages.senderImage': oldImage}, // Find all users where the old profile image exists in the sender
                {$set: {'conversations.$[conv].messages.$[msg].senderImage': newImage}}, // Update the old profile image with the new one
                {
                    arrayFilters: [
                        {'conv.messages.senderImage': oldImage}, // Filter for the conversations that contain the old profile image in the sender
                        {'msg.senderImage': oldImage} // Filter for the specific message sender to update
                    ]
                }
            );


            const userWithoutPassword = {
                id: user._id,
                username: user.username,
                image: user.image,
            };

            return resSend(res, true, null, userWithoutPassword);
        } catch (error) {
            console.error(error);
            resSend(res, false, "An error occurred while updating the image.", null);
        }
    },
    updateUsername: async (req, res) => {
        try {
            const {userId, username} = req.body;

            const existingUser = await userDb.findOne({username});

            if (existingUser) {
                return resSend(res, false, "This username is already in use", null);
            }

            const user = await userDb.findById(userId);

            if (!user) {
                return resSend(res, false, "User not found.", null);
            }

            const oldUsername = user.username;

            user.username = username
            await user.save()

            await userDb.updateMany(
                {'conversations.participants': oldUsername}, // Find all users where the old username is a participant
                {$set: {'conversations.$[conv].participants.$[participant]': username}}, // Update the old username with the new one
                {
                    arrayFilters: [
                        {'conv.participants': oldUsername}, // Filter for the conversations that contain the old username
                        {'participant': oldUsername} // Filter for the specific participant to update
                    ]
                }
            );

// Update the sender's username in the messages array
            await userDb.updateMany(
                {'conversations.messages.sender': oldUsername}, // Find all users where the old username is a sender
                {$set: {'conversations.$[conv].messages.$[msg].sender': username}}, // Update the old sender username with the new one
                {
                    arrayFilters: [
                        {'conv.messages.sender': oldUsername}, // Filter for the conversations that contain the old username as a sender
                        {'msg.sender': oldUsername} // Filter for the specific message sender to update
                    ]
                }
            );

            const userWithoutPassword = {
                id: user._id,
                username: user.username,
                image: user.image,
            };

            return resSend(res, true, null, userWithoutPassword);
        } catch (error) {
            console.error(error);
            resSend(res, false, "An error occurred while updating the username", null);
        }
    },

    updatePass: async (req, res) => {
        const {userId, newPass} = req.body;

        try {
            const user = await userDb.findById(userId);

            if (!user) {
                return resSend(res, false, "User not found", null);
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(newPass, salt);

            user.password = passwordHash;
            await user.save();

            const userWithoutPassword = {
                id: user._id,
                username: user.username,
                image: user.image,
            };

            resSend(res, true, "Password updated successfully", userWithoutPassword);
        } catch (error) {
            console.error(error);
            resSend(res, false, "An error occurred while updating the password", null);
        }
    },
    getUsers: async (req, res) => {
        try {
            const users = await userDb.find();
            res.status(200).json({data: users});
        } catch (error) {
            res.status(500).json({error: 'Failed to fetch users', message: error.message});
        }
    },
    getSingleUser: async (req, res) => {
        try {
            const {username} = req.params;
            const user = await userDb.findOne({username});

            if (!user) {
                return res.status(404).send({error: true, message: "User not found"});
            }

            const {password, ...userCopy} = user.toObject();
            const conversationCount = user.conversations ? user.conversations.length : 0;

            res.send({error: false, message: "success", data: {...userCopy, conversationCount}});
        } catch (error) {
            console.error("Error in getUserByUsername:", error);
            res.status(500).send({error: true, message: "Internal Server Error"});
        }
    },
    createOrUpdateConversation: async (req, res) => {
        try {
            const {username} = req.params;
            const {sender, image, message} = req.body;

            const recipient = await userDb.findOne({username});

            if (!recipient) {
                return res.status(404).send({error: true, message: "Recipient not found"});
            }

            const senderUser = await userDb.findOne({username: sender});

            if (!senderUser) {
                return res.status(404).send({error: true, message: "Sender not found"});
            }

            const senderImage = image; // Get sender's image

            const participants = [sender, username].sort();  // To ensure consistency in order

            let conversation = recipient.conversations.find(convo =>
                convo.participants.includes(sender) && convo.participants.includes(username)
            );

            if (!conversation) {
                const conversationId = uuidv4();
                conversation = {
                    conversationId,
                    participants,
                    messages: [{
                        sender,
                        senderImage, // Add the sender's image here
                        content: message,
                        timestamp: new Date()
                    }]
                };
                recipient.conversations.push(conversation);
            }

// Add the new message to the conversation
            conversation.messages.push({
                sender,
                senderImage, // Add the sender's image here
                content: message,
                timestamp: new Date()
            });

            recipient.markModified('conversations');
            await recipient.save();

// If the sender is also a user, update their conversations as well
            if (sender !== username) {
                let senderConversation = senderUser.conversations.find(convo =>
                    convo.participants.includes(sender) && convo.participants.includes(username)
                );

                if (!senderConversation) {
                    senderConversation = {
                        conversationId: conversation.conversationId,
                        participants,
                        messages: [{
                            sender,
                            senderImage, // Add the sender's image here
                            content: message,
                            timestamp: new Date()
                        }]
                    };
                    senderUser.conversations.push(senderConversation);
                }

                senderConversation.messages.push({
                    sender,
                    senderImage, // Add the sender's image here
                    content: message,
                    timestamp: new Date()
                });

                senderUser.markModified('conversations');
                await senderUser.save();
            }

            resSend(res, true, "Message sent successfully", {conversationId: conversation.conversationId});
        } catch (error) {
            console.error("Error in createOrUpdateConversation:", error);
            res.status(500).send({error: true, message: "Internal Server Error"});
        }
    },

    getConversations: async (req, res) => {
        try {
            const {username} = req.params;
            const user = await userDb.findOne({username});

            if (!user) {
                return res.status(404).send({error: true, message: "User not found"});
            }

            res.status(200).send({error: false, conversations: user.conversations});
        } catch (error) {
            console.error("Error fetching conversations:", error);
            res.status(500).send({error: true, message: "Internal Server Error"});
        }
    },
    getChat: async (req, res) => {
        try {
            const {conversationId} = req.params;

            // Find the user who has this conversation
            const user = await userDb.findOne({'conversations.conversationId': conversationId});

            if (!user) {
                return res.status(404).send({error: true, message: "Conversation not found"});
            }

            // Find the specific conversation within the user's conversations array
            const conversation = user.conversations.find(conv => conv.conversationId === conversationId);

            if (!conversation) {
                return res.status(404).send({error: true, message: "Conversation not found"});
            }

            res.send({error: false, data: conversation});
        } catch (error) {
            console.error(error);
            res.status(500).send({error: true, message: "Internal Server Error"});
        }
    },
    deleteConversation: async (req, res) => {
        try {
            const {conversationId} = req.params;

            // Find the conversation in one of the user's records
            const users = await userDb.find({'conversations.conversationId': conversationId});

            if (!users) {
                return res.status(404).send({error: true, message: "Conversation not found"});
            }
            await userDb.updateMany(
                {'conversations.conversationId': conversationId},  // Find all users with the conversationId
                {$pull: {conversations: {conversationId}}}  // Remove the conversation
            );

            res.send({error: false, message: "Conversation deleted successfully for both participants"});
        } catch (error) {
            console.error("Error deleting conversation:", error);
            res.status(500).send({error: true, message: "Internal Server Error"});
        }
    },
    addLike: async (req, res) => {
        try {
            const {conversationId, messageId, username} = req.body;

            // Find the user who has this conversation
            const user = await userDb.findOne({'conversations.conversationId': conversationId});

            if (!user) {
                return res.status(404).send({error: true, message: "Conversation not found"});
            }

            // Find the specific conversation within the user's conversations array
            const conversation = user.conversations.find(conv => conv.conversationId === conversationId);

            if (!conversation) {
                return res.status(404).send({error: true, message: "Conversation not found"});
            }

            // Find the specific message within the conversation
            const message = conversation.messages.id(messageId);

            if (!message) {
                return res.status(404).send({error: true, message: "Message not found"});
            }

            // Check if the user has already liked this message
            if (message.likes.includes(username)) {
                return res.status(400).send({error: true, message: "Message already liked by this user"});
            }

            // Add the username to the likes array
            message.likes.push(username);
            await user.save();

            res.send({error: false, message: "Message liked successfully", data: {likes: message.likes}});
        } catch (error) {
            console.error("Error in likeMessage:", error);
            res.status(500).send({error: true, message: "Internal Server Error"});
        }
    }

}