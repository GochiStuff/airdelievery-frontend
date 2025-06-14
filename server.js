import express from "express";
import http from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

function generateCode(){
    return nanoid(6).toUpperCase();
}

const app = express();
const server = http.createServer(app);
const io = new Server(server , {cors : {origin : "*"}});

// { ownerId: socketId, members: [socketId] }
const flights = new Map();

function broadcastUsers(flightCode) {
    const flight = flights.get(flightCode);
    if (!flight) return;

    io.to(flightCode).emit("flightUsers", { 
        ownerId: flight.ownerId, 
        members: flight.members,
        ownerConnected: flight.ownerConnected
    });
}

io.on("connection", (socket) => {

    socket.on("createFlight", (callback) => {
        let code;
        do {
            code = generateCode();
        } while (flights.has(code));

        flights.set(code, { 
            ownerId: socket.id, 
            members: [socket.id],
            ownerConnected: true,
            disconnectTimeout: null,
        });

        socket.join(code);
        callback({code});

        broadcastUsers(code);
    });

    socket.on("joinFlight", (code , callback) => {
        if (flights.has(code)) {
            const flight = flights.get(code);
            socket.join(code);
            if(flight.ownerId !== socket.id){
                flight.members.push(socket.id);
                socket.emit("offer" , {sdp: flight.sdp});
            }
            
            callback({success: true});  
            broadcastUsers(code);
        } else {
            callback({success: false , message: "flight not found"});
        }
    });
    socket.on("offer", (code, sdp) => {
        const flight = flights.get(code);
        if (!flight) {
            console.error(`No flight found for code: ${code}`);
            return;
        }
        console.log(sdp);
        flight.sdp = sdp; 
        console.log(`SDP updated for flight ${code}:`, flights.get(code));

    });
    socket.on("answer", (code, { sdp }) => {
        const flight = flights.get(code);
        if (flight && io.sockets.sockets.get(flight.ownerId)) {
            io.to(flight.ownerId).emit("answer", { from: socket.id, sdp });
        }
    });

    socket.on("ice-candidate", ({ code, candidate }) => {
        if (typeof code !== "string" ||
            !/^[A-Z0-9]+$/.test(code) ||
            !candidate) {
            console.warn("Invalid ICE candidate.");
            return;
        }
        const flight = flights.get(code);
        if (!flight) {
            console.warn("Flight not found.");
            return;
        }
        if (socket.id === flight.ownerId) {
            // Send candidate to all members
            for (const memberId of flight.members) {
                if (memberId !== socket.id && io.sockets.sockets.get(memberId)) {
                    io.to(memberId).emit("ice-candidate", { from: socket.id, candidate });
                }
            }
        } else {
            // Send candidate back to owner
            if (io.sockets.sockets.get(flight.ownerId)) {
                io.to(flight.ownerId).emit("ice-candidate", { from: socket.id, candidate });
            }
        }
    });


    socket.on("disconnect", () => {
        for (const [code, flight] of flights.entries()) {

            if (flight.ownerId === socket.id) {
                
                flight.ownerConnected = false;
                broadcastUsers(code);
                flights.delete(code);
            } else {
                
                flight.members = flight.members.filter(id => id !== socket.id);
                broadcastUsers(code);
            }
        }
    });

});



server.listen(4000 , () => console.log("Websocket is up on port 4000"));
