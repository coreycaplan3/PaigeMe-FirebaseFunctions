const functions = require('firebase-functions');
const admin = require('firebase-admin');
const console = require('debug');

admin.initializeApp(functions.config().firebase);

/** @namespace event.params.chatId */
/** @namespace object.creatorId */
/** @namespace object.otherId */
exports.createChat = functions.database.ref("userChats/{chatId}")
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
                return chatObject;
            })
            .then((chatObject) => {
                admin.database().ref(`userChats/${otherId}/${chatId}`).set(chatObject);
                return Promise.resolve(chatObject);
            })
            .then((chatObject) => {
                return admin.database().ref(`userChats/${creatorId}/${chatId}`).set(chatObject);
            })
    });

exports.createMessage = functions.database.ref("userMessages/{uid}/{chatId}/{messageId}")
    .onWrite(event => {
        if(!event.data.exists()) {
            return Promise.resolve(() => null);
        }

        const chatId = event.params.chatId;
        const messageId = event.params.messageId;
        const object = event.data.val();
        return admin.database().ref(`chats/${chatId}/${messageId}`).set(object);
    });