import { Mail, Fingerprint, Users, Notebook, GraduationCap, Building, FileText, Wallet, Laptop, DoorOpen, FileCheck, Clock, UserCheck, Shield, ClipboardCheck, CreditCard, Package, ShoppingBag, Receipt, CheckCircle, Settings, Wrench, History } from 'lucide-react';
import { Link } from 'react-router';

interface DashboardCardProps {
  title: string;
  description: string;
  bgColor: string;
  icon: string;
  link?: string;
}

export function DashboardCard({ title, description, bgColor, icon, link }: DashboardCardProps) {
  const getIcon = () => {
    // Return empty div for blank icons
    if (!icon) {
      return null;
    }
    
    const iconProps = { className: "w-16 h-16 text-white", strokeWidth: 1.5 };
    
    switch (icon) {
      case 'mail':
        return (
          <div className="relative">
            <Mail {...iconProps} />
            <div className="absolute top-3 left-3 text-sm font-bold text-white">
              SURAT
            </div>
          </div>
        );
      case 'fingerprint':
        return <Fingerprint {...iconProps} />;
      case 'family':
        return (
          <div className="flex gap-1">
            <Users {...iconProps} className="w-14 h-14 text-white" />
          </div>
        );
      case 'users':
        return (
          <div className="relative">
            <Users {...iconProps} />
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                +
              </div>
            </div>
          </div>
        );
      case 'notebook':
        return <Notebook {...iconProps} />;
      case 'scholarship':
        return <GraduationCap {...iconProps} />;
      case 'mosque':
        return <Building {...iconProps} />;
      case 'survey':
        return (
          <div className="relative flex items-center gap-2">
            <FileText className="w-12 h-12 text-white" />
            <Users className="w-8 h-8 text-white" />
          </div>
        );
      case 'wallet':
        return <Wallet {...iconProps} />;
      case 'laptop':
        return <Laptop {...iconProps} />;
      case 'dooropen':
        return <DoorOpen {...iconProps} />;
      case 'filecheck':
        return <FileCheck {...iconProps} />;
      case 'clock':
        return <Clock {...iconProps} />;
      case 'usercheck':
        return <UserCheck {...iconProps} />;
      case 'shield':
        return <Shield {...iconProps} />;
      case 'clipboardcheck':
        return <ClipboardCheck {...iconProps} />;
      case 'creditcard':
        return <CreditCard {...iconProps} />;
      case 'package':
        return <Package {...iconProps} />;
      case 'shoppingbag':
        return <ShoppingBag {...iconProps} />;
      case 'receipt':
        return <Receipt {...iconProps} />;
      case 'checkcircle':
        return <CheckCircle {...iconProps} />;
      case 'settings':
        return <Settings {...iconProps} />;
      case 'wrench':
        return <Wrench {...iconProps} />;
      case 'history':
        return <History {...iconProps} />;
      default:
        return <FileText {...iconProps} />;
    }
  };

  const cardContent = (
    <>
      <div className={`${bgColor} w-36 h-36 rounded-xl flex items-center justify-center mb-3 shadow-md`}>
        {getIcon()}
      </div>
      <h3 className="text-sm mb-1 text-gray-900 font-bold">
        {title}
      </h3>
      <p className="text-xs text-gray-600 max-w-[180px]">{description}</p>
    </>
  );

  if (link) {
    return (
      <Link to={link} className="flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-transform">
        {cardContent}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-transform">
      {cardContent}
    </div>
  );
}