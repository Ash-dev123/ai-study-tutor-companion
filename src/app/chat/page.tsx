"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Paperclip, Brain, ArrowRight, Loader2, ArrowDown, X, User, Menu, Plus, MessageSquare, Trash2, ChevronLeft, Search, Download, Star, Calendar, SortAsc, Copy, RefreshCw, Edit2, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

export default function ChatPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "alphabetical">("recent");
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [showRawMarkdown, setShowRawMarkdown] = useState<{ [key: number]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Load chat sessions and pinned chats from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chatSessions");
    const savedPinned = localStorage.getItem("pinnedChats");
    
    if (savedPinned) {
      setPinnedChats(JSON.parse(savedPinned));
    }
    
    if (saved) {
      const sessions: ChatSession[] = JSON.parse(saved);
      setChatSessions(sessions);
      
      // Load the most recent session if exists
      if (sessions.length > 0 && !currentSessionId) {
        const latestSession = sessions[0];
        setCurrentSessionId(latestSession.id);
        setMessages(latestSession.messages);
      }
    } else {
      // Create initial session
      const newSession = createNewSession();
      setChatSessions([newSession]);
      setCurrentSessionId(newSession.id);
    }
  }, []);

  // Save pinned chats to localStorage
  useEffect(() => {
    if (pinnedChats.length > 0) {
      localStorage.setItem("pinnedChats", JSON.stringify(pinnedChats));
    }
  }, [pinnedChats]);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  // Update current session when messages change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setChatSessions(prev => 
        prev.map(s => {
          if (s.id === currentSessionId) {
            const newTitle = generateTitle(messages);
            // Only update if title actually changed or messages changed
            if (s.title !== newTitle || s.messages.length !== messages.length) {
              return { ...s, messages, title: newTitle, timestamp: Date.now() };
            }
          }
          return s;
        })
      );
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setCurrentTime("Morning");
    else if (hour < 18) setCurrentTime("Afternoon");
    else setCurrentTime("Evening");
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      scrollToBottom();
    }
  }, [messages]);

  // Handle scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Cmd/Ctrl + K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Cmd/Ctrl + N - New chat
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleNewChat();
        return;
      }

      // Cmd/Ctrl + / - Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
        return;
      }

      // Escape - Close sidebar or clear search
      if (e.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        }
        return;
      }

      // Arrow keys to navigate chat history (only when not typing)
      if (!isTyping && sidebarOpen) {
        const filtered = chatSessions
          .filter(session => 
            session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .sort((a, b) => {
            if (sortBy === "recent") {
              return b.timestamp - a.timestamp;
            } else if (sortBy === "oldest") {
              return a.timestamp - b.timestamp;
            } else {
              return a.title.localeCompare(b.title);
            }
          });
        
        const currentIndex = filtered.findIndex(s => s.id === currentSessionId);
        
        if (e.key === "ArrowUp" && currentIndex > 0) {
          e.preventDefault();
          handleSelectSession(filtered[currentIndex - 1].id);
        } else if (e.key === "ArrowDown" && currentIndex < filtered.length - 1) {
          e.preventDefault();
          handleSelectSession(filtered[currentIndex + 1].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [sidebarOpen, searchQuery, currentSessionId, chatSessions, sortBy]);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingSessionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const createNewSession = (): ChatSession => {
    return {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      timestamp: Date.now()
    };
  };

  const generateTitle = (msgs: Message[]): string => {
    if (msgs.length === 0) return "New Chat";
    const firstUserMsg = msgs.find(m => m.role === "user");
    if (!firstUserMsg) return "New Chat";
    // Get first line or first 40 characters, whichever is shorter
    const firstLine = firstUserMsg.content.split('\n')[0];
    const truncated = firstLine.slice(0, 40);
    return truncated + (firstLine.length > 40 ? "..." : "");
  };

  const handleNewChat = () => {
    const newSession = createNewSession();
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setMessage("");
    setAttachedImages([]);
    // Close sidebar on mobile after creating new chat
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setMessage("");
      setAttachedImages([]);
      // Close sidebar on mobile after selecting session
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      
      // If deleting current session, switch to another or create new
      if (sessionId === currentSessionId) {
        if (filtered.length > 0) {
          setCurrentSessionId(filtered[0].id);
          setMessages(filtered[0].messages);
        } else {
          const newSession = createNewSession();
          setCurrentSessionId(newSession.id);
          setMessages([]);
          return [newSession];
        }
      }
      
      return filtered;
    });
    toast.success("Chat deleted");
  };

  const togglePinChat = (sessionId: string) => {
    setPinnedChats(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
    toast.success(pinnedChats.includes(sessionId) ? "Chat unpinned" : "Chat pinned");
  };

  const exportChat = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    const content = session.messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Chat exported");
  };

  const startRenaming = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setRenamingSessionId(sessionId);
      setRenameValue(session.title);
    }
  };

  const finishRenaming = () => {
    if (renamingSessionId && renameValue.trim()) {
      setChatSessions(prev => 
        prev.map(s => 
          s.id === renamingSessionId 
            ? { ...s, title: renameValue.trim() }
            : s
        )
      );
      toast.success("Chat renamed");
    }
    setRenamingSessionId(null);
    setRenameValue("");
  };

  const cancelRenaming = () => {
    setRenamingSessionId(null);
    setRenameValue("");
  };

  const copyMessageContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleRegenerateResponse = async (messageIndex: number) => {
    if (isLoading) return;
    
    // Find the user message before this assistant message
    const conversationUpToPoint = messages.slice(0, messageIndex);
    const lastUserMessage = [...conversationUpToPoint].reverse().find(m => m.role === "user");
    
    if (!lastUserMessage) {
      toast.error("Cannot find original question");
      return;
    }

    // Remove messages from this point forward
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);
    setIsLoading(true);
    setStreamingMessageIndex(messageIndex);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: lastUserMessage.content,
          conversationHistory: conversationUpToPoint.slice(0, -1),
          deepThinking,
          images: lastUserMessage.images,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Regenerate error:", error);
      toast.error("Failed to regenerate response");
      setMessages(messages); // Restore original messages
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const startEditingMessage = (index: number) => {
    setEditingMessageIndex(index);
    setEditedContent(messages[index].content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageIndex(null);
    setEditedContent("");
  };

  const saveEditedMessage = async () => {
    if (editingMessageIndex === null || !editedContent.trim()) return;
    
    // Update the message and regenerate from that point
    const updatedMessages = messages.slice(0, editingMessageIndex);
    const editedMessage = { ...messages[editingMessageIndex], content: editedContent.trim() };
    
    setMessages([...updatedMessages, editedMessage]);
    setEditingMessageIndex(null);
    setEditedContent("");
    setIsLoading(true);
    setStreamingMessageIndex(updatedMessages.length + 1);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: editedMessage.content,
          conversationHistory: updatedMessages,
          deepThinking,
          images: editedMessage.images,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...updatedMessages, editedMessage, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...updatedMessages, editedMessage, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Edit and regenerate error:", error);
      toast.error("Failed to regenerate response");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleMCQSelection = async (option: string) => {
    if (isLoading) return;

    setIsLoading(true);
    const userMessage = option;

    // Add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setStreamingMessageIndex(newMessages.length);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          deepThinking,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI. Please try again.");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachedImages.length === 0) || isLoading) return;

    const userMessage = message.trim();
    const images = [...attachedImages];
    setMessage("");
    setAttachedImages([]);
    setIsLoading(true);

    // Add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage, images: images.length > 0 ? images : undefined },
    ];
    setMessages(newMessages);
    setStreamingMessageIndex(newMessages.length);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          deepThinking,
          images: images.length > 0 ? images : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI. Please try again.");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Custom code block component with copy button
  const CodeBlock = ({ children, className }: { children: string; className?: string }) => {
    const language = className?.replace("language-", "") || "text";
    
    return (
      <div className="relative group">
        <Button
          size="sm"
          variant="ghost"
          className="absolute right-2 top-2 h-7 px-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/20"
          onClick={() => copyMessageContent(children)}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
        <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto">
          <code className={className}>{children}</code>
        </pre>
      </div>
    );
  };

  // Custom markdown components
  const MarkdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      if (!inline && match) {
        return <CodeBlock className={className}>{codeString}</CodeBlock>;
      }
      
      return <code className={className} {...props}>{children}</code>;
    }
  };

  // Parse MCQ from content
  const parseMCQ = (content: string) => {
    const mcqRegex = /\[MCQ\]([\s\S]*?)\[\/MCQ\]/;
    const match = content.match(mcqRegex);
    
    if (!match) return null;
    
    const mcqContent = match[1].trim();
    const options = mcqContent.split('\n').filter(line => line.trim());
    
    return {
      fullMatch: match[0],
      options: options.map(opt => opt.trim())
    };
  };

  // Render message content with MCQ support
  const renderMessageContent = (msg: Message, idx: number) => {
    const mcq = parseMCQ(msg.content);
    
    if (mcq && msg.role === "assistant") {
      // Split content into before MCQ, MCQ, and after MCQ
      const parts = msg.content.split(mcq.fullMatch);
      const beforeMCQ = parts[0];
      const afterMCQ = parts[1] || "";
      
      return (
        <div className="space-y-4">
          {beforeMCQ && (
            <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
              >
                {beforeMCQ}
              </ReactMarkdown>
            </div>
          )}
          
          {/* MCQ Options */}
          <div className="space-y-2">
            {mcq.options.map((option, i) => (
              <Button
                key={i}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4 bg-white/5 border-white/20 hover:bg-purple-500/20 hover:border-purple-400 text-white text-sm sm:text-base"
                onClick={() => handleMCQSelection(option)}
                disabled={isLoading || idx !== messages.length - 1}
              >
                {option}
              </Button>
            ))}
          </div>
          
          {afterMCQ && (
            <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
              >
                {afterMCQ}
              </ReactMarkdown>
            </div>
          )}
        </div>
      );
    }
    
    // Regular message rendering
    if (msg.role === "assistant") {
      return (
        <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={MarkdownComponents}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      );
    }
    
    return <p className="whitespace-pre-wrap text-sm sm:text-base">{msg.content}</p>;
  };

  const filteredAndSortedSessions = chatSessions
    .filter(session => 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "recent") {
        return b.timestamp - a.timestamp;
      } else if (sortBy === "oldest") {
        return a.timestamp - b.timestamp;
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  // Separate pinned and unpinned
  const pinnedSessions = filteredAndSortedSessions.filter(s => pinnedChats.includes(s.id));
  const unpinnedSessions = filteredAndSortedSessions.filter(s => !pinnedChats.includes(s.id));

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!session?.user) return null;

  const userName = session.user.name?.split(" ")[0] || "there";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAttachedImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains images
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;

        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image must be less than 5MB");
          continue;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setAttachedImages((prev) => [...prev, result]);
          toast.success("Image pasted successfully");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      toast.error("Please drop image files only");
      return;
    }

    imageFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAttachedImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    if (imageFiles.length > 0) {
      toast.success(`${imageFiles.length} image(s) added`);
    }
  };

  return (
    <div 
      className="flex min-h-screen bg-black text-white"
      onDragEnter={handleDragEnter}
    >
      {/* Atmospheric gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gray-500/10 blur-[120px]" />
      </div>

      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 z-50 bg-purple-500/20 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-purple-500"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center px-4">
            <Paperclip className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-purple-400" />
            <p className="text-xl sm:text-2xl font-semibold text-white">Drop images here</p>
            <p className="text-sm sm:text-base text-gray-300 mt-2">Upload images to your chat</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-20 h-screen border-r border-white/10 bg-black/95 backdrop-blur-xl transition-transform duration-300 w-[85vw] sm:w-80 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          {/* Sidebar Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Chat History</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-gray-400 hover:bg-white/10 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-white/20"
            />
          </div>

          {/* Sort Options */}
          <div className="mb-3 flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("recent")}
              className={`flex-1 text-xs ${
                sortBy === "recent" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <Calendar className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Recent</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("oldest")}
              className={`flex-1 text-xs ${
                sortBy === "oldest" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <Calendar className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Oldest</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("alphabetical")}
              className={`flex-1 text-xs ${
                sortBy === "alphabetical" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <SortAsc className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">A-Z</span>
            </Button>
          </div>

          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            className="mb-4 w-full justify-start gap-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          {/* Chat Sessions List */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {/* Pinned Chats */}
            {pinnedSessions.length > 0 && (
              <div>
                <p className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase">Pinned</p>
                <div className="space-y-2">
                  {pinnedSessions.map((chatSession) => (
                    <div
                      key={chatSession.id}
                      className={`group relative rounded-lg p-3 transition-colors ${
                        chatSession.id === currentSessionId
                          ? "bg-white/20"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {renamingSessionId === chatSession.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") finishRenaming();
                              if (e.key === "Escape") cancelRenaming();
                            }}
                            className="h-7 bg-white/10 border-white/20 text-white text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-green-500/20 hover:text-green-400"
                            onClick={finishRenaming}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-red-500/20 hover:text-red-400"
                            onClick={cancelRenaming}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSelectSession(chatSession.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm text-white">{chatSession.title}</p>
                                <p className="text-xs text-gray-500">{formatTimestamp(chatSession.timestamp)}</p>
                              </div>
                            </div>
                          </button>
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-purple-500/20 hover:text-purple-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenaming(chatSession.id);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-yellow-500/20 hover:text-yellow-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(chatSession.id);
                              }}
                            >
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-blue-500/20 hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportChat(chatSession.id);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(chatSession.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Chats */}
            {unpinnedSessions.length > 0 && (
              <div>
                {pinnedSessions.length > 0 && (
                  <p className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase">All Chats</p>
                )}
                <div className="space-y-2">
                  {unpinnedSessions.map((chatSession) => (
                    <div
                      key={chatSession.id}
                      className={`group relative rounded-lg p-3 transition-colors ${
                        chatSession.id === currentSessionId
                          ? "bg-white/20"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {renamingSessionId === chatSession.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") finishRenaming();
                              if (e.key === "Escape") cancelRenaming();
                            }}
                            className="h-7 bg-white/10 border-white/20 text-white text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-green-500/20 hover:text-green-400"
                            onClick={finishRenaming}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-red-500/20 hover:text-red-400"
                            onClick={cancelRenaming}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSelectSession(chatSession.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm text-white">{chatSession.title}</p>
                                <p className="text-xs text-gray-500">{formatTimestamp(chatSession.timestamp)}</p>
                              </div>
                            </div>
                          </button>
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-purple-500/20 hover:text-purple-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenaming(chatSession.id);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-yellow-500/20 hover:text-yellow-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(chatSession.id);
                              }}
                            >
                              <Star className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-blue-500/20 hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportChat(chatSession.id);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(chatSession.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredAndSortedSessions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? "No chats found" : "No chats yet"}
                </p>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-4 pt-4 border-t border-white/10 hidden lg:block">
            <p className="text-xs text-gray-500 text-center">
              ⌘K Search • ⌘N New • ⌘/ Sidebar
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:ml-80">
        {/* Header */}
        <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400 hover:bg-white/10 hover:text-white flex-shrink-0 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-base sm:text-xl font-semibold text-white truncate">StudySphere</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="rounded-full bg-white/10 text-white hover:bg-white/20">
                Chat
              </Button>
            </Link>
            <Link href="/archive">
              <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
                Archive
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
                Settings
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9"
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 sm:px-4 py-4 sm:py-12">
          {messages.length === 0 ? (
            <>
              {/* Version */}
              <div className="mb-6 sm:mb-8 text-center">
                <p className="text-xs sm:text-sm text-gray-500">StudySphere 3.0</p>
              </div>

              {/* Greeting */}
              <div className="mb-8 sm:mb-12 text-center px-4">
                <h2 className="mb-2 text-2xl sm:text-4xl font-normal">Good {currentTime}, {userName}!</h2>
                <p className="text-xl sm:text-3xl font-light text-gray-300">I am ready to help you</p>
              </div>
            </>
          ) : (
            <div ref={messagesContainerRef} className="mb-4 sm:mb-8 flex-1 space-y-4 sm:space-y-6 overflow-y-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 sm:gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                    </div>
                  )}
                  <div className="flex flex-col max-w-[85%] sm:max-w-[80%]">
                    {editingMessageIndex === idx ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="min-h-[100px] bg-white/5 border-white/10 text-white text-sm sm:text-base"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveEditedMessage}
                            className="bg-purple-500 hover:bg-purple-600 text-xs sm:text-sm"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Save & Regenerate</span>
                            <span className="sm:hidden">Save</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditingMessage}
                            className="hover:bg-white/10 text-xs sm:text-sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`group relative rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                            msg.role === "user"
                              ? "bg-white text-black"
                              : "bg-[#1a1a1a] text-white"
                          }`}
                        >
                          {msg.images && msg.images.length > 0 && (
                            <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
                              {msg.images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`Uploaded ${i + 1}`}
                                  className="h-24 sm:h-32 w-auto rounded-lg object-cover"
                                />
                              ))}
                            </div>
                          )}
                          {renderMessageContent(msg, idx)}
                          
                          {/* Message action buttons */}
                          <div className="absolute -bottom-8 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {msg.role === "assistant" && idx === messages.length - 1 && !isLoading && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs hover:bg-white/10"
                                  onClick={() => copyMessageContent(msg.content)}
                                >
                                  <Copy className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Copy</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs hover:bg-white/10"
                                  onClick={() => handleRegenerateResponse(idx)}
                                >
                                  <RefreshCw className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Regenerate</span>
                                </Button>
                              </>
                            )}
                            {msg.role === "assistant" && idx !== messages.length - 1 && !isLoading && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-white/10"
                                onClick={() => copyMessageContent(msg.content)}
                              >
                                <Copy className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Copy</span>
                              </Button>
                            )}
                            {msg.role === "user" && !isLoading && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-white/10"
                                onClick={() => startEditingMessage(idx)}
                              >
                                <Edit2 className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                      <span className="text-xs sm:text-sm font-semibold">{userName[0].toUpperCase()}</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 sm:gap-4">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                    <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                  </div>
                  <div className="rounded-2xl bg-[#1a1a1a] px-3 py-2 sm:px-4 sm:py-3">
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="fixed bottom-24 sm:bottom-32 right-4 sm:right-8 rounded-full bg-white text-black shadow-lg hover:bg-gray-200 h-10 w-10 sm:h-12 sm:w-12 z-10"
            >
              <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}

          {/* Input Section */}
          <div className="mt-auto">
            <form onSubmit={handleSubmit}>
              <div className="relative rounded-2xl bg-[#1a1a1a] p-3 sm:p-4">
                {/* Image preview */}
                {attachedImages.length > 0 && (
                  <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
                    {attachedImages.map((img, i) => (
                      <div key={i} className="relative">
                        <img
                          src={img}
                          alt={`Preview ${i + 1}`}
                          className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute -right-1 -top-1 sm:-right-2 sm:-top-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                          onClick={() => removeImage(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Ask a question or make a request..."
                  className="min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent text-sm sm:text-base text-white placeholder:text-gray-500 focus-visible:ring-0"
                  disabled={isLoading}
                  rows={1}
                />
                <div className="mt-2 sm:mt-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 sm:gap-3 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-400 hover:bg-white/10 hover:text-white"
                      disabled={isLoading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Attach</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-auto rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm ${
                        deepThinking
                          ? "bg-purple-500/20 text-purple-400"
                          : "text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                      disabled={isLoading}
                      onClick={() => setDeepThinking(!deepThinking)}
                    >
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Deep Thinking</span>
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white text-black hover:bg-gray-200 flex-shrink-0"
                    disabled={isLoading || (!message.trim() && attachedImages.length === 0)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
            <p className="mt-2 text-center text-[10px] sm:text-xs text-gray-500 px-2">
              <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line • Drag & drop images anywhere</span>
              <span className="sm:hidden">Press Enter to send, Shift+Enter for new line</span>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 px-3 sm:px-4 py-3 sm:py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-center sm:justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 flex-wrap">
            <Link href="#" className="hover:text-white">
              24/7 Help Chat
            </Link>
            <Link href="#" className="hover:text-white">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Paperclip, Brain, ArrowRight, Loader2, ArrowDown, X, User, Menu, Plus, MessageSquare, Trash2, ChevronLeft, Search, Download, Star, Calendar, SortAsc, Copy, RefreshCw, Edit2, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

export default function ChatPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "alphabetical">("recent");
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [showRawMarkdown, setShowRawMarkdown] = useState<boolean[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Load chat sessions and pinned chats from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chatSessions");
    const savedPinned = localStorage.getItem("pinnedChats");
    
    if (savedPinned) {
      setPinnedChats(JSON.parse(savedPinned));
    }
    
    if (saved) {
      const sessions: ChatSession[] = JSON.parse(saved);
      setChatSessions(sessions);
      
      // Load the most recent session if exists
      if (sessions.length > 0 && !currentSessionId) {
        const latestSession = sessions[0];
        setCurrentSessionId(latestSession.id);
        setMessages(latestSession.messages);
      }
    } else {
      // Create initial session
      const newSession = createNewSession();
      setChatSessions([newSession]);
      setCurrentSessionId(newSession.id);
    }
  }, []);

  // Save pinned chats to localStorage
  useEffect(() => {
    if (pinnedChats.length > 0) {
      localStorage.setItem("pinnedChats", JSON.stringify(pinnedChats));
    }
  }, [pinnedChats]);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  // Update current session when messages change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setChatSessions(prev => 
        prev.map(s => {
          if (s.id === currentSessionId) {
            const newTitle = generateTitle(messages);
            // Only update if title actually changed or messages changed
            if (s.title !== newTitle || s.messages.length !== messages.length) {
              return { ...s, messages, title: newTitle, timestamp: Date.now() };
            }
          }
          return s;
        })
      );
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setCurrentTime("Morning");
    else if (hour < 18) setCurrentTime("Afternoon");
    else setCurrentTime("Evening");
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      scrollToBottom();
    }
  }, [messages]);

  // Handle scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Cmd/Ctrl + K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Cmd/Ctrl + N - New chat
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleNewChat();
        return;
      }

      // Cmd/Ctrl + / - Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
        return;
      }

      // Escape - Close sidebar or clear search
      if (e.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        }
        return;
      }

      // Arrow keys to navigate chat history (only when not typing)
      if (!isTyping && sidebarOpen) {
        const filtered = chatSessions
          .filter(session => 
            session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .sort((a, b) => {
            if (sortBy === "recent") {
              return b.timestamp - a.timestamp;
            } else if (sortBy === "oldest") {
              return a.timestamp - b.timestamp;
            } else {
              return a.title.localeCompare(b.title);
            }
          });
        
        const currentIndex = filtered.findIndex(s => s.id === currentSessionId);
        
        if (e.key === "ArrowUp" && currentIndex > 0) {
          e.preventDefault();
          handleSelectSession(filtered[currentIndex - 1].id);
        } else if (e.key === "ArrowDown" && currentIndex < filtered.length - 1) {
          e.preventDefault();
          handleSelectSession(filtered[currentIndex + 1].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [sidebarOpen, searchQuery, currentSessionId, chatSessions, sortBy]);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingSessionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const createNewSession = (): ChatSession => {
    return {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      timestamp: Date.now()
    };
  };

  const generateTitle = (msgs: Message[]): string => {
    if (msgs.length === 0) return "New Chat";
    const firstUserMsg = msgs.find(m => m.role === "user");
    if (!firstUserMsg) return "New Chat";
    // Get first line or first 40 characters, whichever is shorter
    const firstLine = firstUserMsg.content.split('\n')[0];
    const truncated = firstLine.slice(0, 40);
    return truncated + (firstLine.length > 40 ? "..." : "");
  };

  const handleNewChat = () => {
    const newSession = createNewSession();
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setMessage("");
    setAttachedImages([]);
    // Close sidebar on mobile after creating new chat
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setMessage("");
      setAttachedImages([]);
      // Close sidebar on mobile after selecting session
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      
      // If deleting current session, switch to another or create new
      if (sessionId === currentSessionId) {
        if (filtered.length > 0) {
          setCurrentSessionId(filtered[0].id);
          setMessages(filtered[0].messages);
        } else {
          const newSession = createNewSession();
          setCurrentSessionId(newSession.id);
          setMessages([]);
          return [newSession];
        }
      }
      
      return filtered;
    });
    toast.success("Chat deleted");
  };

  const togglePinChat = (sessionId: string) => {
    setPinnedChats(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
    toast.success(pinnedChats.includes(sessionId) ? "Chat unpinned" : "Chat pinned");
  };

  const exportChat = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    const content = session.messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Chat exported");
  };

  const startRenaming = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setRenamingSessionId(sessionId);
      setRenameValue(session.title);
    }
  };

  const finishRenaming = () => {
    if (renamingSessionId && renameValue.trim()) {
      setChatSessions(prev => 
        prev.map(s => 
          s.id === renamingSessionId 
            ? { ...s, title: renameValue.trim() }
            : s
        )
      );
      toast.success("Chat renamed");
    }
    setRenamingSessionId(null);
    setRenameValue("");
  };

  const cancelRenaming = () => {
    setRenamingSessionId(null);
    setRenameValue("");
  };

  const copyMessageContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleRegenerateResponse = async (messageIndex: number) => {
    if (isLoading) return;
    
    // Find the user message before this assistant message
    const conversationUpToPoint = messages.slice(0, messageIndex);
    const lastUserMessage = [...conversationUpToPoint].reverse().find(m => m.role === "user");
    
    if (!lastUserMessage) {
      toast.error("Cannot find original question");
      return;
    }

    // Remove messages from this point forward
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);
    setIsLoading(true);
    setStreamingMessageIndex(messageIndex);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: lastUserMessage.content,
          conversationHistory: conversationUpToPoint.slice(0, -1),
          deepThinking,
          images: lastUserMessage.images,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Regenerate error:", error);
      toast.error("Failed to regenerate response");
      setMessages(messages); // Restore original messages
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const startEditingMessage = (index: number) => {
    setEditingMessageIndex(index);
    setEditedContent(messages[index].content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageIndex(null);
    setEditedContent("");
  };

  const saveEditedMessage = async () => {
    if (editingMessageIndex === null || !editedContent.trim()) return;
    
    // Update the message and regenerate from that point
    const updatedMessages = messages.slice(0, editingMessageIndex);
    const editedMessage = { ...messages[editingMessageIndex], content: editedContent.trim() };
    
    setMessages([...updatedMessages, editedMessage]);
    setEditingMessageIndex(null);
    setEditedContent("");
    setIsLoading(true);
    setStreamingMessageIndex(updatedMessages.length + 1);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: editedMessage.content,
          conversationHistory: updatedMessages,
          deepThinking,
          images: editedMessage.images,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...updatedMessages, editedMessage, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...updatedMessages, editedMessage, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Edit and regenerate error:", error);
      toast.error("Failed to regenerate response");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleMCQSelection = async (option: string) => {
    if (isLoading) return;

    setIsLoading(true);
    const userMessage = option;

    // Add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setStreamingMessageIndex(newMessages.length);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          deepThinking,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI. Please try again.");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachedImages.length === 0) || isLoading) return;

    const userMessage = message.trim();
    const images = [...attachedImages];
    setMessage("");
    setAttachedImages([]);
    setIsLoading(true);

    // Add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage, images: images.length > 0 ? images : undefined },
    ];
    setMessages(newMessages);
    setStreamingMessageIndex(newMessages.length);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          deepThinking,
          images: images.length > 0 ? images : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI. Please try again.");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Custom code block component with copy button
  const CodeBlock = ({ children, className }: { children: string; className?: string }) => {
    const language = className?.replace("language-", "") || "text";
    
    return (
      <div className="relative group">
        <Button
          size="sm"
          variant="ghost"
          className="absolute right-2 top-2 h-7 px-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/20"
          onClick={() => copyMessageContent(children)}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
        <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto">
          <code className={className}>{children}</code>
        </pre>
      </div>
    );
  };

  // Custom markdown components
  const MarkdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      if (!inline && match) {
        return <CodeBlock className={className}>{codeString}</CodeBlock>;
      }
      
      return <code className={className} {...props}>{children}</code>;
    }
  };

  // Parse MCQ from content
  const parseMCQ = (content: string) => {
    const mcqRegex = /\[MCQ\]([\s\S]*?)\[\/MCQ\]/;
    const match = content.match(mcqRegex);
    
    if (!match) return null;
    
    const mcqContent = match[1].trim();
    const options = mcqContent.split('\n').filter(line => line.trim());
    
    return {
      fullMatch: match[0],
      options: options.map(opt => opt.trim())
    };
  };

  // Render message content with MCQ support
  const renderMessageContent = (msg: Message, idx: number) => {
    // Show raw markdown if toggled
    if (showRawMarkdown[idx] && msg.role === "assistant") {
      return (
        <div className="font-mono text-sm bg-black/30 p-3 rounded-lg overflow-x-auto">
          <pre className="whitespace-pre-wrap">{msg.content}</pre>
        </div>
      );
    }

    const mcq = parseMCQ(msg.content);
    
    if (mcq && msg.role === "assistant") {
      // Split content into before MCQ, MCQ, and after MCQ
      const parts = msg.content.split(mcq.fullMatch);
      const beforeMCQ = parts[0];
      const afterMCQ = parts[1] || "";
      
      return (
        <div className="space-y-4">
          {beforeMCQ && (
            <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
              >
                {beforeMCQ}
              </ReactMarkdown>
            </div>
          )}
          
          {/* MCQ Options */}
          <div className="space-y-2">
            {mcq.options.map((option, i) => (
              <Button
                key={i}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4 bg-white/5 border-white/20 hover:bg-purple-500/20 hover:border-purple-400 text-white text-sm sm:text-base"
                onClick={() => handleMCQSelection(option)}
                disabled={isLoading || idx !== messages.length - 1}
              >
                {option}
              </Button>
            ))}
          </div>
          
          {afterMCQ && (
            <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
              >
                {afterMCQ}
              </ReactMarkdown>
            </div>
          )}
        </div>
      );
    }
    
    // Regular message rendering
    if (msg.role === "assistant") {
      return (
        <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={MarkdownComponents}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      );
    }
    
    return <p className="whitespace-pre-wrap text-sm sm:text-base">{msg.content}</p>;
  };

  const filteredAndSortedSessions = chatSessions
    .filter(session => 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "recent") {
        return b.timestamp - a.timestamp;
      } else if (sortBy === "oldest") {
        return a.timestamp - b.timestamp;
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  // Separate pinned and unpinned
  const pinnedSessions = filteredAndSortedSessions.filter(s => pinnedChats.includes(s.id));
  const unpinnedSessions = filteredAndSortedSessions.filter(s => !pinnedChats.includes(s.id));

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!session?.user) return null;

  const userName = session.user.name?.split(" ")[0] || "there";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAttachedImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains images
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;

        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image must be less than 5MB");
          continue;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setAttachedImages((prev) => [...prev, result]);
          toast.success("Image pasted successfully");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      toast.error("Please drop image files only");
      return;
    }

    imageFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAttachedImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    if (imageFiles.length > 0) {
      toast.success(`${imageFiles.length} image(s) added`);
    }
  };

  return (
    <div 
      className="flex min-h-screen bg-black text-white"
      onDragEnter={handleDragEnter}
    >
      {/* Atmospheric gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gray-500/10 blur-[120px]" />
      </div>

      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 z-50 bg-purple-500/20 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-purple-500"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center px-4">
            <Paperclip className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-purple-400" />
            <p className="text-xl sm:text-2xl font-semibold text-white">Drop images here</p>
            <p className="text-sm sm:text-base text-gray-300 mt-2">Upload images to your chat</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-20 h-screen border-r border-white/10 bg-black/95 backdrop-blur-xl transition-transform duration-300 w-[85vw] sm:w-80 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          {/* Sidebar Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Chat History</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-gray-400 hover:bg-white/10 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-white/20"
            />
          </div>

          {/* Sort Options */}
          <div className="mb-3 flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("recent")}
              className={`flex-1 text-xs ${
                sortBy === "recent" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <Calendar className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Recent</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("oldest")}
              className={`flex-1 text-xs ${
                sortBy === "oldest" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <Calendar className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Oldest</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("alphabetical")}
              className={`flex-1 text-xs ${
                sortBy === "alphabetical" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <SortAsc className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">A-Z</span>
            </Button>
          </div>

          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            className="mb-4 w-full justify-start gap-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          {/* Chat Sessions List */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {/* Pinned Chats */}
            {pinnedSessions.length > 0 && (
              <div>
                <p className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase">Pinned</p>
                <div className="space-y-2">
                  {pinnedSessions.map((chatSession) => (
                    <div
                      key={chatSession.id}
                      className={`group relative rounded-lg p-3 transition-colors ${
                        chatSession.id === currentSessionId
                          ? "bg-white/20"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {renamingSessionId === chatSession.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") finishRenaming();
                              if (e.key === "Escape") cancelRenaming();
                            }}
                            className="h-7 bg-white/10 border-white/20 text-white text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-green-500/20 hover:text-green-400"
                            onClick={finishRenaming}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-red-500/20 hover:text-red-400"
                            onClick={cancelRenaming}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSelectSession(chatSession.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm text-white">{chatSession.title}</p>
                                <p className="text-xs text-gray-500">{formatTimestamp(chatSession.timestamp)}</p>
                              </div>
                            </div>
                          </button>
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-purple-500/20 hover:text-purple-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenaming(chatSession.id);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-yellow-500/20 hover:text-yellow-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(chatSession.id);
                              }}
                            >
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-blue-500/20 hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportChat(chatSession.id);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(chatSession.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Chats */}
            {unpinnedSessions.length > 0 && (
              <div>
                {pinnedSessions.length > 0 && (
                  <p className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase">All Chats</p>
                )}
                <div className="space-y-2">
                  {unpinnedSessions.map((chatSession) => (
                    <div
                      key={chatSession.id}
                      className={`group relative rounded-lg p-3 transition-colors ${
                        chatSession.id === currentSessionId
                          ? "bg-white/20"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {renamingSessionId === chatSession.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") finishRenaming();
                              if (e.key === "Escape") cancelRenaming();
                            }}
                            className="h-7 bg-white/10 border-white/20 text-white text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-green-500/20 hover:text-green-400"
                            onClick={finishRenaming}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-red-500/20 hover:text-red-400"
                            onClick={cancelRenaming}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSelectSession(chatSession.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm text-white">{chatSession.title}</p>
                                <p className="text-xs text-gray-500">{formatTimestamp(chatSession.timestamp)}</p>
                              </div>
                            </div>
                          </button>
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-purple-500/20 hover:text-purple-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenaming(chatSession.id);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-yellow-500/20 hover:text-yellow-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(chatSession.id);
                              }}
                            >
                              <Star className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-blue-500/20 hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportChat(chatSession.id);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(chatSession.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredAndSortedSessions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? "No chats found" : "No chats yet"}
                </p>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-4 pt-4 border-t border-white/10 hidden lg:block">
            <p className="text-xs text-gray-500 text-center">
              ⌘K Search • ⌘N New • ⌘/ Sidebar
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:ml-80">
        {/* Header */}
        <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400 hover:bg-white/10 hover:text-white flex-shrink-0 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-base sm:text-xl font-semibold text-white truncate">StudySphere</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="rounded-full bg-white/10 text-white hover:bg-white/20">
                Chat
              </Button>
            </Link>
            <Link href="/archive">
              <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
                Archive
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
                Settings
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9"
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 sm:px-4 py-4 sm:py-12">
          {messages.length === 0 ? (
            <>
              {/* Version */}
              <div className="mb-6 sm:mb-8 text-center">
                <p className="text-xs sm:text-sm text-gray-500">StudySphere 3.0</p>
              </div>

              {/* Greeting */}
              <div className="mb-8 sm:mb-12 text-center px-4">
                <h2 className="mb-2 text-2xl sm:text-4xl font-normal">Good {currentTime}, {userName}!</h2>
                <p className="text-xl sm:text-3xl font-light text-gray-300">I am ready to help you</p>
              </div>
            </>
          ) : (
            <div ref={messagesContainerRef} className="mb-4 sm:mb-8 flex-1 space-y-4 sm:space-y-6 overflow-y-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 sm:gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                    </div>
                  )}
                  <div className="flex flex-col max-w-[85%] sm:max-w-[80%]">
                    {editingMessageIndex === idx ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="min-h-[100px] bg-white/5 border-white/10 text-white text-sm sm:text-base"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveEditedMessage}
                            className="bg-purple-500 hover:bg-purple-600 text-xs sm:text-sm"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Save & Regenerate</span>
                            <span className="sm:hidden">Save</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditingMessage}
                            className="hover:bg-white/10 text-xs sm:text-sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`group relative rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                            msg.role === "user"
                              ? "bg-white text-black"
                              : "bg-[#1a1a1a] text-white"
                          }`}
                        >
                          {msg.images && msg.images.length > 0 && (
                            <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
                              {msg.images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`Uploaded ${i + 1}`}
                                  className="h-24 sm:h-32 w-auto rounded-lg object-cover"
                                />
                              ))}
                            </div>
                          )}
                          {renderMessageContent(msg, idx)}
                          
                          {/* Message action buttons */}
                          <div className="absolute -bottom-8 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {msg.role === "assistant" && idx === messages.length - 1 && !isLoading && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs hover:bg-white/10"
                                  onClick={() => copyMessageContent(msg.content)}
                                >
                                  <Copy className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Copy</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs hover:bg-white/10"
                                  onClick={() => handleRegenerateResponse(idx)}
                                >
                                  <RefreshCw className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Regenerate</span>
                                </Button>
                              </>
                            )}
                            {msg.role === "assistant" && idx !== messages.length - 1 && !isLoading && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-white/10"
                                onClick={() => copyMessageContent(msg.content)}
                              >
                                <Copy className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Copy</span>
                              </Button>
                            )}
                            {msg.role === "user" && !isLoading && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-white/10"
                                onClick={() => startEditingMessage(idx)}
                              >
                                <Edit2 className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                      <span className="text-xs sm:text-sm font-semibold">{userName[0].toUpperCase()}</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 sm:gap-4">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                    <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                  </div>
                  <div className="rounded-2xl bg-[#1a1a1a] px-3 py-2 sm:px-4 sm:py-3">
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="fixed bottom-24 sm:bottom-32 right-4 sm:right-8 rounded-full bg-white text-black shadow-lg hover:bg-gray-200 h-10 w-10 sm:h-12 sm:w-12 z-10"
            >
              <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}

          {/* Input Section */}
          <div className="mt-auto">
            <form onSubmit={handleSubmit}>
              <div className="relative rounded-2xl bg-[#1a1a1a] p-3 sm:p-4">
                {/* Image preview */}
                {attachedImages.length > 0 && (
                  <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
                    {attachedImages.map((img, i) => (
                      <div key={i} className="relative">
                        <img
                          src={img}
                          alt={`Preview ${i + 1}`}
                          className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute -right-1 -top-1 sm:-right-2 sm:-top-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                          onClick={() => removeImage(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Ask a question or make a request..."
                  className="min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent text-sm sm:text-base text-white placeholder:text-gray-500 focus-visible:ring-0"
                  disabled={isLoading}
                  rows={1}
                />
                <div className="mt-2 sm:mt-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 sm:gap-3 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-400 hover:bg-white/10 hover:text-white"
                      disabled={isLoading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Attach</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-auto rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm ${
                        deepThinking
                          ? "bg-purple-500/20 text-purple-400"
                          : "text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                      disabled={isLoading}
                      onClick={() => setDeepThinking(!deepThinking)}
                    >
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Deep Thinking</span>
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white text-black hover:bg-gray-200 flex-shrink-0"
                    disabled={isLoading || (!message.trim() && attachedImages.length === 0)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
            <p className="mt-2 text-center text-[10px] sm:text-xs text-gray-500 px-2">
              <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line • Drag & drop images anywhere</span>
              <span className="sm:hidden">Press Enter to send, Shift+Enter for new line</span>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 px-3 sm:px-4 py-3 sm:py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-center sm:justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 flex-wrap">
            <Link href="#" className="hover:text-white">
              24/7 Help Chat
            </Link>
            <Link href="#" className="hover:text-white">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Paperclip, Brain, ArrowRight, Loader2, ArrowDown, X, User, Menu, Plus, MessageSquare, Trash2, ChevronLeft, Search, Download, Star, Calendar, SortAsc, Copy, RefreshCw, Edit2, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

export default function ChatPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "alphabetical">("recent");
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [showRawMarkdown, setShowRawMarkdown] = useState<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Load chat sessions and pinned chats from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chatSessions");
    const savedPinned = localStorage.getItem("pinnedChats");
    
    if (savedPinned) {
      setPinnedChats(JSON.parse(savedPinned));
    }
    
    if (saved) {
      const sessions: ChatSession[] = JSON.parse(saved);
      setChatSessions(sessions);
      
      // Load the most recent session if exists
      if (sessions.length > 0 && !currentSessionId) {
        const latestSession = sessions[0];
        setCurrentSessionId(latestSession.id);
        setMessages(latestSession.messages);
      }
    } else {
      // Create initial session
      const newSession = createNewSession();
      setChatSessions([newSession]);
      setCurrentSessionId(newSession.id);
    }
  }, []);

  // Save pinned chats to localStorage
  useEffect(() => {
    if (pinnedChats.length > 0) {
      localStorage.setItem("pinnedChats", JSON.stringify(pinnedChats));
    }
  }, [pinnedChats]);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  // Update current session when messages change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setChatSessions(prev => 
        prev.map(s => {
          if (s.id === currentSessionId) {
            const newTitle = generateTitle(messages);
            // Only update if title actually changed or messages changed
            if (s.title !== newTitle || s.messages.length !== messages.length) {
              return { ...s, messages, title: newTitle, timestamp: Date.now() };
            }
          }
          return s;
        })
      );
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setCurrentTime("Morning");
    else if (hour < 18) setCurrentTime("Afternoon");
    else setCurrentTime("Evening");
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      scrollToBottom();
    }
  }, [messages]);

  // Handle scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Cmd/Ctrl + K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Cmd/Ctrl + N - New chat
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleNewChat();
        return;
      }

      // Cmd/Ctrl + / - Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
        return;
      }

      // Escape - Close sidebar or clear search
      if (e.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        }
        return;
      }

      // Arrow keys to navigate chat history (only when not typing)
      if (!isTyping && sidebarOpen) {
        const filtered = chatSessions
          .filter(session => 
            session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .sort((a, b) => {
            if (sortBy === "recent") {
              return b.timestamp - a.timestamp;
            } else if (sortBy === "oldest") {
              return a.timestamp - b.timestamp;
            } else {
              return a.title.localeCompare(b.title);
            }
          });
        
        const currentIndex = filtered.findIndex(s => s.id === currentSessionId);
        
        if (e.key === "ArrowUp" && currentIndex > 0) {
          e.preventDefault();
          handleSelectSession(filtered[currentIndex - 1].id);
        } else if (e.key === "ArrowDown" && currentIndex < filtered.length - 1) {
          e.preventDefault();
          handleSelectSession(filtered[currentIndex + 1].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [sidebarOpen, searchQuery, currentSessionId, chatSessions, sortBy]);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingSessionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const createNewSession = (): ChatSession => {
    return {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      timestamp: Date.now()
    };
  };

  const generateTitle = (msgs: Message[]): string => {
    if (msgs.length === 0) return "New Chat";
    const firstUserMsg = msgs.find(m => m.role === "user");
    if (!firstUserMsg) return "New Chat";
    // Get first line or first 40 characters, whichever is shorter
    const firstLine = firstUserMsg.content.split('\n')[0];
    const truncated = firstLine.slice(0, 40);
    return truncated + (firstLine.length > 40 ? "..." : "");
  };

  const handleNewChat = () => {
    const newSession = createNewSession();
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setMessage("");
    setAttachedImages([]);
    // Close sidebar on mobile after creating new chat
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setMessage("");
      setAttachedImages([]);
      // Close sidebar on mobile after selecting session
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      
      // If deleting current session, switch to another or create new
      if (sessionId === currentSessionId) {
        if (filtered.length > 0) {
          setCurrentSessionId(filtered[0].id);
          setMessages(filtered[0].messages);
        } else {
          const newSession = createNewSession();
          setCurrentSessionId(newSession.id);
          setMessages([]);
          return [newSession];
        }
      }
      
      return filtered;
    });
    toast.success("Chat deleted");
  };

  const togglePinChat = (sessionId: string) => {
    setPinnedChats(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
    toast.success(pinnedChats.includes(sessionId) ? "Chat unpinned" : "Chat pinned");
  };

  const exportChat = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    const content = session.messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Chat exported");
  };

  const startRenaming = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setRenamingSessionId(sessionId);
      setRenameValue(session.title);
    }
  };

  const finishRenaming = () => {
    if (renamingSessionId && renameValue.trim()) {
      setChatSessions(prev => 
        prev.map(s => 
          s.id === renamingSessionId 
            ? { ...s, title: renameValue.trim() }
            : s
        )
      );
      toast.success("Chat renamed");
    }
    setRenamingSessionId(null);
    setRenameValue("");
  };

  const cancelRenaming = () => {
    setRenamingSessionId(null);
    setRenameValue("");
  };

  const copyMessageContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const toggleRawMarkdown = (index: number) => {
    const newShowRawMarkdown = [...showRawMarkdown];
    newShowRawMarkdown[index] = !newShowRawMarkdown[index];
    setShowRawMarkdown(newShowRawMarkdown);
  };

  const handleRegenerateResponse = async (messageIndex: number) => {
    if (isLoading) return;
    
    // Find the user message before this assistant message
    const conversationUpToPoint = messages.slice(0, messageIndex);
    const lastUserMessage = [...conversationUpToPoint].reverse().find(m => m.role === "user");
    
    if (!lastUserMessage) {
      toast.error("Cannot find original question");
      return;
    }

    // Remove messages from this point forward
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);
    setIsLoading(true);
    setStreamingMessageIndex(messageIndex);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: lastUserMessage.content,
          conversationHistory: conversationUpToPoint.slice(0, -1),
          deepThinking,
          images: lastUserMessage.images,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Regenerate error:", error);
      toast.error("Failed to regenerate response");
      setMessages(messages); // Restore original messages
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const startEditingMessage = (index: number) => {
    setEditingMessageIndex(index);
    setEditedContent(messages[index].content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageIndex(null);
    setEditedContent("");
  };

  const saveEditedMessage = async () => {
    if (editingMessageIndex === null || !editedContent.trim()) return;
    
    // Update the message and regenerate from that point
    const updatedMessages = messages.slice(0, editingMessageIndex);
    const editedMessage = { ...messages[editingMessageIndex], content: editedContent.trim() };
    
    setMessages([...updatedMessages, editedMessage]);
    setEditingMessageIndex(null);
    setEditedContent("");
    setIsLoading(true);
    setStreamingMessageIndex(updatedMessages.length + 1);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: editedMessage.content,
          conversationHistory: updatedMessages,
          deepThinking,
          images: editedMessage.images,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...updatedMessages, editedMessage, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...updatedMessages, editedMessage, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Edit and regenerate error:", error);
      toast.error("Failed to regenerate response");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleMCQSelection = async (option: string) => {
    if (isLoading) return;

    setIsLoading(true);
    const userMessage = option;

    // Add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setStreamingMessageIndex(newMessages.length);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          deepThinking,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI. Please try again.");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachedImages.length === 0) || isLoading) return;

    const userMessage = message.trim();
    const images = [...attachedImages];
    setMessage("");
    setAttachedImages([]);
    setIsLoading(true);

    // Add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage, images: images.length > 0 ? images : undefined },
    ];
    setMessages(newMessages);
    setStreamingMessageIndex(newMessages.length);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          deepThinking,
          images: images.length > 0 ? images : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI. Please try again.");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Custom code block component with copy button
  const CodeBlock = ({ children, className }: { children: string; className?: string }) => {
    const language = className?.replace("language-", "") || "text";
    
    return (
      <div className="relative group">
        <Button
          size="sm"
          variant="ghost"
          className="absolute right-2 top-2 h-7 px-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/20"
          onClick={() => copyMessageContent(children)}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
        <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto">
          <code className={className}>{children}</code>
        </pre>
      </div>
    );
  };

  // Custom markdown components
  const MarkdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      if (!inline && match) {
        return <CodeBlock className={className}>{codeString}</CodeBlock>;
      }
      
      return <code className={className} {...props}>{children}</code>;
    }
  };

  // Parse MCQ from content
  const parseMCQ = (content: string) => {
    const mcqRegex = /\[MCQ\]([\s\S]*?)\[\/MCQ\]/;
    const match = content.match(mcqRegex);
    
    if (!match) return null;
    
    const mcqContent = match[1].trim();
    const options = mcqContent.split('\n').filter(line => line.trim());
    
    return {
      fullMatch: match[0],
      options: options.map(opt => opt.trim())
    };
  };

  // Render message content with MCQ support
  const renderMessageContent = (msg: Message, idx: number) => {
    const mcq = parseMCQ(msg.content);
    
    if (mcq && msg.role === "assistant") {
      // Split content into before MCQ, MCQ, and after MCQ
      const parts = msg.content.split(mcq.fullMatch);
      const beforeMCQ = parts[0];
      const afterMCQ = parts[1] || "";
      
      return (
        <div className="space-y-4">
          {beforeMCQ && (
            <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
              >
                {beforeMCQ}
              </ReactMarkdown>
            </div>
          )}
          
          {/* MCQ Options */}
          <div className="space-y-2">
            {mcq.options.map((option, i) => (
              <Button
                key={i}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4 bg-white/5 border-white/20 hover:bg-purple-500/20 hover:border-purple-400 text-white text-sm sm:text-base"
                onClick={() => handleMCQSelection(option)}
                disabled={isLoading || idx !== messages.length - 1}
              >
                {option}
              </Button>
            ))}
          </div>
          
          {afterMCQ && (
            <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
              >
                {afterMCQ}
              </ReactMarkdown>
            </div>
          )}
        </div>
      );
    }
    
    // Regular message rendering
    if (msg.role === "assistant") {
      return (
        <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={MarkdownComponents}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      );
    }
    
    return <p className="whitespace-pre-wrap text-sm sm:text-base">{msg.content}</p>;
  };

  const filteredAndSortedSessions = chatSessions
    .filter(session => 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "recent") {
        return b.timestamp - a.timestamp;
      } else if (sortBy === "oldest") {
        return a.timestamp - b.timestamp;
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  // Separate pinned and unpinned
  const pinnedSessions = filteredAndSortedSessions.filter(s => pinnedChats.includes(s.id));
  const unpinnedSessions = filteredAndSortedSessions.filter(s => !pinnedChats.includes(s.id));

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!session?.user) return null;

  const userName = session.user.name?.split(" ")[0] || "there";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAttachedImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains images
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;

        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image must be less than 5MB");
          continue;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setAttachedImages((prev) => [...prev, result]);
          toast.success("Image pasted successfully");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      toast.error("Please drop image files only");
      return;
    }

    imageFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAttachedImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    if (imageFiles.length > 0) {
      toast.success(`${imageFiles.length} image(s) added`);
    }
  };

  return (
    <div 
      className="flex min-h-screen bg-black text-white"
      onDragEnter={handleDragEnter}
    >
      {/* Atmospheric gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gray-500/10 blur-[120px]" />
      </div>

      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 z-50 bg-purple-500/20 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-purple-500"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center px-4">
            <Paperclip className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-purple-400" />
            <p className="text-xl sm:text-2xl font-semibold text-white">Drop images here</p>
            <p className="text-sm sm:text-base text-gray-300 mt-2">Upload images to your chat</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-20 h-screen border-r border-white/10 bg-black/95 backdrop-blur-xl transition-transform duration-300 w-[85vw] sm:w-80 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          {/* Sidebar Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Chat History</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-gray-400 hover:bg-white/10 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-white/20"
            />
          </div>

          {/* Sort Options */}
          <div className="mb-3 flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("recent")}
              className={`flex-1 text-xs ${
                sortBy === "recent" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <Calendar className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Recent</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("oldest")}
              className={`flex-1 text-xs ${
                sortBy === "oldest" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <Calendar className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Oldest</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("alphabetical")}
              className={`flex-1 text-xs ${
                sortBy === "alphabetical" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <SortAsc className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">A-Z</span>
            </Button>
          </div>

          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            className="mb-4 w-full justify-start gap-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          {/* Chat Sessions List */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {/* Pinned Chats */}
            {pinnedSessions.length > 0 && (
              <div>
                <p className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase">Pinned</p>
                <div className="space-y-2">
                  {pinnedSessions.map((chatSession) => (
                    <div
                      key={chatSession.id}
                      className={`group relative rounded-lg p-3 transition-colors ${
                        chatSession.id === currentSessionId
                          ? "bg-white/20"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {renamingSessionId === chatSession.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") finishRenaming();
                              if (e.key === "Escape") cancelRenaming();
                            }}
                            className="h-7 bg-white/10 border-white/20 text-white text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-green-500/20 hover:text-green-400"
                            onClick={finishRenaming}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-red-500/20 hover:text-red-400"
                            onClick={cancelRenaming}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSelectSession(chatSession.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm text-white">{chatSession.title}</p>
                                <p className="text-xs text-gray-500">{formatTimestamp(chatSession.timestamp)}</p>
                              </div>
                            </div>
                          </button>
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-purple-500/20 hover:text-purple-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenaming(chatSession.id);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-yellow-500/20 hover:text-yellow-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(chatSession.id);
                              }}
                            >
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-blue-500/20 hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportChat(chatSession.id);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(chatSession.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Chats */}
            {unpinnedSessions.length > 0 && (
              <div>
                {pinnedSessions.length > 0 && (
                  <p className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase">All Chats</p>
                )}
                <div className="space-y-2">
                  {unpinnedSessions.map((chatSession) => (
                    <div
                      key={chatSession.id}
                      className={`group relative rounded-lg p-3 transition-colors ${
                        chatSession.id === currentSessionId
                          ? "bg-white/20"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {renamingSessionId === chatSession.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") finishRenaming();
                              if (e.key === "Escape") cancelRenaming();
                            }}
                            className="h-7 bg-white/10 border-white/20 text-white text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-green-500/20 hover:text-green-400"
                            onClick={finishRenaming}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-red-500/20 hover:text-red-400"
                            onClick={cancelRenaming}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSelectSession(chatSession.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm text-white">{chatSession.title}</p>
                                <p className="text-xs text-gray-500">{formatTimestamp(chatSession.timestamp)}</p>
                              </div>
                            </div>
                          </button>
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-purple-500/20 hover:text-purple-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenaming(chatSession.id);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-yellow-500/20 hover:text-yellow-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(chatSession.id);
                              }}
                            >
                              <Star className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-blue-500/20 hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportChat(chatSession.id);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(chatSession.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredAndSortedSessions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? "No chats found" : "No chats yet"}
                </p>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-4 pt-4 border-t border-white/10 hidden lg:block">
            <p className="text-xs text-gray-500 text-center">
              ⌘K Search • ⌘N New • ⌘/ Sidebar
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:ml-80">
        {/* Header */}
        <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400 hover:bg-white/10 hover:text-white flex-shrink-0 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-base sm:text-xl font-semibold text-white truncate">StudySphere</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="rounded-full bg-white/10 text-white hover:bg-white/20">
                Chat
              </Button>
            </Link>
            <Link href="/archive">
              <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
                Archive
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
                Settings
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9"
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 sm:px-4 py-4 sm:py-12">
          {messages.length === 0 ? (
            <>
              {/* Version */}
              <div className="mb-6 sm:mb-8 text-center">
                <p className="text-xs sm:text-sm text-gray-500">StudySphere 3.0</p>
              </div>

              {/* Greeting */}
              <div className="mb-8 sm:mb-12 text-center px-4">
                <h2 className="mb-2 text-2xl sm:text-4xl font-normal">Good {currentTime}, {userName}!</h2>
                <p className="text-xl sm:text-3xl font-light text-gray-300">I am ready to help you</p>
              </div>
            </>
          ) : (
            <div ref={messagesContainerRef} className="mb-4 sm:mb-8 flex-1 space-y-4 sm:space-y-6 overflow-y-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 sm:gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                    </div>
                  )}
                  <div className="flex flex-col max-w-[85%] sm:max-w-[80%]">
                    {editingMessageIndex === idx ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="min-h-[100px] bg-white/5 border-white/10 text-white text-sm sm:text-base"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveEditedMessage}
                            className="bg-purple-500 hover:bg-purple-600 text-xs sm:text-sm"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Save & Regenerate</span>
                            <span className="sm:hidden">Save</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditingMessage}
                            className="hover:bg-white/10 text-xs sm:text-sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`group relative rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                            msg.role === "user"
                              ? "bg-white text-black"
                              : "bg-[#1a1a1a] text-white"
                          }`}
                        >
                          {msg.images && msg.images.length > 0 && (
                            <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
                              {msg.images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`Uploaded ${i + 1}`}
                                  className="h-24 sm:h-32 w-auto rounded-lg object-cover"
                                />
                              ))}
                            </div>
                          )}
                          {renderMessageContent(msg, idx)}
                          
                          {/* Message action buttons */}
                          <div className="absolute -bottom-8 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {msg.role === "assistant" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-white/10"
                                onClick={() => toggleRawMarkdown(idx)}
                                title={showRawMarkdown[idx] ? "Show formatted" : "Show raw symbols"}
                              >
                                {showRawMarkdown[idx] ? "📝" : "* ^ _"}
                              </Button>
                            )}
                            {msg.role === "assistant" && idx === messages.length - 1 && !isLoading && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs hover:bg-white/10"
                                  onClick={() => copyMessageContent(msg.content)}
                                >
                                  <Copy className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Copy</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs hover:bg-white/10"
                                  onClick={() => handleRegenerateResponse(idx)}
                                >
                                  <RefreshCw className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Regenerate</span>
                                </Button>
                              </>
                            )}
                            {msg.role === "assistant" && idx !== messages.length - 1 && !isLoading && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-white/10"
                                onClick={() => copyMessageContent(msg.content)}
                              >
                                <Copy className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Copy</span>
                              </Button>
                            )}
                            {msg.role === "user" && !isLoading && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-white/10"
                                onClick={() => startEditingMessage(idx)}
                              >
                                <Edit2 className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                      <span className="text-xs sm:text-sm font-semibold">{userName[0].toUpperCase()}</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 sm:gap-4">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                    <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                  </div>
                  <div className="rounded-2xl bg-[#1a1a1a] px-3 py-2 sm:px-4 sm:py-3">
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="fixed bottom-24 sm:bottom-32 right-4 sm:right-8 rounded-full bg-white text-black shadow-lg hover:bg-gray-200 h-10 w-10 sm:h-12 sm:w-12 z-10"
            >
              <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}

          {/* Input Section */}
          <div className="mt-auto">
            <form onSubmit={handleSubmit}>
              <div className="relative rounded-2xl bg-[#1a1a1a] p-3 sm:p-4">
                {/* Image preview */}
                {attachedImages.length > 0 && (
                  <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
                    {attachedImages.map((img, i) => (
                      <div key={i} className="relative">
                        <img
                          src={img}
                          alt={`Preview ${i + 1}`}
                          className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute -right-1 -top-1 sm:-right-2 sm:-top-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                          onClick={() => removeImage(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Ask a question or make a request..."
                  className="min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent text-sm sm:text-base text-white placeholder:text-gray-500 focus-visible:ring-0"
                  disabled={isLoading}
                  rows={1}
                />
                <div className="mt-2 sm:mt-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 sm:gap-3 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-400 hover:bg-white/10 hover:text-white"
                      disabled={isLoading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Attach</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-auto rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm ${
                        deepThinking
                          ? "bg-purple-500/20 text-purple-400"
                          : "text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                      disabled={isLoading}
                      onClick={() => setDeepThinking(!deepThinking)}
                    >
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Deep Thinking</span>
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white text-black hover:bg-gray-200 flex-shrink-0"
                    disabled={isLoading || (!message.trim() && attachedImages.length === 0)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
            <p className="mt-2 text-center text-[10px] sm:text-xs text-gray-500 px-2">
              <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line • Drag & drop images anywhere</span>
              <span className="sm:hidden">Press Enter to send, Shift+Enter for new line</span>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 px-3 sm:px-4 py-3 sm:py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-center sm:justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 flex-wrap">
            <Link href="#" className="hover:text-white">
              24/7 Help Chat
            </Link>
            <Link href="#" className="hover:text-white">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Paperclip, Brain, ArrowRight, Loader2, ArrowDown, X, User, Menu, Plus, MessageSquare, Trash2, ChevronLeft, Search, Download, Star, Calendar, SortAsc, Copy, RefreshCw, Edit2, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

export default function ChatPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "alphabetical">("recent");
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [showRawMarkdown, setShowRawMarkdown] = useState<{ [key: number]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Load chat sessions and pinned chats from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chatSessions");
    const savedPinned = localStorage.getItem("pinnedChats");
    
    if (savedPinned) {
      setPinnedChats(JSON.parse(savedPinned));
    }
    
    if (saved) {
      const sessions: ChatSession[] = JSON.parse(saved);
      setChatSessions(sessions);
      
      // Load the most recent session if exists
      if (sessions.length > 0 && !currentSessionId) {
        const latestSession = sessions[0];
        setCurrentSessionId(latestSession.id);
        setMessages(latestSession.messages);
      }
    } else {
      // Create initial session
      const newSession = createNewSession();
      setChatSessions([newSession]);
      setCurrentSessionId(newSession.id);
    }
  }, []);

  // Save pinned chats to localStorage
  useEffect(() => {
    if (pinnedChats.length > 0) {
      localStorage.setItem("pinnedChats", JSON.stringify(pinnedChats));
    }
  }, [pinnedChats]);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  // Update current session when messages change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setChatSessions(prev => 
        prev.map(s => {
          if (s.id === currentSessionId) {
            const newTitle = generateTitle(messages);
            // Only update if title actually changed or messages changed
            if (s.title !== newTitle || s.messages.length !== messages.length) {
              return { ...s, messages, title: newTitle, timestamp: Date.now() };
            }
          }
          return s;
        })
      );
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setCurrentTime("Morning");
    else if (hour < 18) setCurrentTime("Afternoon");
    else setCurrentTime("Evening");
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      scrollToBottom();
    }
  }, [messages]);

  // Handle scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Cmd/Ctrl + K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Cmd/Ctrl + N - New chat
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleNewChat();
        return;
      }

      // Cmd/Ctrl + / - Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
        return;
      }

      // Escape - Close sidebar or clear search
      if (e.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        }
        return;
      }

      // Arrow keys to navigate chat history (only when not typing)
      if (!isTyping && sidebarOpen) {
        const filtered = chatSessions
          .filter(session => 
            session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .sort((a, b) => {
            if (sortBy === "recent") {
              return b.timestamp - a.timestamp;
            } else if (sortBy === "oldest") {
              return a.timestamp - b.timestamp;
            } else {
              return a.title.localeCompare(b.title);
            }
          });
        
        const currentIndex = filtered.findIndex(s => s.id === currentSessionId);
        
        if (e.key === "ArrowUp" && currentIndex > 0) {
          e.preventDefault();
          handleSelectSession(filtered[currentIndex - 1].id);
        } else if (e.key === "ArrowDown" && currentIndex < filtered.length - 1) {
          e.preventDefault();
          handleSelectSession(filtered[currentIndex + 1].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [sidebarOpen, searchQuery, currentSessionId, chatSessions, sortBy]);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingSessionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const createNewSession = (): ChatSession => {
    return {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      timestamp: Date.now()
    };
  };

  const generateTitle = (msgs: Message[]): string => {
    if (msgs.length === 0) return "New Chat";
    const firstUserMsg = msgs.find(m => m.role === "user");
    if (!firstUserMsg) return "New Chat";
    // Get first line or first 40 characters, whichever is shorter
    const firstLine = firstUserMsg.content.split('\n')[0];
    const truncated = firstLine.slice(0, 40);
    return truncated + (firstLine.length > 40 ? "..." : "");
  };

  const handleNewChat = () => {
    const newSession = createNewSession();
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setMessage("");
    setAttachedImages([]);
    // Close sidebar on mobile after creating new chat
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setMessage("");
      setAttachedImages([]);
      // Close sidebar on mobile after selecting session
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      
      // If deleting current session, switch to another or create new
      if (sessionId === currentSessionId) {
        if (filtered.length > 0) {
          setCurrentSessionId(filtered[0].id);
          setMessages(filtered[0].messages);
        } else {
          const newSession = createNewSession();
          setCurrentSessionId(newSession.id);
          setMessages([]);
          return [newSession];
        }
      }
      
      return filtered;
    });
    toast.success("Chat deleted");
  };

  const togglePinChat = (sessionId: string) => {
    setPinnedChats(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
    toast.success(pinnedChats.includes(sessionId) ? "Chat unpinned" : "Chat pinned");
  };

  const exportChat = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    const content = session.messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Chat exported");
  };

  const startRenaming = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setRenamingSessionId(sessionId);
      setRenameValue(session.title);
    }
  };

  const finishRenaming = () => {
    if (renamingSessionId && renameValue.trim()) {
      setChatSessions(prev => 
        prev.map(s => 
          s.id === renamingSessionId 
            ? { ...s, title: renameValue.trim() }
            : s
        )
      );
      toast.success("Chat renamed");
    }
    setRenamingSessionId(null);
    setRenameValue("");
  };

  const cancelRenaming = () => {
    setRenamingSessionId(null);
    setRenameValue("");
  };

  const copyMessageContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const toggleRawMarkdown = (index: number) => {
    setShowRawMarkdown(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleRegenerateResponse = async (messageIndex: number) => {
    if (isLoading) return;
    
    // Find the user message before this assistant message
    const conversationUpToPoint = messages.slice(0, messageIndex);
    const lastUserMessage = [...conversationUpToPoint].reverse().find(m => m.role === "user");
    
    if (!lastUserMessage) {
      toast.error("Cannot find original question");
      return;
    }

    // Remove messages from this point forward
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);
    setIsLoading(true);
    setStreamingMessageIndex(messageIndex);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: lastUserMessage.content,
          conversationHistory: conversationUpToPoint.slice(0, -1),
          deepThinking,
          images: lastUserMessage.images,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Regenerate error:", error);
      toast.error("Failed to regenerate response");
      setMessages(messages); // Restore original messages
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const startEditingMessage = (index: number) => {
    setEditingMessageIndex(index);
    setEditedContent(messages[index].content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageIndex(null);
    setEditedContent("");
  };

  const saveEditedMessage = async () => {
    if (editingMessageIndex === null || !editedContent.trim()) return;
    
    // Update the message and regenerate from that point
    const updatedMessages = messages.slice(0, editingMessageIndex);
    const editedMessage = { ...messages[editingMessageIndex], content: editedContent.trim() };
    
    setMessages([...updatedMessages, editedMessage]);
    setEditingMessageIndex(null);
    setEditedContent("");
    setIsLoading(true);
    setStreamingMessageIndex(updatedMessages.length + 1);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: editedMessage.content,
          conversationHistory: updatedMessages,
          deepThinking,
          images: editedMessage.images,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...updatedMessages, editedMessage, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...updatedMessages, editedMessage, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Edit and regenerate error:", error);
      toast.error("Failed to regenerate response");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleMCQSelection = async (option: string) => {
    if (isLoading) return;

    setIsLoading(true);
    const userMessage = option;

    // Add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setStreamingMessageIndex(newMessages.length);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          deepThinking,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI. Please try again.");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachedImages.length === 0) || isLoading) return;

    const userMessage = message.trim();
    const images = [...attachedImages];
    setMessage("");
    setAttachedImages([]);
    setIsLoading(true);

    // Add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage, images: images.length > 0 ? images : undefined },
    ];
    setMessages(newMessages);
    setStreamingMessageIndex(newMessages.length);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          deepThinking,
          images: images.length > 0 ? images : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Add empty assistant message that will be filled progressively
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages([...newMessages, { role: "assistant", content: accumulatedText }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI. Please try again.");
    } finally {
      setIsLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Custom code block component with copy button
  const CodeBlock = ({ children, className }: { children: string; className?: string }) => {
    const language = className?.replace("language-", "") || "text";
    
    return (
      <div className="relative group">
        <Button
          size="sm"
          variant="ghost"
          className="absolute right-2 top-2 h-7 px-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/20"
          onClick={() => copyMessageContent(children)}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
        <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto">
          <code className={className}>{children}</code>
        </pre>
      </div>
    );
  };

  // Custom markdown components
  const MarkdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      if (!inline && match) {
        return <CodeBlock className={className}>{codeString}</CodeBlock>;
      }
      
      return <code className={className} {...props}>{children}</code>;
    }
  };

  // Parse MCQ from content
  const parseMCQ = (content: string) => {
    const mcqRegex = /\[MCQ\]([\s\S]*?)\[\/MCQ\]/;
    const match = content.match(mcqRegex);
    
    if (!match) return null;
    
    const mcqContent = match[1].trim();
    const options = mcqContent.split('\n').filter(line => line.trim());
    
    return {
      fullMatch: match[0],
      options: options.map(opt => opt.trim())
    };
  };

  // Render message content with MCQ support
  const renderMessageContent = (msg: Message, idx: number) => {
    const mcq = parseMCQ(msg.content);
    
    if (mcq && msg.role === "assistant") {
      // Split content into before MCQ, MCQ, and after MCQ
      const parts = msg.content.split(mcq.fullMatch);
      const beforeMCQ = parts[0];
      const afterMCQ = parts[1] || "";
      
      return (
        <div className="space-y-4">
          {beforeMCQ && (
            <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
              >
                {beforeMCQ}
              </ReactMarkdown>
            </div>
          )}
          
          {/* MCQ Options */}
          <div className="space-y-2">
            {mcq.options.map((option, i) => (
              <Button
                key={i}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4 bg-white/5 border-white/20 hover:bg-purple-500/20 hover:border-purple-400 text-white text-sm sm:text-base"
                onClick={() => handleMCQSelection(option)}
                disabled={isLoading || idx !== messages.length - 1}
              >
                {option}
              </Button>
            ))}
          </div>
          
          {afterMCQ && (
            <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
              >
                {afterMCQ}
              </ReactMarkdown>
            </div>
          )}
        </div>
      );
    }
    
    // Regular message rendering
    if (msg.role === "assistant") {
      return (
        <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-code:text-purple-300 text-sm sm:text-base">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={MarkdownComponents}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      );
    }
    
    return <p className="whitespace-pre-wrap text-sm sm:text-base">{msg.content}</p>;
  };

  const filteredAndSortedSessions = chatSessions
    .filter(session => 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "recent") {
        return b.timestamp - a.timestamp;
      } else if (sortBy === "oldest") {
        return a.timestamp - b.timestamp;
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  // Separate pinned and unpinned
  const pinnedSessions = filteredAndSortedSessions.filter(s => pinnedChats.includes(s.id));
  const unpinnedSessions = filteredAndSortedSessions.filter(s => !pinnedChats.includes(s.id));

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!session?.user) return null;

  const userName = session.user.name?.split(" ")[0] || "there";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAttachedImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains images
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;

        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image must be less than 5MB");
          continue;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setAttachedImages((prev) => [...prev, result]);
          toast.success("Image pasted successfully");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      toast.error("Please drop image files only");
      return;
    }

    imageFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAttachedImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    if (imageFiles.length > 0) {
      toast.success(`${imageFiles.length} image(s) added`);
    }
  };

  return (
    <div 
      className="flex min-h-screen bg-black text-white"
      onDragEnter={handleDragEnter}
    >
      {/* Atmospheric gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gray-500/10 blur-[120px]" />
      </div>

      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 z-50 bg-purple-500/20 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-purple-500"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center px-4">
            <Paperclip className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-purple-400" />
            <p className="text-xl sm:text-2xl font-semibold text-white">Drop images here</p>
            <p className="text-sm sm:text-base text-gray-300 mt-2">Upload images to your chat</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-20 h-screen border-r border-white/10 bg-black/95 backdrop-blur-xl transition-transform duration-300 w-[85vw] sm:w-80 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          {/* Sidebar Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Chat History</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-gray-400 hover:bg-white/10 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-white/20"
            />
          </div>

          {/* Sort Options */}
          <div className="mb-3 flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("recent")}
              className={`flex-1 text-xs ${
                sortBy === "recent" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <Calendar className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Recent</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("oldest")}
              className={`flex-1 text-xs ${
                sortBy === "oldest" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <Calendar className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Oldest</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortBy("alphabetical")}
              className={`flex-1 text-xs ${
                sortBy === "alphabetical" ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <SortAsc className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">A-Z</span>
            </Button>
          </div>

          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            className="mb-4 w-full justify-start gap-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          {/* Chat Sessions List */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {/* Pinned Chats */}
            {pinnedSessions.length > 0 && (
              <div>
                <p className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase">Pinned</p>
                <div className="space-y-2">
                  {pinnedSessions.map((chatSession) => (
                    <div
                      key={chatSession.id}
                      className={`group relative rounded-lg p-3 transition-colors ${
                        chatSession.id === currentSessionId
                          ? "bg-white/20"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {renamingSessionId === chatSession.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") finishRenaming();
                              if (e.key === "Escape") cancelRenaming();
                            }}
                            className="h-7 bg-white/10 border-white/20 text-white text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-green-500/20 hover:text-green-400"
                            onClick={finishRenaming}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-red-500/20 hover:text-red-400"
                            onClick={cancelRenaming}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSelectSession(chatSession.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm text-white">{chatSession.title}</p>
                                <p className="text-xs text-gray-500">{formatTimestamp(chatSession.timestamp)}</p>
                              </div>
                            </div>
                          </button>
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-purple-500/20 hover:text-purple-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenaming(chatSession.id);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-yellow-500/20 hover:text-yellow-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(chatSession.id);
                              }}
                            >
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-blue-500/20 hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportChat(chatSession.id);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(chatSession.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Chats */}
            {unpinnedSessions.length > 0 && (
              <div>
                {pinnedSessions.length > 0 && (
                  <p className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase">All Chats</p>
                )}
                <div className="space-y-2">
                  {unpinnedSessions.map((chatSession) => (
                    <div
                      key={chatSession.id}
                      className={`group relative rounded-lg p-3 transition-colors ${
                        chatSession.id === currentSessionId
                          ? "bg-white/20"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {renamingSessionId === chatSession.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") finishRenaming();
                              if (e.key === "Escape") cancelRenaming();
                            }}
                            className="h-7 bg-white/10 border-white/20 text-white text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-green-500/20 hover:text-green-400"
                            onClick={finishRenaming}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 flex-shrink-0 hover:bg-red-500/20 hover:text-red-400"
                            onClick={cancelRenaming}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSelectSession(chatSession.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm text-white">{chatSession.title}</p>
                                <p className="text-xs text-gray-500">{formatTimestamp(chatSession.timestamp)}</p>
                              </div>
                            </div>
                          </button>
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-purple-500/20 hover:text-purple-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenaming(chatSession.id);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-yellow-500/20 hover:text-yellow-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(chatSession.id);
                              }}
                            >
                              <Star className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-blue-500/20 hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportChat(chatSession.id);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(chatSession.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredAndSortedSessions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? "No chats found" : "No chats yet"}
                </p>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-4 pt-4 border-t border-white/10 hidden lg:block">
            <p className="text-xs text-gray-500 text-center">
              ⌘K Search • ⌘N New • ⌘/ Sidebar
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:ml-80">
        {/* Header */}
        <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400 hover:bg-white/10 hover:text-white flex-shrink-0 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-base sm:text-xl font-semibold text-white truncate">StudySphere</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="rounded-full bg-white/10 text-white hover:bg-white/20">
                Chat
              </Button>
            </Link>
            <Link href="/archive">
              <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
                Archive
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
                Settings
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9"
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 sm:px-4 py-4 sm:py-12">
          {messages.length === 0 ? (
            <>
              {/* Version */}
              <div className="mb-6 sm:mb-8 text-center">
                <p className="text-xs sm:text-sm text-gray-500">StudySphere 3.0</p>
              </div>

              {/* Greeting */}
              <div className="mb-8 sm:mb-12 text-center px-4">
                <h2 className="mb-2 text-2xl sm:text-4xl font-normal">Good {currentTime}, {userName}!</h2>
                <p className="text-xl sm:text-3xl font-light text-gray-300">I am ready to help you</p>
              </div>
            </>
          ) : (
            <div ref={messagesContainerRef} className="mb-4 sm:mb-8 flex-1 space-y-4 sm:space-y-6 overflow-y-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 sm:gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                    </div>
                  )}
                  <div className="flex flex-col max-w-[85%] sm:max-w-[80%]">
                    {editingMessageIndex === idx ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="min-h-[100px] bg-white/5 border-white/10 text-white text-sm sm:text-base"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveEditedMessage}
                            className="bg-purple-500 hover:bg-purple-600 text-xs sm:text-sm"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Save & Regenerate</span>
                            <span className="sm:hidden">Save</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditingMessage}
                            className="hover:bg-white/10 text-xs sm:text-sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`group relative rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                            msg.role === "user"
                              ? "bg-white text-black"
                              : "bg-[#1a1a1a] text-white"
                          }`}
                        >
                          {msg.images && msg.images.length > 0 && (
                            <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
                              {msg.images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`Uploaded ${i + 1}`}
                                  className="h-24 sm:h-32 w-auto rounded-lg object-cover"
                                />
                              ))}
                            </div>
                          )}
                          {renderMessageContent(msg, idx)}
                          
                          {/* Message action buttons */}
                          <div className="absolute -bottom-8 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {msg.role === "assistant" && idx === messages.length - 1 && !isLoading && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs hover:bg-white/10"
                                  onClick={() => copyMessageContent(msg.content)}
                                >
                                  <Copy className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Copy</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs hover:bg-white/10"
                                  onClick={() => handleRegenerateResponse(idx)}
                                >
                                  <RefreshCw className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Regenerate</span>
                                </Button>
                              </>
                            )}
                            {msg.role === "assistant" && idx !== messages.length - 1 && !isLoading && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-white/10"
                                onClick={() => copyMessageContent(msg.content)}
                              >
                                <Copy className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Copy</span>
                              </Button>
                            )}
                            {msg.role === "user" && !isLoading && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-white/10"
                                onClick={() => startEditingMessage(idx)}
                              >
                                <Edit2 className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                      <span className="text-xs sm:text-sm font-semibold">{userName[0].toUpperCase()}</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 sm:gap-4">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                    <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                  </div>
                  <div className="rounded-2xl bg-[#1a1a1a] px-3 py-2 sm:px-4 sm:py-3">
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="fixed bottom-24 sm:bottom-32 right-4 sm:right-8 rounded-full bg-white text-black shadow-lg hover:bg-gray-200 h-10 w-10 sm:h-12 sm:w-12 z-10"
            >
              <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}

          {/* Input Section */}
          <div className="mt-auto">
            <form onSubmit={handleSubmit}>
              <div className="relative rounded-2xl bg-[#1a1a1a] p-3 sm:p-4">
                {/* Image preview */}
                {attachedImages.length > 0 && (
                  <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
                    {attachedImages.map((img, i) => (
                      <div key={i} className="relative">
                        <img
                          src={img}
                          alt={`Preview ${i + 1}`}
                          className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute -right-1 -top-1 sm:-right-2 sm:-top-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                          onClick={() => removeImage(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Ask a question or make a request..."
                  className="min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent text-sm sm:text-base text-white placeholder:text-gray-500 focus-visible:ring-0"
                  disabled={isLoading}
                  rows={1}
                />
                <div className="mt-2 sm:mt-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 sm:gap-3 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-400 hover:bg-white/10 hover:text-white"
                      disabled={isLoading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Attach</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-auto rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm ${
                        deepThinking
                          ? "bg-purple-500/20 text-purple-400"
                          : "text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                      disabled={isLoading}
                      onClick={() => setDeepThinking(!deepThinking)}
                    >
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Deep Thinking</span>
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white text-black hover:bg-gray-200 flex-shrink-0"
                    disabled={isLoading || (!message.trim() && attachedImages.length === 0)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
            <p className="mt-2 text-center text-[10px] sm:text-xs text-gray-500 px-2">
              <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line • Drag & drop images anywhere</span>
              <span className="sm:hidden">Press Enter to send, Shift+Enter for new line</span>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 px-3 sm:px-4 py-3 sm:py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-center sm:justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 flex-wrap">
            <Link href="#" className="hover:text-white">
              24/7 Help Chat
            </Link>
            <Link href="#" className="hover:text-white">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}