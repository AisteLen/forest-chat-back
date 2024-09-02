const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        default: "https://www.shutterstock.com/image-vector/vector-flat-illustration-grayscale-avatar-600nw-2264922221.jpg"
    },
    conversations: [{
        conversationId: {
            type: String,
            unique: true
        },
        participants: [{type: String, required: true}],
        messages: [{
            sender: {type: String, required: true},
            senderImage: {type: String, required: true},
            content: {type: String, required: true},
            timestamp: {type: Date, required: true, default: Date.now},
            likes: [{type: String}]
        }]
    }]
});

const User = mongoose.model('User', userSchema);
module.exports = User;
