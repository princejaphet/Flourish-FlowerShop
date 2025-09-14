import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MailOpen, 
  Inbox, 
  Send, 
  MoreHorizontal, 
  Bell, 
  BellOff, 
  Trash2, 
  X, 
  Search, 
  Smile, 
  Paperclip, 
  MessageCircle, 
  Clock,
  Users,
  Filter,
  Archive,
  Star,
  StarOff,
  Check, // NEW: Icon for delivered
  CheckCheck, // NEW: Icon for seen
  MessageSquare,
  Calendar,
  Zap,
  TrendingUp,
  Eye,
  Reply,
  Loader2 // For upload indicator
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  getDocs,
  where,
  writeBatch
} from 'firebase/firestore';

// Enhanced Stats Card Component
const StatsCard = ({ title, value, icon, trend = null, color = "red" }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <TrendingUp size={10} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  </div>
);

export default function MessagePage() {
  const [chatThreads, setChatThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const messagesEndRef = useRef(null);

  // --- START: New State for Image Handling ---
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  // --- END: New State for Image Handling ---

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const appId = 'flourish-flowers-app';
    const chatsRef = collection(db, `artifacts/${appId}/public/data/chats`);
    const q = query(chatsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const threads = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          userName: data.userName || data.senderName || data.customerName || data.name || 'Unknown User',
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen || null,
          isSeenByUser: data.isSeenByUser,
          lastMessageSenderId: data.lastMessageSenderId || null,
        };
      });
      setChatThreads(threads);
      setLoadingThreads(false);
    }, (error) => console.error("Error fetching chat threads: ", error));

    return () => unsubscribe();
  }, []);

  const handleThreadSelect = async (thread) => {
    setSelectedThread(thread);
    const appId = 'flourish-flowers-app';
    const threadRef = doc(db, `artifacts/${appId}/public/data/chats`, thread.id);
    
    // Mark the entire thread as read by the admin
    if (!thread.isRead) {
      await setDoc(threadRef, { isRead: true }, { merge: true });
    }
    
    const messagesRef = collection(db, `artifacts/${appId}/public/data/chats/${thread.id}/messages`);
    const q = query(messagesRef, where("senderId", "==", thread.id), where("isSeen", "==", false));

    try {
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach(document => {
        batch.update(document.ref, { isSeen: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking user messages as seen:", error);
    }
  };

  useEffect(() => {
    if (selectedThread) {
      setLoadingMessages(true);
      const appId = 'flourish-flowers-app';
      const messagesRef = collection(db, `artifacts/${appId}/public/data/chats/${selectedThread.id}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedMessages = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(fetchedMessages);
        setLoadingMessages(false);
      });
      
      return () => unsubscribe();
    }
  }, [selectedThread]);

  // --- START: New Cloudinary Upload Function ---
  const uploadImageToCloudinary = async (file) => {
    const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/djhtu0rzz/image/upload';
    const UPLOAD_PRESET = 'my_app_preset';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.secure_url) return data.secure_url;
        console.error('Cloudinary upload failed:', data);
        return null;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        return null;
    }
  };
  // --- END: New Cloudinary Upload Function ---

  // --- START: Updated handleSendReply Function ---
  const handleSendReply = async () => {
    if ((replyContent.trim() === '' && !imageFile) || !selectedThread) return;

    setIsUploading(true);
    let imageUrl = null;

    if (imageFile) {
        imageUrl = await uploadImageToCloudinary(imageFile);
        if (!imageUrl) {
            alert("Image upload failed. Please try again.");
            setIsUploading(false);
            return;
        }
    }

    const appId = 'flourish-flowers-app';
    const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${selectedThread.id}`);
    const messagesRef = collection(chatThreadRef, 'messages');
    
    const messageData = {
      timestamp: serverTimestamp(),
      senderId: 'flourish-admin',
      senderName: 'Flourish',
      isSeen: false,
    };

    if (replyContent.trim()) messageData.text = replyContent.trim();
    if (imageUrl) messageData.imageUrl = imageUrl;
    
    await addDoc(messagesRef, messageData);
    
    let lastMessage = replyContent.trim();
    if (imageUrl && !lastMessage) lastMessage = '📷 Photo';
    if (imageUrl && lastMessage) lastMessage = `📷 ${lastMessage}`;

    await setDoc(chatThreadRef, {
      lastMessage: lastMessage,
      timestamp: serverTimestamp(),
      isRead: true, 
      isSeenByUser: false,
      lastMessageSenderId: 'flourish-admin',
    }, { merge: true });

    setReplyContent('');
    setImageFile(null);
    setIsUploading(false);
  };
  // --- END: Updated handleSendReply Function ---
  
  // --- START: New File Select Handler ---
  const handleFileSelect = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if(file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("File is too large. Please select an image under 5MB.");
        return;
      }
      setImageFile(file);
    }
  };
  // --- END: New File Select Handler ---

  const handleDeleteConversation = async () => {
    if (!selectedThread) return;
    const appId = 'flourish-flowers-app';
    const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${selectedThread.id}`);
    const messagesRef = collection(chatThreadRef, 'messages');

    try {
        const messagesSnapshot = await getDocs(messagesRef);
        const deletePromises = messagesSnapshot.docs.map((messageDoc) => deleteDoc(messageDoc.ref));
        await Promise.all(deletePromises);
        await deleteDoc(chatThreadRef);

        setSelectedThread(null);
        setDeleteModalVisible(false);
        setMenuOpen(false);
    } catch (error) {
        console.error("Error permanently deleting conversation: ", error);
        alert("Could not delete conversation. Check console for errors.");
    }
  };

  const handleMuteToggle = async () => {
    if (!selectedThread) return;
    const appId = 'flourish-flowers-app';
    const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${selectedThread.id}`);
    await updateDoc(chatThreadRef, { isMuted: !selectedThread.isMuted });
    setMenuOpen(false);
  };

  const filteredThreads = useMemo(() => {
    return chatThreads
      .filter(thread => filter === 'unread' ? !thread.isRead : true)
      .filter(thread => thread.userName?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [chatThreads, filter, searchQuery]);

  const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };
  
  const stats = useMemo(() => {
    const totalThreads = chatThreads.length;
    const unreadThreads = chatThreads.filter(thread => !thread.isRead).length;
    const mutedThreads = chatThreads.filter(thread => thread.isMuted).length;
    const activeThreads = chatThreads.filter(thread => {
      if (thread.isOnline) return true;
      if (!thread.lastSeen) return false;
      const date = thread.lastSeen.toDate ? thread.lastSeen.toDate() : new Date(thread.lastSeen);
      const now = new Date();
      const diff = now - date;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return hours < 24;
    }).length;

    return { totalThreads, unreadThreads, mutedThreads, activeThreads };
  }, [chatThreads]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Customer Messages</h1>
            <p className="text-slate-500 mt-1">Manage and respond to customer inquiries in real-time.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard title="Total Conversations" value={stats.totalThreads} icon={<MessageCircle size={20} />} color="blue"/>
          <StatsCard title="Unread Messages" value={stats.unreadThreads} icon={<Bell size={20} />} color="red"/>
          <StatsCard title="Active Today" value={stats.activeThreads} icon={<Zap size={20} />} color="green"/>
          <StatsCard title="Muted Chats" value={stats.mutedThreads} icon={<BellOff size={20} />} color="gray"/>
        </div>
      </div>

      {isDeleteModalVisible && (
        <div className="fixed inset-0 bg-black/20 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 border border-slate-200">
            <h2 className="text-lg font-semibold text-gray-900">Delete Conversation</h2>
            <p className="text-gray-600 my-4">Are you sure? This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteModalVisible(false)} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
              <button onClick={handleDeleteConversation} className="px-4 py-2 bg-red-500 text-white rounded">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-200px)] bg-white mx-6 mt-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="w-80 bg-[#FDFBF7] border-r border-gray-200/80 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search name" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-50 border-0 rounded-lg pl-10 pr-4 py-2.5 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingThreads ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-red-500 mx-auto" /></div> : 
            filteredThreads.map(thread => (
              <button key={thread.id} onClick={() => handleThreadSelect(thread)} className={`flex items-center gap-4 p-4 hover:bg-red-50/70 text-left w-full ${ selectedThread?.id === thread.id ? 'bg-red-50' : '' }`}>
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><span className="text-red-600 text-sm font-semibold">{getInitials(thread.userName)}</span></div>
                  {!thread.isRead && (<div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1"><span className={`text-sm truncate ${!thread.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{thread.userName}</span><span className="text-xs text-slate-500">{formatTime(thread.timestamp)}</span></div>
                  <p className={`text-xs truncate ${!thread.isRead ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>{thread.lastMessage}</p>
                </div>
              </button>
            ))
          }
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedThread ? (
          <>
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="relative"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><span className="text-red-600 text-sm font-semibold">{getInitials(selectedThread.userName)}</span></div><div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${selectedThread.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></div></div>
                  <div><h3 className="font-semibold text-slate-900 text-lg">{selectedThread.userName}</h3><div className="text-sm text-slate-500">{selectedThread.isOnline ? 'Active now' : 'Offline'}</div></div>
                </div>
                <div className="relative">
                  <button onClick={() => setMenuOpen(!isMenuOpen)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><MoreHorizontal className="w-5 h-5" /></button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border z-10">
                      <button onClick={handleMuteToggle} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50">{selectedThread.isMuted ? <Bell size={14}/> : <BellOff size={14}/>}{selectedThread.isMuted ? 'Unmute' : 'Mute'}</button>
                      <button onClick={() => setDeleteModalVisible(true)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14}/>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {loadingMessages ? <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-red-500"/></div> : 
                messages.map((msg) => {
                  const isAdminMessage = msg.senderId === 'flourish-admin';
                  return (
                    <div key={msg.id} className={`flex mb-4 group ${isAdminMessage ? 'justify-end' : 'justify-start'}`}>
                      {!isAdminMessage && <div className="w-8 h-8 mr-3 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><span className="text-red-600 text-xs font-medium">{getInitials(msg.senderName)}</span></div>}
                      <div className="max-w-md">
                        <div className={`px-4 py-3 rounded-2xl text-sm ${isAdminMessage ? 'bg-red-500 text-white' : 'bg-white'}`}>
                          {msg.imageUrl && <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer"><img src={msg.imageUrl} alt="Attachment" className="rounded-lg mb-2 max-w-xs h-auto" /></a>}
                          {msg.text && <p>{msg.text}</p>}
                        </div>
                        {msg.timestamp && <p className={`text-xs text-slate-400 mt-1 ${isAdminMessage ? 'text-right' : 'text-left'}`}>{new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                      </div>
                      {isAdminMessage && <div className="w-8 h-8 ml-3 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-semibold">F</span></div>}
                    </div>
                  )
                })
              }
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-white border-t border-slate-200">
              {imageFile && (
                <div className="relative inline-block mb-2 p-2 bg-slate-100 rounded-lg">
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" className="h-20 w-20 object-cover rounded" />
                  <button onClick={() => setImageFile(null)} className="absolute -top-2 -right-2 bg-slate-600 text-white rounded-full p-0.5"><X size={14} /></button>
                </div>
              )}
              <div className="flex items-center gap-3 bg-slate-100 rounded-2xl px-4 py-3">
                <button className="text-slate-500 hover:text-slate-700"><Smile size={20}/></button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                <button onClick={() => fileInputRef.current.click()} disabled={isUploading} className="text-slate-500 hover:text-slate-700"><Paperclip size={20}/></button>
                <input type="text" value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Type your message..." className="flex-1 bg-transparent border-none focus:outline-none text-sm" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }} />
                <button onClick={handleSendReply} disabled={(!replyContent.trim() && !imageFile) || isUploading} className="p-2 rounded-lg bg-red-500 text-white disabled:bg-red-300">
                  {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MailOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500 text-sm">Choose a conversation from the list to view messages.</p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

