import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
const logoPath = 'https://cdn.pingjob.com/logo.png';
import { resolveProfileImageUrl } from "@/lib/apiConfig";
import {
  Home,
  Users,
  Briefcase,
  MessageCircle,
  Building,
  Bell,
  Settings,
  LogOut,
  User,
  BarChart3,
  FileText,
  TrendingUp
} from "lucide-react";

export default function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Fetch notification count
  const { data: notificationCountData = { unreadCount: 0 } } = useQuery({
    queryKey: ['/api/notifications/count'],
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch full notifications list when opened
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user?.id && notificationsOpen,
  });

  // Simplified admin check - only real admins get admin-level access  
  const isRealAdmin = user?.email === 'krupas@vedsoft.com' || user?.email === 'krupashankar@gmail.com';
  // Paid users get traffic analytics but not admin dashboard
  const hasPaidAccess = user?.userType === 'recruiter' || user?.userType === 'client';

  const navigationItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Network", href: "/network", icon: Users },
    { name: "Jobs", href: "/jobs", icon: Briefcase },
    { name: "Applications", href: "/applications", icon: FileText },
    { name: "Messaging", href: "/messaging", icon: MessageCircle },
    { name: "Companies", href: "/companies", icon: Building },
    // Traffic page only for admins
    ...(isRealAdmin ? [{ name: "Traffic", href: "/traffic", icon: TrendingUp }] : []),
    // Admin dashboard - only for real admins
    ...(isRealAdmin ? [{ name: "Admin", href: "/dashboard", icon: BarChart3 }] : []),
  ];
  

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4 md:space-x-8">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center">
              <img 
                src={logoPath} 
                alt="PingJob" 
                className="h-8 w-auto hover:opacity-90 transition-opacity"
              />
            </Link>

            {/* Navigation Items */}
            <div className="hidden md:block">
              <div className="flex items-center space-x-6">
                {navigationItems.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <div className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer ${
                      isActive(item.href)
                        ? "text-linkedin-blue"
                        : "text-gray-600 hover:text-linkedin-blue"
                    }`}>
                      <item.icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{item.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Search and User Actions */}
          <div className="flex items-center space-x-4 ml-16">
            {/* Notifications */}
            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative hidden md:flex">
                  <Bell className="h-5 w-5 text-gray-600 hover:text-linkedin-blue" data-testid="button-notifications" />
                  {notificationCountData?.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center" data-testid="badge-notification-count">
                      {notificationCountData.unreadCount > 9 ? '9+' : notificationCountData.unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <div className="p-3 border-b">
                  <p className="font-semibold text-sm">Notifications</p>
                </div>
                {notifications && Array.isArray(notifications) && notifications.length > 0 ? (
                  <div className="divide-y">
                    {notifications.map((notif: any) => (
                      <div 
                        key={notif.id} 
                        className={`p-3 hover:bg-gray-50 cursor-pointer text-sm ${!notif.isRead ? 'bg-blue-50' : ''}`}
                        data-testid={`notification-item-${notif.id}`}
                      >
                        <p className="font-medium">{notif.title}</p>
                        <p className="text-gray-600 text-xs mt-1">{notif.message}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No notifications yet
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={resolveProfileImageUrl(user?.profileImageUrl)} />
                    <AvatarFallback className="bg-linkedin-blue text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user?.id}`} className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    View Profile
                  </Link>
                </DropdownMenuItem>
                {user?.userType !== 'job_seeker' && (
                  <DropdownMenuItem asChild>
                    <Link href="/company/create" className="cursor-pointer">
                      <Building className="h-4 w-4 mr-2" />
                      Create Company
                    </Link>
                  </DropdownMenuItem>
                )}
                {user?.userType === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link href="/manual-assignments" className="cursor-pointer">
                      <Users className="h-4 w-4 mr-2" />
                      Manual Assignments
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  className="cursor-pointer text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        {/* Mobile Search Bar */}
        <div className="px-4 py-3 bg-gray-50">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Input
                type="text"
                placeholder={location.includes('/companies') ? "Search companies..." : "Search jobs, companies..."}
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
              />
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            </div>
          </form>
        </div>
        
        {/* Mobile Navigation Icons */}
        <div className="flex justify-around py-2">
          {navigationItems.filter((item, index) => 
            index < 4 || item.name === 'Traffic' || item.name === 'Dashboard'
          ).map((item) => (
            <Link key={item.name} href={item.href}>
              <div className={`flex flex-col items-center space-y-1 px-2 py-2 transition-colors duration-200 ${
                isActive(item.href)
                  ? "text-linkedin-blue"
                  : "text-gray-600"
              }`}>
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
