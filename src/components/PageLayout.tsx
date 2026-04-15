import { Bell, User, Home, ChevronRight, Grid3x3, FileText, Clock } from "lucide-react";
import { Link } from "react-router";
import logoImage from "@/assets/logo-statistika.png";

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
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard">
              <img
                src={logoImage}
                alt="Laboratorium Statistika UII"
                className="h-12"
              />
            </Link>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-full relative">
                <Bell className="w-5 h-5 text-gray-700" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Grid3x3 className="w-5 h-5 text-gray-700" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <User className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          {sidebarItems.length > 0 && (
            <aside className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <nav className="flex flex-col">
                  {sidebarItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => onSidebarItemClick?.(item)}
                      className={`flex items-center gap-3 px-6 py-4 transition-colors text-left ${
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
          <div className="flex-1 bg-white rounded-lg shadow-sm">
            {/* Page Header */}
            {!hideHeader && (
              <div className="border-b px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {icon && (
                  <div className="bg-purple-500 p-4 rounded-lg">
                    {icon}
                  </div>
                )}
              </div>
            )}

            {/* Page Content */}
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}