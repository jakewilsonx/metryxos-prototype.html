import {
  AccountsIcon,
  CoachIcon,
  DashboardIcon,
  PlaybookIcon,
  ReportsIcon,
  SequencesIcon,
  TeamIcon,
  TodayIcon,
} from "@/components/ui/icons";
import type { NavEntry } from "@/components/shell/NavList";

// Rendered icon elements, not component references — NavList/MobileNav are
// Client Components, and a bare function (component type) can't cross the
// server/client boundary as a prop, only an already-rendered element can.
export const repNav: NavEntry[] = [
  { href: "/today", label: "Today", icon: <TodayIcon /> },
  { href: "/accounts", label: "My Accounts", icon: <AccountsIcon /> },
  { href: "/sequences", label: "Sequences", icon: <SequencesIcon /> },
  { href: "/coach", label: "Coach", icon: <CoachIcon /> },
];

export const managerNav: NavEntry[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/playbook", label: "Playbook", icon: <PlaybookIcon /> },
  { href: "/accounts", label: "Accounts", icon: <AccountsIcon /> },
  { href: "/team", label: "Team", icon: <TeamIcon /> },
  { href: "/reports", label: "Reports", icon: <ReportsIcon /> },
];
