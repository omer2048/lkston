"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase bağlantısını başlatıyoruz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Message {
  id: string;
  sender: string;
  text: string;
  created_at: string;
}

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [roomId, setRoomId] = useState<string>("");

  useEffect(() => {
    async function initChat() {
      const { data: rooms } = await supabase.from("rooms").select("*").limit(1);
      if (rooms && rooms.length > 0) {
        const currentRoomId = rooms[0].id;
        setRoomId(currentRoomId);

        const { data: oldMessages } = await supabase
          .from("messages")
          .select("*")
          .eq("room_id", currentRoomId)
          .order("created_at", { ascending: true });

        if (oldMessages) setMessages(oldMessages);

        const channel = supabase
          .channel(`room-${currentRoomId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `room_id=eq.${currentRoomId}`,
            },
            (payload) => {
              setMessages((prev) => [...prev, payload.new as Message]);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId) return;

    await supabase.from("messages").insert([
      {
        room_id: roomId,
        sender: username || "Anonim",
        text: inputText,
      },
    ]);

    setInputText("");
  };

  if (!isJoined) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="w-full max-w-sm p-6 bg-gray-800 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-bold mb-4">Sohbete Katıl</h2>
          <input
            type="text"
            placeholder="Kullanıcı adınız..."
            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none mb-4"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            onClick={() => username.trim() && setIsJoined(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="w-64 bg-gray-950 p-4 hidden md:block">
        <h1 className="font-bold text-xl mb-4 border-b border-gray-800 pb-2">💬 Lkston</h1>
        <div className="bg-gray-800 p-2 rounded text-sm font-semibold cursor-pointer">
          # genel-sohbet
        </div>
      </div>

      <div className="flex flex-col flex-1 h-full">
        <div className="h-14 border-b border-gray-800 flex items-center px-6 bg-gray-950">
          <span className="font-bold text-gray-300"># genel-sohbet</span>
          <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-400 inline-block"></span> 200 Kişi Kapasiteli
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="hover:bg-gray-800/40 p-2 rounded transition">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-indigo-400">{msg.sender}</span>
                <span className="text-[10px] text-gray-500">
                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <p className="text-gray-300 mt-1 break-words">{msg.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 bg-gray-900 border-t border-gray-800">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="#genel-sohbet kanalına mesaj gönder"
            className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </form>
      </div>
    </div>
  );
}
