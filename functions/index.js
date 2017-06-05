const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

/** @namespace event.params.chatId */
/** @namespace object.creatorId */
/** @namespace object.otherId */
exports.createChat = functions.database.ref("userChats/{userId}/{chatId}")
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
            .then(() => {
                return admin.database().ref(`userChats/${otherId}/${chatId}`).set(chatObject);
            })
            .then(() => {
                return admin.database().ref(`userChats/${creatorId}/${chatId}`).set(chatObject);
            })
            .then(() => {
                const chatMembers = {};
                chatMembers[creatorId] = true;
                chatMembers[otherId] = true;
                return admin.database().ref(`chats/${chatId}/chatMembers`).set(chatMembers);
            });
    });

exports.createMessage = functions.database.ref("userMessages/{uid}/{chatId}/{messageId}")
    .onWrite(event => {
        if (!event.data.exists()) {
            return Promise.resolve(() => null);
        }

        const chatId = event.params.chatId;
        const messageId = event.params.messageId;
        const object = event.data.val();
        const chatObject = {};
        return admin.database().ref(`chats/${chatId}/${messageId}`).set(object)
            .then(() => {
                return admin.database().ref("userChats").child(event.params.uid).child(chatId)
                    .once("value", snapshot => {
                        chatObject.creatorId = snapshot.child("creatorId").val();
                        chatObject.otherId = snapshot.child("otherId").val();
                        chatObject[chatObject.creatorId] = snapshot.child(chatObject.creatorId).val();
                        chatObject[chatObject.otherId] = snapshot.child(chatObject.otherId).val();
                    });
            })
            .then(() => {
                const userIdOfNotification = chatObject.otherId === event.params.uid ? chatObject.creatorId : chatObject.otherId;
                return admin.database().ref("userTokens").child(userIdOfNotification).once("value");
            })
            .then(snapshot => {
                const tokens = [];
                snapshot.forEach(childSnapshot => {
                    tokens.push(childSnapshot.key);
                });

                if (tokens.length > 0) {
                    const userIdOfNotification = chatObject.otherId === event.params.uid ?
                        chatObject.creatorId : chatObject.otherId;

                    const dataObject = {
                        text: chatObject[userIdOfNotification].name + ": " + object.text
                    };

                    return admin.messaging().sendToDevice(tokens, {data: dataObject});
                }
            })
            .then(response => {
                console.log("Response: ", response);
            });
    });