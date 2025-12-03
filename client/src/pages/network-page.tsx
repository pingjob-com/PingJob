import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { resolveProfileImageUrl } from "@/lib/apiConfig";
import { useAuth } from "@/hooks/use-auth";
import { Users, MessageCircle, UserPlus, Search, Send, Mail, UserCheck, Wifi, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InvitationForm } from "@/components/invitation-form";

interface Category {
  id: number;
  name: string;
  description: string;
  userCount: number;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  summary: string;
  location: string;
  industry: string;
  profileImageUrl: string;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  createdAt: string;
}

interface Connection {
  id: number;
  status: string;
  direction?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    headline: string;
    profileImageUrl: string;
  };
  requester?: {
    id: string;
    firstName: string;
    lastName: string;
    headline: string;
    profileImageUrl: string;
  };
}

export default function NetworkPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageDialogOpen, setMessageDialogOpen] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");

  // Debug: Log component mount and user state
  useEffect(() => {
    console.log('[NetworkPage] Mounted, user:', user?.id || 'NO USER', 'enabled:', !!user);
  }, [user]);

  // Fetch categories with user counts
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories/with-user-counts"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories/with-user-counts');
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  // Fetch users with search support
  const { data: categoryUsers = [], isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/users/network", selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory.toString());
      if (searchTerm) params.append('search', searchTerm);

      const url = `/api/users/network?${params.toString()}`;
      console.log(`[Network Query] Fetching from: ${url}`);
      
      const response = await apiRequest('GET', url);
      const data = await response.json();
      console.log(`[Network Query] Got response:`, data);
      return data;
    },
    enabled: !!user,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  // Log errors
  useEffect(() => {
    if (usersError) {
      console.error('[Network Error]', usersError);
    }
  }, [usersError]);

  // Fetch connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/connections');
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  // Fetch connection requests
  const { data: connectionRequests = [], isLoading: requestsLoading } = useQuery<Connection[]>({
    queryKey: ["/api/connection-requests"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/connection-requests');
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  // Send connection request mutation
  const sendConnectionMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      const res = await apiRequest("POST", "/api/connections", { receiverId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection request sent",
        description: "Your connection request has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/network"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send connection request.",
        variant: "destructive",
      });
    },
  });

  // Accept/reject connection request mutation
  const updateConnectionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/connections/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection updated",
        description: "Connection request has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update connection.",
        variant: "destructive",
      });
    },
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const res = await apiRequest("DELETE", `/api/connections/${connectionId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection removed",
        description: "The connection has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to remove connection.",
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      const res = await apiRequest("POST", "/api/messages", { receiverId, content });
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Message sent",
        description: "Opening your chat...",
      });
      setMessageContent("");
      setMessageDialogOpen(null);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${variables.receiverId}`] });
      // Navigate to messaging page with the conversation open
      setTimeout(() => {
        navigate(`/messaging?conversation=${variables.receiverId}`);
      }, 300);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send message.",
        variant: "destructive",
      });
    },
  });

  // Get connection status for a user
  const getConnectionStatus = (userId: string) => {
    const existingConnection = connections.find(conn => conn.user.id === userId);
    
    if (!existingConnection) return 'none';
    
    if (existingConnection.status === 'accepted') return 'connected';
    if (existingConnection.direction === 'sent' && existingConnection.status === 'pending') return 'sent';
    if (existingConnection.direction === 'received' && existingConnection.status === 'pending') return 'received';
    
    return existingConnection.status;
  };

  const handleSendConnection = (userId: string) => {
    sendConnectionMutation.mutate(userId);
  };

  const handleUpdateConnection = (id: number, status: string) => {
    updateConnectionMutation.mutate({ id, status });
  };

  const handleDeleteConnection = (connectionId: number) => {
    deleteConnectionMutation.mutate(connectionId);
  };

  const handleSendMessage = (receiverId: string) => {
    if (!messageContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message.",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate({ receiverId, content: messageContent });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Please sign in to access networking features</h2>
            <p className="text-muted-foreground">Connect with professionals in your field and expand your network.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Professional Network</h1>
            <p className="text-muted-foreground">Connect with professionals in your field and expand your network</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Wifi className="h-4 w-4" />
            <span>Live updates</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="discover" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="discover" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Connections ({connections.filter(conn => conn.status === 'accepted').length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Requests ({connectionRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Sent ({connections.filter(conn => conn.direction === 'sent' && conn.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="invite" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invite
          </TabsTrigger>
        </TabsList>

        {/* DISCOVER TAB - SCROLLABLE LAYOUT */}
        <TabsContent value="discover" className="space-y-0 m-0 p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 240px)' }}>
            {/* Categories Sidebar - Scrollable */}
            <div className="lg:col-span-1 min-h-0">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0 pb-2 px-4 py-3">
                  <CardTitle className="text-base sm:text-lg">Professional Categories</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-2 px-4 py-0 min-h-0">
                  {categoriesLoading ? (
                    <div className="text-center py-4 text-sm">Loading categories...</div>
                  ) : (
                    <>
                      <div
                        className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-colors text-sm sm:text-base flex-shrink-0 ${
                          selectedCategory === null
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                        onClick={() => setSelectedCategory(null)}
                      >
                        <span className="font-medium">All Professionals</span>
                      </div>
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-colors text-sm sm:text-base flex-shrink-0 ${
                            selectedCategory === category.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80"
                          }`}
                          onClick={() => setSelectedCategory(category.id)}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-medium truncate">{category.name}</span>
                            <Badge variant="secondary" className="text-xs flex-shrink-0">{category.userCount}</Badge>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Users List - Scrollable */}
            <div className="lg:col-span-2 min-h-0">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0 pb-2 px-4 py-3">
                  <CardTitle className="text-base sm:text-lg">
                    {selectedCategory ? 'Professionals in Selected Category' : 'All Professionals'}
                    {categoryUsers.length > 0 && ` (${categoryUsers.length})`}
                  </CardTitle>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      placeholder="Search by name, headline..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto px-4 py-0 min-h-0">
                  {usersLoading ? (
                    <div className="text-center py-8 text-sm">Loading professionals...</div>
                  ) : categoryUsers.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {searchTerm ? 'No professionals found matching your search.' : 'No professionals found.'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categoryUsers.map((categoryUser) => {
                        const status = getConnectionStatus(categoryUser.id);
                        return (
                          <div key={categoryUser.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-lg text-sm">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={resolveProfileImageUrl(categoryUser.profileImageUrl)} />
                              <AvatarFallback>
                                {categoryUser.firstName?.[0]}{categoryUser.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">
                                {categoryUser.firstName} {categoryUser.lastName}
                              </h3>
                              <p className="text-xs text-muted-foreground truncate">{categoryUser.headline}</p>
                              <p className="text-xs text-muted-foreground truncate">{categoryUser.location}</p>
                              {categoryUser.category?.name && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {categoryUser.category.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end w-full sm:w-auto">
                              {status !== 'connected' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSendConnection(categoryUser.id)}
                                  disabled={sendConnectionMutation.isPending || status !== 'none'}
                                  variant={status === 'sent' ? 'outline' : 'default'}
                                  className="text-xs"
                                >
                                  {status === 'sent' ? (
                                    <>
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      <span className="hidden sm:inline">Sent</span>
                                    </>
                                  ) : status === 'received' ? (
                                    <>
                                      <UserPlus className="h-3 w-3 mr-1" />
                                      <span className="hidden sm:inline">Pending</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="h-3 w-3 mr-1" />
                                      <span className="hidden sm:inline">Connect</span>
                                    </>
                                  )}
                                </Button>
                              )}
                              {status === 'connected' && (
                                <Badge variant="default" className="text-xs">Connected</Badge>
                              )}
                              <Dialog open={messageDialogOpen === categoryUser.id} onOpenChange={(open) => {
                                if (!open) {
                                  setMessageDialogOpen(null);
                                  setMessageContent("");
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setMessageDialogOpen(categoryUser.id)}
                                    className="text-xs"
                                  >
                                    <MessageCircle className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Message</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="w-[95vw] sm:w-full">
                                  <DialogHeader>
                                    <DialogTitle className="text-sm sm:text-base">
                                      Send Message to {categoryUser.firstName} {categoryUser.lastName}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {status === 'none' && (
                                      <p className="text-xs sm:text-sm text-gray-600 p-2 bg-blue-50 dark:bg-blue-900 rounded">
                                        💡 Tip: Consider opening with "Hi! I'd like to connect with you." to start a conversation.
                                      </p>
                                    )}
                                    <Textarea
                                      placeholder="Type your message..."
                                      value={messageContent}
                                      onChange={(e) => setMessageContent(e.target.value)}
                                      rows={3}
                                      className="text-sm"
                                    />
                                    <Button
                                      onClick={() => handleSendMessage(categoryUser.id)}
                                      disabled={sendMessageMutation.isPending || !messageContent.trim()}
                                      className="w-full text-sm"
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Send Message
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* CONNECTIONS TAB */}
        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <CardTitle>Your Connections</CardTitle>
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (
                <div className="text-center py-8">Loading connections...</div>
              ) : connections.filter(conn => conn.status === 'accepted').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No connections yet. Start by discovering professionals in your field!
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.filter(conn => conn.status === 'accepted').map((connection) => (
                    <div key={connection.user.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={resolveProfileImageUrl(connection.user.profileImageUrl)} />
                        <AvatarFallback>
                          {connection.user.firstName?.[0]}{connection.user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {connection.user.firstName} {connection.user.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">{connection.user.headline}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Connected</Badge>
                        <Dialog open={messageDialogOpen === connection.user.id} onOpenChange={(open) => {
                          if (!open) {
                            setMessageDialogOpen(null);
                            setMessageContent("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setMessageDialogOpen(connection.user.id)}>
                              <MessageCircle className="h-4 w-4 mr-1" />
                              Message
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Send Message to {connection.user.firstName} {connection.user.lastName}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Type your message..."
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                                rows={4}
                              />
                              <Button
                                onClick={() => handleSendMessage(connection.user.id)}
                                disabled={sendMessageMutation.isPending || !messageContent.trim()}
                                className="w-full"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Send Message
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteConnection(connection.id)}
                          disabled={deleteConnectionMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REQUESTS TAB */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Connection Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="text-center py-8">Loading requests...</div>
              ) : connectionRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending connection requests
                </div>
              ) : (
                <div className="space-y-4">
                  {connectionRequests.map((request) => (
                    <div key={request.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={resolveProfileImageUrl(request.requester?.profileImageUrl)} />
                        <AvatarFallback>
                          {request.requester?.firstName?.[0]}{request.requester?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {request.requester?.firstName} {request.requester?.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">{request.requester?.headline}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateConnection(request.id, "accepted")}
                          disabled={updateConnectionMutation.isPending}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateConnection(request.id, "declined")}
                          disabled={updateConnectionMutation.isPending}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SENT TAB */}
        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>Sent Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (
                <div className="text-center py-8">Loading requests...</div>
              ) : connections.filter(conn => conn.direction === 'sent' && conn.status === 'pending').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sent connection requests yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.filter(conn => conn.direction === 'sent' && conn.status === 'pending').map((request) => (
                    <div key={request.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={resolveProfileImageUrl(request.user?.profileImageUrl)} />
                        <AvatarFallback>
                          {request.user?.firstName?.[0]}{request.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {request.user?.firstName} {request.user?.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">{request.user?.headline}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Pending</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteConnection(request.id)}
                          disabled={deleteConnectionMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVITE TAB */}
        <TabsContent value="invite" className="space-y-6">
          <div className="max-w-2xl mx-auto">
            <InvitationForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
