import { User, Home, ChevronRight, LogOut } from "lucide-react";
import { Link } from "react-router";
import logoImage from "@/assets/logo-statistika.png";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface PageLayoutProps {
  title: string;
  breadcrumbs: { label: string; path?: string }[];
  children: React.ReactNode;
  icon?: React.ReactNode;
  sidebarItems?: string[];
  onSidebarItemClick?: (item: string) => void;
  activeItem?: string;
  hideHeader?: boolean;
}

export function PageLayout({ title, breadcrumbs, children, icon, sidebarItems = [], onSidebarItemClick, activeItem, hideHeader = false }: PageLayoutProps) {
  const { user, loading, logout } = useAuth();

  const userLabel = loading
    ? "Memuat..."
    : user?.displayName || user?.email || user?.uid || "Tamu";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex-shrink-0 min-w-0">
              <img
                src={logoImage}
                alt="Laboratorium Statistika UII"
                className="h-9 md:h-12 w-auto max-w-full"
              />
            </Link>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <User className="w-5 h-5 text-gray-700" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{userLabel}</DropdownMenuLabel>
                  {user?.email && user.email !== userLabel && (
                    <div className="px-2 pb-1 text-xs text-gray-500 truncate">{user.email}</div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void logout()}>
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-gray-400" />
                {crumb.path ? (
                  <Link to={crumb.path} className="text-blue-600 hover:text-blue-800">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-700">{crumb.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Left Sidebar — stacks above content on mobile */}
          {sidebarItems.length > 0 && (
            <aside className="w-full md:w-64 md:flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <nav className="flex flex-col">
                  {sidebarItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => onSidebarItemClick?.(item)}
                      className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 transition-colors text-left ${
                        activeItem === item
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      } ${
                        index < sidebarItems.length - 1 ? 'border-b' : ''
                      }`}
                    >
                      <span className="font-medium">{item}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0 bg-white rounded-lg shadow-sm">
            {/* Page Header */}
            {!hideHeader && (
              <div className="border-b px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
                <h1 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h1>
                {icon && (
                  <div className="bg-purple-500 p-3 md:p-4 rounded-lg flex-shrink-0">
                    {icon}
                  </div>
                )}
              </div>
            )}

            {/* Page Content */}
            <div className="p-4 md:p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}