const express = require('express');
const Router = express.Router();

const {
    registerUser,
    loginUser,
    updateImage,
    updateUsername,
    updatePass,
    getUsers,
    getSingleUser,
    createOrUpdateConversation,
    getConversations,
    getChat,
    deleteConversation,
    addLike
} = require("../controllers/mainController.js")

const {
    loginValidate,
    registerValidate,
    validateImageUpdate,
    validateUsernameUpdate,
    validatePassword,
    validatePasswordUpdate,
} = require("../middleware/validators");

Router.post("/register", registerValidate, registerUser)
Router.post("/login", loginValidate, loginUser)
Router.post("/updateImage", validateImageUpdate, updateImage);
Router.post("/updateUsername", validateUsernameUpdate, updateUsername);
Router.post("/validatePassword", validatePassword);
Router.post("/updatePass", validatePasswordUpdate, updatePass);
Router.get("/allUsers", getUsers)
Router.get("/user/:username", getSingleUser)
Router.post("/createOrUpdate/:username", createOrUpdateConversation);
Router.get("/conversations/:username", getConversations);
Router.get('/chat/:conversationId', getChat);
Router.post('/deleteConversation/:conversationId', deleteConversation);
Router.post('/addLike', addLike);

module.exports = Router