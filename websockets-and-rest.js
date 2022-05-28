/*

Module: WebSocket
Author: Ashok Khanna
Last Update: 09-04-2022
License: MIT

Based on Bergi's Solution on Stack Overflow:
https://stackoverflow.com/questions/60512129/websocket-waiting-for-server-response-with-a-queue

How to use:

1. Import the module and create a socket instance:

```
import WebSocket from './Components/Websocket'

export const ws = new WebSocket("wss://www.url.com/socket-point");
```

2. Then simply use it in your functions as following (first import below
is to import the `ws' instance created above into the module where you are
using the socket:

```
import {ws} from './index'

...

function login() {
  ...
  ws.sendRequest(someMessageInJSONFormat,
      (value) => {
      ...<insert code to handle response here>>
      )}
}
```

Usually I like to create some sort of JSON object as in the above,
but if you read the below code then you can see there is a `sendMessage'
variant that can handle plain strings

 */

export default class WebSocket {

    constructor(url) {

        // Here we create an empty array [] which we will add to later
        // Note that we can use {} also, which is for empty objects
        // (arrays are objects)
        this.waitingResponse = [];

        // Here we create an empty array [] that represents the queue of
        // messages that didn't send because the socket was closed and
        // are queued up to be sent during the onopen handler (which iterates
        // through this array)
        this.messageQueue = [];

        this.url = url;

        // We separate out the socket initialisation into its own function
        // as we will also call it during a reconnect attempt
        this.createSocket();

    }


    // The reconnection logic is that whenever a message fails to send, the
    // message is added to messageQueue and a reconnection attempt is made.
    // So, when a connection is lost, it is reconnected to after a certain
    // time, but rather only when the user initiates an action that must
    // message (i.e.) interact with the WebSocket
    createSocket() {
        this.socket = new WebSocket(this.url);

        // Iterate through the queue of messages that haven't been sent
        // If this queue is empty then no messages are sent

        // All messages in the message queue arise from a previous
        // sendPayload event, thus are parsed in the correct JSON form
        // and have an associated request object in waitingResponse
        this.socket.onopen = () => {
            this.messageQueue.forEach(item => this.socket.send(item))
            this.messageQueue = [];
        }

        this.socket.onclose = () => console.log("ws closed");

        this.socket.onmessage = e => { this.processMessage(e); }
    }

    // Creates a new socket and adds any unsent
    // messages onto the message queue
    recreateSocket(message) {
        console.log("Reconnection Attempted");
        this.messageQueue.push(message);
        this.createSocket();
    }

    // Closes a socket, which can take a bit
    // of time (few seconds) since a roundtrip to
    // the server is done
    closeSocket(){
        this.socket.close();
        console.log("Socket closed manually.")
    }

    // Exposes a function for users to start a new
    // socket - there is no way to 'reconnect' to
    // a socket, a new websocket needs to be created
    openSocket(){
        this.createSocket();
        console.log("Socket opened manually.")
    }

    async sendPayload(details) {
        // Create a request where request = { sent: + new Date()} and this.waiting... = request
        // this means both request and waitingResponse[details.requestid] point to the same thing
        // so that changing request.test will also result in waitingResponse[details.requestid].test
        // having the same value

        // Note that details.requestid here is an index = the timestamp. Later when we process
        // messages received, we will check the timestamp of the requestid of the message received
        // against this waitingResponse array and resolve the request if a match is found

        let requestid = +new Date();
        const request = this.waitingResponse[requestid] = { sent: requestid };

        // Here we combine the request (which at this point is just { sent: ...} with the
        // actual data to be sent to form the final message to send
        const message = { ...request, ...details }

        // If Socket open then send the details (message) in String Format
        try {
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(message));
            } else {
                // Otherwise we try to recreate the socket and send the message
                // after recreating the socket
                this.recreateSocket(JSON.stringify(message));
            }

            // Here we create a new promise function
            // We set the resolve property of request [which is also referenced
            // by waitingResponse[details.requestid] to the Promise's resolve function

            // Thus we can resolve the promise from processMessage (refer below)

            // We reject after 5 seconds of not receiving the associated message
            // with the same requestid
            const result = await new Promise(function(resolve, reject) {
                // This will automatically run, allowing us to access
                // the resolve function from outside this function
                request.resolve = resolve;

                console.log(request);
                // This will take 5 seconds to run, which becomes the lifecycle
                // of this Promise function - the resolve function must be
                // called before this point
                setTimeout(() => {
                    reject('Timeout'); // or resolve({action: "to"}), or whatever
                }, 5000);
            });

            console.info("Time took", (+new Date() - request.sent) / 1000);

            // function returns result
            return result; // or {...request, ...result} if you care
        }

            // code to run regardless of whether try worked or error thrown
        finally {
            console.log("Exit code ran successfully")

            delete this.waitingResponse[requestid];
        }
    }


    // Message Receiver, we attach this to the onmessage handler
    // Expects message to be in JSON format, otherwise throws
    // an error and simply logs the message to console

    // The message must also have a requestid property (we
    // use lowercase "i" here because Common Lisp's JZON library
    // lowercases property names in JSON messages

    // Test if the requestid passed in has an entry in the waitingResponse
    // queue (data.requestid is the array index and the sendPayload function
    // sets a value in this array for various id indexes to { sent: .. }
    // This index also has a reference to the resolve function for the
    // associated promise for that request id

    // If that is true ('truthy' via if (request)), then resolve the
    // associated promise via request.resolve(data), where data is
    // the value resolved by the promise

    // Otherwise pass a variety of console warnings / logs - the message
    // will not be handled and disappear from the future (i.e. every
    // message needs a requestid set in waitingResponse to be caught

    // We could probably add in a router for server initiated messages
    // to be handled (under the second warning below)
    async processMessage(msg) {

        try {
            let data = JSON.parse(msg.data);

            if (data.hasOwnProperty("requestid")) {
                const request = this.waitingResponse[data.requestid]
                if (request)
                    request.resolve(data)
                else
                    console.warn("Got data but found no associated request, already timed out?", data)
            } else {
                // Add handlers here for messages without request ID
                console.warn("Got data without request id", data);
            }
        } catch {
            console.log(msg.data);
        }

    }

    // Main entry point for calling functions with a simple
    // callback to action to perform on the received data
    // Exists here to reduce boilerplate for the calling function
    async sendRequest(details, resolution, rejection = (error) => {console.log(error)}) {
        this.sendPayload(details).then(
            function(value) {
                resolution(value);
            },
            function(error) {
                rejection(error);
            })
    }

    // Second entry point for one direction messages
    // i.e. not expecting any responses. This bypasses
    // the request-response promise functions above

    // Attempts to JSON.stringify the object first,
    // and just sends the object if cannot be made
    // into a JSON string

    sendMessage(details) {
        // Example of an Immediately-Invoked Function Expression
        const message = (() => {
            try {
                return JSON.stringify(details)
            }
            catch (e) {
                return details
            }
        })()

        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(message);
        } else {
            // Otherwise we try to recreate the socket and send the message
            // after recreating the socket
            this.recreateSocket(message);
        }
    }


}
