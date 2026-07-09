import { useLocation, Link } from "wouter";
import { Dumbbell, Utensils, MessageCircle, Target, Bell, User } from "lucide-react";

const tabs = [
  { label: "Treino", icon: Dumbbell, path: "/dashboard" },
  { label: "Alimentação", icon: Utensils, path: "/nutrition" },
  { label: "IA Trainer", icon: MessageCircle, path: "/trainer" },
  { label: "Lembretes", icon: Bell, path: "/reminders" },
  { label: "Perfil", icon: User, path: "/profile" },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="bottom-nav">
      {tabs.map(({ label, icon: Icon, path }) => {
        const isActive = location === path || (path === "/dashboard" && location === "/");
        return (
          <Link key={path} href={path} className={`bottom-nav-item ${isActive ? "active" : ""}`}>
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
