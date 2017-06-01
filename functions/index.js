const functions = require('firebase-functions');
const admin = require('firebase-admin');
const console = require('debug');

admin.initializeApp(functions.config().firebase);

/** @namespace event.params.chatId */
/** @namespace object.creatorId */
/** @namespace object.otherId */
exports.createChat = functions.database.ref("chats/{chatId}")
    .onWrite(event => {
        if (!event.data.exists()) {
            return Promise.resolve(() => null);
        }

        const chatId = event.params.chatId;
        const chatObject = event.data.val();
        const creatorId = chatObject.creatorId;
        const otherId = chatObject.otherId;

        return admin.database().ref(`users/${otherId}`)
            .once("value", snapshot => {
                const otherUser = {};
                otherUser.name = snapshot.child("name").val();
                otherUser.profilePicture = snapshot.child("profilePicture").val();
                chatObject[otherId] = otherUser;
            })
            .then(() => {
                return admin.database().ref(`userChats/${otherId}/${chatId}`).set(chatObject);
            })
            .then(() => {
                return admin.database().ref(`userChats/${creatorId}/${chatId}`).set(chatObject);
            })
            .then(() => {
                return admin.database().ref(`chats/${chatId}`).set(chatObject);
            });
    });