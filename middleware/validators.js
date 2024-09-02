const resSend = require("../plugins/sendRes")
const userDb = require("../schemas/registerSchema");
const bcrypt = require("bcrypt");

module.exports = {
    loginValidate: async (req, res, next) => {
        const {username, password} = req.body;

        if (!username) return resSend(res, false, "Username is required", null);
        if (!password) return resSend(res, false, "Password is required", null);

        if (username.length < 4 || username.length > 20) return resSend(res, false, "Username must be between 3 and 20 characters", null);
        if (password.length < 4 || password.length > 20) return resSend(res, false, "Password must be between 3 and 20 characters", null);

        next();
    }
    ,
    registerValidate: async (req, res, next) => {
        const {username, pass1, pass2} = req.body;

        if (!username) return resSend(res, false, "Username is required", null);
        if (!pass1 || !pass2) return resSend(res, false, "Both password fields are required", null);

        const userExists = await userDb.findOne({username});
        if (userExists) return resSend(res, false, "Username already registered", null);

        if (username.length < 4 || username.length > 20) return resSend(res, false, "Username must be between 3 and 20 characters", null);
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*_+])[A-Za-z\d!@#$%^&*_+]{4,20}$/;
        if (!passwordRegex.test(pass1)) {
            return resSend(res, false, "Password must be between 4 and 20 characters, include at least one uppercase letter, and one special symbol (!@#$%^&*_+)", null);
        }
        if (pass1 !== pass2) return resSend(res, false, "Passwords do not match", null);

        next();
    },
    validateImageUpdate: (req, res, next) => {
        const {newImage} = req.body;

        if (!newImage || !(newImage.startsWith('http://') || newImage.startsWith('https://'))) {
            return resSend(res, false, "Invalid image URL", null);
        }

        next();
    },

    validateUsernameUpdate: async (req, res, next) => {
        const {username} = req.body;

        if (!username) return resSend(res, false, "Username is required", null);

        if (username.length < 4 || username.length > 20) {
            return resSend(res, false, "Username must be between 4 and 20 characters", null);
        }

        const userExists = await userDb.findOne({username});
        if (userExists) return resSend(res, false, "Username already registered", null);

        next();
    },

    validatePassword: async (req, res) => {
        const {userId, currentPass} = req.body;

        try {
            const user = await userDb.findById(userId);

            if (!user) {
                return resSend(res, false, "User not found", null);
            }

            const isMatch = await bcrypt.compare(currentPass, user.password);

            if (!isMatch) {
                return resSend(res, false, "Current password is incorrect", null);
            }

            resSend(res, true, "Password validated", null);
        } catch (error) {
            console.error(error);
            resSend(res, false, "An error occurred during validation", null);
        }
    },
    validatePasswordUpdate: (req, res, next) => {
        const { newPass } = req.body;

        if (!newPass) return resSend(res, false, "New password is required", null);

        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*_+])[A-Za-z\d!@#$%^&*_+]{4,20}$/;
        if (!passwordRegex.test(newPass)) {
            return resSend(res, false, "Password must be between 4 and 20 characters, include at least one uppercase letter, and one special symbol (!@#$%^&*_+)", null);
        }

        next();
    }
}
