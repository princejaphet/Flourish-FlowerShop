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
  Reply
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

// Enhanced Message Bubble Component
const MessageBubble = ({ message, isAdmin, senderName, timestamp }) => (
  <div className={`flex mb-4 group ${isAdmin ? 'justify-end' : 'justify-start'}`}>
    {!isAdmin && (
      <div className="w-8 h-8 mr-3 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center flex-shrink-0">
        <span className="text-red-600 text-xs font-medium">
          {senderName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
        </span>
      </div>
    )}
    <div className="max-w-xs lg:max-w-md">
      <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm transition-all duration-300 group-hover:shadow-md ${
        isAdmin 
          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
          : 'bg-white text-slate-800 border border-slate-200'
      }`}>
        <p className="leading-relaxed">{message}</p>
      </div>
      {timestamp && (
        <p className={`text-xs text-slate-400 mt-1 ${isAdmin ? 'text-right' : 'text-left'}`}>
          {new Date(timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
    {isAdmin && (
      <div className="w-8 h-8 ml-3 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-medium">F</span>
      </div>
    )}
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
    
    // --- NEW: Mark all received user messages as seen ---
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
        const fetchedMessages = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            senderName: data.senderName || data.userName || data.customerName || data.name || 
                       (data.senderId === 'flourish-admin' ? 'Flourish' : 'Customer')
          };
        });
        setMessages(fetchedMessages);
        setLoadingMessages(false);
        
        if (fetchedMessages.length > 0 && (!selectedThread.userName || selectedThread.userName === 'Unknown User')) {
          const customerMessage = fetchedMessages.find(msg => 
            msg.senderId !== 'flourish-admin' && msg.isUser !== false
          );
          if (customerMessage && customerMessage.senderName && customerMessage.senderName !== 'Customer') {
            const threadRef = doc(db, `artifacts/${appId}/public/data/chats`, selectedThread.id);
            setDoc(threadRef, { 
              userName: customerMessage.senderName,
              customerName: customerMessage.senderName 
            }, { merge: true });
            
            setSelectedThread(prev => ({
              ...prev,
              userName: customerMessage.senderName
            }));
          }
        }
      });
      
      return () => unsubscribe();
    }
  }, [selectedThread]);

  const handleSendReply = async () => {
    if (replyContent.trim() === '' || !selectedThread) return;
    const appId = 'flourish-flowers-app';
    const chatThreadRef = doc(db, `artifacts/${appId}/public/data/chats/${selectedThread.id}`);
    const messagesRef = collection(chatThreadRef, 'messages');
    
    await addDoc(messagesRef, {
      text: replyContent.trim(),
      timestamp: serverTimestamp(),
      senderId: 'flourish-admin',
      senderName: 'Flourish',
      isSeen: false, // Admin message starts as delivered, not seen
    });
    
    await setDoc(chatThreadRef, {
      lastMessage: replyContent.trim(),
      timestamp: serverTimestamp(),
      isRead: true, 
      isSeenByUser: false, // Mark as not seen by user yet
      lastMessageSenderId: 'flourish-admin', // Identify admin as sender
    }, { merge: true });

    setReplyContent('');
  };

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
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live updates</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard 
            title="Total Conversations" 
            value={stats.totalThreads} 
            icon={<MessageCircle size={20} />} 
            color="blue"
          />
          <StatsCard 
            title="Unread Messages" 
            value={stats.unreadThreads} 
            icon={<Bell size={20} />} 
            color="red"
          />
          <StatsCard 
            title="Active Today" 
            value={stats.activeThreads} 
            icon={<Zap size={20} />} 
            color="green"
          />
          <StatsCard 
            title="Muted Chats" 
            value={stats.mutedThreads} 
            icon={<BellOff size={20} />} 
            color="gray"
          />
        </div>
      </div>

      {/* Delete Modal */}
      {isDeleteModalVisible && (
        <div className="fixed inset-0 bg-black/20 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Delete Conversation</h2>
              <button 
                onClick={() => setDeleteModalVisible(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 mb-6 text-sm">
              Are you sure you want to permanently delete this conversation? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setDeleteModalVisible(false)} 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm transition-colors duration-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConversation} 
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="flex h-[calc(100vh-200px)] bg-white mx-6 mt-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">

      {/* Sidebar */}
      <div className="w-80 bg-[#FDFBF7] border-r border-gray-200/80 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search name" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border-0 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white" 
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex gap-6">
            <button 
              onClick={() => setFilter('all')}
              className={`pb-2 text-sm font-medium transition-colors duration-300 ${
                filter === 'all' 
                  ? 'text-red-600 border-b-2 border-red-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Message
            </button>
            <button 
              onClick={() => setFilter('unread')}
              className={`pb-2 text-sm font-medium transition-colors duration-300 ${
                filter === 'unread' 
                  ? 'text-red-600 border-b-2 border-red-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Unread
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingThreads ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-slate-500 text-sm">Loading conversations...</p>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {searchQuery ? 'No conversations found matching your search.' : 'No conversations yet.'}
              </p>
            </div>
          ) : (
            filteredThreads.map(thread => (
              <button
                key={thread.id}
                onClick={() => handleThreadSelect(thread)}
                className={`flex items-center gap-4 p-4 hover:bg-red-50/70 text-left w-full transition-all duration-300 group border-b border-slate-100 last:border-b-0 ${
                  selectedThread?.id === thread.id ? 'bg-red-50 border-l-4 border-l-red-500' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <span className="text-red-600 text-sm font-semibold">
                      {getInitials(thread.userName)}
                    </span>
                  </div>
                  {!thread.isRead && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                  {thread.isMuted && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-400 rounded-full flex items-center justify-center">
                      <BellOff className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm truncate ${
                      !thread.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                    }`}>
                      {thread.userName && thread.userName !== 'Unknown User' ? thread.userName : 'Loading...'}
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500 whitespace-nowrap">{formatTime(thread.timestamp)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* --- NEW: Delivery/Seen status in sidebar --- */}
                    {thread.lastMessageSenderId === 'flourish-admin' ? (
                      thread.isSeenByUser ? (
                        <CheckCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )
                    ) : null}
                    <p className={`text-xs leading-relaxed truncate ${
                      !thread.isRead ? 'text-slate-600 font-medium' : 'text-slate-500'
                    }`}>
                      {thread.lastMessage || 'No messages yet...'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      {!thread.isRead && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedThread ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center shadow-sm">
                      <span className="text-red-600 text-sm font-semibold">
                        {getInitials(selectedThread.userName)}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      selectedThread.isOnline ? 'bg-green-500' : 'bg-slate-400'
                    }`}></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">{selectedThread.userName}</h3>
                    <div className="flex items-center gap-2 text-sm">
                      {selectedThread.isOnline ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-600 font-medium">Active now</span>
                        </>
                      ) : (
                        <>
                           <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                           <span className="text-slate-500">
                             {selectedThread.lastSeen ? `Last seen ${formatTime(selectedThread.lastSeen)}` : 'Offline'}
                           </span>
                        </>
                      )}
                      {selectedThread.isMuted && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 flex items-center gap-1">
                            <BellOff size={12} />
                            Muted
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => setMenuOpen(!isMenuOpen)} 
                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-10">
                      <button 
                        onClick={handleMuteToggle} 
                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                      >
                        {selectedThread.isMuted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        {selectedThread.isMuted ? 'Unmute conversation' : 'Mute conversation'}
                      </button>
                      <hr className="my-1 border-slate-100" />
                      <button 
                        onClick={() => {setDeleteModalVisible(true); setMenuOpen(false);}} 
                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-50 to-white min-h-0">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-slate-500 text-sm">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg font-medium mb-2">No messages yet</p>
                    <p className="text-slate-400 text-sm">Start the conversation by sending a message below.</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdminMessage = msg.senderId === 'flourish-admin' || msg.isUser === false;
                  
                  return (
                    <div key={msg.id}>
                      <div className={`flex mb-4 group ${isAdminMessage ? 'justify-end' : 'justify-start'}`}>
                        {!isAdminMessage && (
                          <div className="w-8 h-8 mr-3 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-red-600 text-xs font-medium">
                              {getInitials(msg.senderName)}
                            </span>
                          </div>
                        )}
                        <div className="max-w-xs lg:max-w-md">
                          <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm transition-all duration-300 group-hover:shadow-md ${
                            isAdminMessage 
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                              : 'bg-white text-slate-800 border border-slate-200'
                          }`}>
                            <p className="leading-relaxed">{msg.text || msg.content}</p>
                          </div>
                          {msg.timestamp && (
                            <div className={`flex items-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isAdminMessage ? 'justify-end' : 'justify-start'}`}>
                              <p className="text-xs text-slate-400">
                                {new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {/* --- NEW: Delivery/Seen status in chat bubble --- */}
                              {isAdminMessage && (
                                <span className="inline-block ml-1.5">
                                  {msg.isSeen 
                                    ? <CheckCheck size={16} className="text-blue-300" /> 
                                    : <Check size={16} className="text-slate-100 opacity-70" />}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isAdminMessage && (
                          <div className="w-8 h-8 ml-3 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-white text-xs font-semibold">F</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 bg-white border-t border-slate-200">
              <div className="flex items-center gap-3 bg-slate-100 rounded-2xl px-4 py-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent transition-all duration-200">
                <button className="text-slate-500 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors duration-200">
                  <Smile className="w-5 h-5" />
                </button>
                <button className="text-slate-500 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors duration-200">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder-slate-500"
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && !e.shiftKey) { 
                      e.preventDefault(); 
                      handleSendReply(); 
                    } 
                  }}
                />
                <button 
                  onClick={handleSendReply}
                  disabled={!replyContent.trim()}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    replyContent.trim() 
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm' 
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>Press Enter to send, Shift + Enter for new line</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Connected</span>
                </div>
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