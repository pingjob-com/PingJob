import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Loader2, Trash2, MoreVertical, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getQueryFn } from "@/lib/queryClient";
import { resolveProfileImageUrl, resolveLogoUrl } from "@/lib/apiConfig";

export default function Messaging() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Get conversation ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get('conversation');
    if (conversationId) {
      setSelectedUserId(conversationId);
    }
  }, []);

  const queryFn = getQueryFn({ on401: "throw" });

  // Fetch conversations
  const conversationsQuery = useQuery({
    queryKey: ['/api/conversations'],
    queryFn,
    enabled: !!user?.id,
    refetchInterval: 1500,
    staleTime: 0,
  });

  const conversations = (conversationsQuery.data || []) as any[];

  // Fetch messages for selected user
  const messagesQuery = useQuery({
    queryKey: ['/api/messages', selectedUserId],
    queryFn,
    enabled: !!selectedUserId && !!user?.id,
    refetchInterval: 1500,
    staleTime: 0,
  });

  // Fetch connections
  const connectionsQuery = useQuery({
    queryKey: ['/api/connections'],
    queryFn,
    enabled: !!user?.id,
    staleTime: 0,
  });

  const messages = (messagesQuery.data || []) as any[];
  const connections = (connectionsQuery.data || []) as any[];

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  // Find selected conversation and user
  const selectedConversation = conversations.find((c: any) => c.otherUser?.id === selectedUserId);
  const selectedUser = selectedConversation?.otherUser;

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedUserId || !content.trim()) return;
      const res = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: selectedUserId, content: content.trim() })
      });
      if (!res.ok) throw new Error('Failed to send');
      return res.json();
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  });

  const startMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, content: "Hi! I'd like to connect." })
      });
      if (!res.ok) throw new Error('Failed to send');
      return res.json();
    },
    onSuccess: (_, receiverId) => {
      setShowNewDialog(false);
      setSelectedUserId(receiverId);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({ title: "Success", description: "Message sent!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to send message.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) return;
      const res = await fetch(`/api/conversations/${selectedUserId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      setSelectedUserId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({ title: "Success", description: "Conversation deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  });

  const filteredConversations = conversations.filter((c: any) =>
    ((c.otherUser?.firstName || '') + ' ' + (c.otherUser?.lastName || ''))
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const existingUserIds = conversations.map((c: any) => c.otherUser?.id);
  const availableConnections = connections.filter((c: any) => !existingUserIds.includes(c.user?.id));

  return (
    <div className="fixed inset-0 top-16 bg-white dark:bg-gray-950 flex overflow-hidden">
      {/* Left Sidebar - Conversations List */}
      <div className={`
        absolute lg:relative z-40 lg:z-auto
        w-full sm:w-80 lg:w-72
        h-full bg-white dark:bg-gray-950
        border-r dark:border-gray-800
        flex flex-col
        transition-all duration-300
        ${sidebarOpen ? 'left-0' : 'left-full'}
        lg:left-0
      `}>
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search */}
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        {/* New Conversation Button */}
        <div className="px-4 py-3 border-b dark:border-gray-800">
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button className="w-full" size="sm">
                <MessageCircle className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableConnections.length === 0 ? (
                  <p className="text-sm text-center text-gray-500">No available connections</p>
                ) : (
                  availableConnections.map((conn: any) => (
                    <div
                      key={conn.user?.id}
                      className="p-3 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={resolveProfileImageUrl(conn.user?.profileImageUrl)} />
                          <AvatarFallback>
                            {conn.user?.firstName?.charAt(0)}{conn.user?.lastName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {conn.user?.firstName} {conn.user?.lastName}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => startMutation.mutate(conn.user?.id || '')}
                        disabled={startMutation.isPending}
                      >
                        {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversationsQuery.isLoading && (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {filteredConversations.length === 0 && !conversationsQuery.isLoading && (
            <div className="flex flex-col items-center justify-center h-20 text-center text-gray-500 text-sm p-4">
              <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
              No messages yet
            </div>
          )}
          {filteredConversations.map((conv: any) => (
            <button
              key={conv.otherUser?.id}
              onClick={() => {
                setSelectedUserId(conv.otherUser?.id || '');
                setSidebarOpen(false);
              }}
              className={`w-full text-left p-4 border-b dark:border-gray-800 transition-colors ${
                selectedUserId === conv.otherUser?.id
                  ? 'bg-blue-50 dark:bg-blue-950'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-900'
              }`}
              data-testid={`conversation-${conv.otherUser?.id}`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={resolveProfileImageUrl(conv.otherUser?.profileImageUrl)} />
                  <AvatarFallback>
                    {conv.otherUser?.firstName?.charAt(0)}{conv.otherUser?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {conv.otherUser?.firstName} {conv.otherUser?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{conv.lastMessage || 'No messages'}</p>
                </div>
                {(conv.unreadCount || 0) > 0 && (
                  <Badge variant="default" className="flex-shrink-0">
                    {conv.unreadCount}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b dark:border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
                <Avatar>
                  <AvatarImage src={resolveProfileImageUrl(selectedUser.profileImageUrl)} />
                  <AvatarFallback>
                    {selectedUser.firstName?.charAt(0)}{selectedUser.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{selectedUser.headline || 'No headline'}</p>
                </div>
              </div>

              {/* Header Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={e => e.preventDefault()}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
              {messagesQuery.isLoading && (
                <div className="flex justify-center items-center h-20">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
              {messages.length === 0 && !messagesQuery.isLoading && (
                <div className="flex justify-center items-center flex-1 text-gray-500 text-sm">
                  No messages yet. Start the conversation!
                </div>
              )}
              {messages.map((msg: any, idx: number) => (
                <div key={msg.id || idx} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl text-sm break-words ${
                      msg.senderId === user?.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.senderId === user?.id ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                      {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="h-20 border-t dark:border-gray-800 p-4 flex-shrink-0 bg-white dark:bg-gray-950">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMutation.mutate(messageInput);
                }}
                className="flex gap-2 h-full"
              >
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sendMutation.isPending}
                  className="flex-1"
                  data-testid="message-input"
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || sendMutation.isPending}
                  size="icon"
                  className="flex-shrink-0"
                  data-testid="send-message-button"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-semibold">Select a conversation</p>
            <p className="text-sm">Choose from your messages to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
