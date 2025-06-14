"use client"
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type SocketContextType = {
    socket: Socket | null;
    reconnect: () => void;
};


const SocketContext = createContext<SocketContextType>({
    socket:null,
    reconnect: () => {}
});

type SocketProviderProps = {
    children: ReactNode;
};

export const SocketProvider = ({ children }: SocketProviderProps) => {
   const [socket, setSocket] = useState<Socket | null>(null);
   
    useEffect(() => {
        const newSocket = io("http://localhost:4000");
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const reconnect = () => {
        socket?.disconnect();
        const newSocket = io("http://localhost:4000");
        setSocket(newSocket);
    }

    return (
        <SocketContext.Provider value={  {socket  , reconnect}} >
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
